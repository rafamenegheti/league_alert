// Guarda o estado dos jogos, acompanha os jogos ao vivo e dispara as notificações.
import type { Game, GameDetail, Lang, Play, PlayerLine, Team } from '@league-alert/shared';
import { BrSchedule } from './brSchedule';
import type { Db, DeviceRow } from './db';
import { detectEvents, detectTimeoutEnd, type DetectedEvent, type PendingTimeout } from './detector';
import { currentGameDay, fetchScoreboard, fetchSummary, fetchTeams } from './espn';
import { buildMessage } from './messages';
import {
  detectGameSoon,
  detectHalftimeSoon,
  detectLeadChange,
  detectMilestones,
  detectRun,
  type RunState,
} from './moments';
import type { Notifier } from './notifier';

const LIVE_STATUSES = new Set(['live', 'halftime', 'end_period']);
const FAST_POLL_MS = 10_000;
const SLOW_POLL_MS = 60_000;
const CACHE_MS = 15_000;
const MAX_PLAYS = 60;
/** No jogo simulado o intervalo dura segundos, então o aviso "intervalo acabando" sai logo. */
const SIM_HALFTIME_ALERT_MS = 2_000;

interface Cached<T> {
  value: T;
  at: number;
}

export class GameService {
  private scoreboards = new Map<string, Cached<Game[]>>();
  private details = new Map<string, Cached<GameDetail>>();
  // Estado de cada jogo entre uma rodada e outra:
  private prev = new Map<string, Game>();
  private seenPlays = new Map<string, Set<string>>();
  private timeouts = new Map<string, PendingTimeout | null>();
  private runs = new Map<string, RunState>();
  private playerLines = new Map<string, PlayerLine[]>();
  private halftimeSince = new Map<string, number>();
  private teams: Cached<Team[]> | null = null;
  /** Jogos falsos do modo simulação, que aparecem junto com os de hoje. */
  readonly simulated = new Map<string, GameDetail>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private db: Db,
    private notifier: Notifier,
    private br = new BrSchedule(),
  ) {}

  /** Acrescenta onde o jogo passa no Brasil. */
  private withBr = (g: Game): Game => ({ ...g, br: this.br.lookup(g) });

  // ---------- leitura (usada pela API) ----------

  async getGames(date = currentGameDay()): Promise<Game[]> {
    const cached = this.scoreboards.get(date);
    let games = cached && Date.now() - cached.at < CACHE_MS ? cached.value : null;
    if (!games) {
      games = await fetchScoreboard(date);
      this.scoreboards.set(date, { value: games, at: Date.now() });
    }
    const sims = date === currentGameDay() ? [...this.simulated.values()].map((d) => d.game) : [];
    return [...sims, ...games].map(this.withBr).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async getDetail(id: string): Promise<GameDetail> {
    const sim = this.simulated.get(id);
    if (sim) return { ...sim, game: this.withBr(sim.game) };
    const cached = this.details.get(id);
    if (cached && Date.now() - cached.at < CACHE_MS) return { ...cached.value, game: this.withBr(cached.value.game) };
    const { game, plays, players } = await fetchSummary(id);
    // O resumo não traz as transmissões; aproveita as do placar do dia, se já estiver em cache.
    const fromBoard = [...this.scoreboards.values()].flatMap((c) => c.value).find((g) => g.id === id);
    const detail = { game: { ...game, broadcasts: fromBoard?.broadcasts ?? game.broadcasts }, plays: plays.slice(0, MAX_PLAYS), players };
    this.details.set(id, { value: detail, at: Date.now() });
    return { ...detail, game: this.withBr(detail.game) };
  }

  async getTeams(): Promise<Team[]> {
    if (!this.teams || Date.now() - this.teams.at > 24 * 3600_000) {
      this.teams = { value: await fetchTeams(), at: Date.now() };
    }
    return this.teams.value;
  }

  // ---------- acompanhamento ----------

  start(): void {
    const loop = async () => {
      let next = SLOW_POLL_MS;
      try {
        next = await this.tick();
      } catch (e) {
        console.error('[poller] erro:', (e as Error).message);
      }
      this.timer = setTimeout(loop, next);
    };
    loop();
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  /** Uma rodada: busca o placar do dia, processa cada jogo e diz quando rodar de novo. */
  async tick(): Promise<number> {
    const date = currentGameDay();
    const games = await fetchScoreboard(date);
    this.scoreboards.set(date, { value: games, at: Date.now() });

    let active = false;
    for (const game of games) {
      const wasLive = LIVE_STATUSES.has(this.prev.get(game.id)?.status ?? '');
      const isLive = LIVE_STATUSES.has(game.status);
      if (isLive) active = true;
      // Começa em breve (ou já passou do horário e ainda não começou)?
      if (game.status === 'scheduled' && Date.parse(game.startTime) - Date.now() < 20 * 60_000) active = true;

      let plays: Play[] | undefined;
      let players: PlayerLine[] | undefined;
      if (isLive || wasLive) {
        try {
          const summary = await fetchSummary(game.id);
          plays = summary.plays;
          players = summary.players;
          this.details.set(game.id, { value: { game, plays: plays.slice(0, MAX_PLAYS), players }, at: Date.now() });
        } catch (e) {
          console.error(`[poller] summary ${game.id}:`, (e as Error).message);
        }
      }
      await this.process(game, plays, players);
    }
    return active ? FAST_POLL_MS : SLOW_POLL_MS;
  }

  /** Compara com o estado anterior, detecta eventos e envia. Usado também pela simulação. */
  async process(rawGame: Game, plays?: Play[], players?: PlayerLine[], now = Date.now()): Promise<DetectedEvent[]> {
    const game = this.withBr(rawGame);
    const id = game.id;
    const prev = this.prev.get(id);
    const newPlays = plays ? this.takeNewPlays(id, plays) : [];
    const chrono = [...newPlays].reverse(); // os lances chegam do mais recente para o mais antigo

    const events = detectEvents(prev, game, newPlays);
    const push = (e: DetectedEvent | null) => e && events.push(e);

    push(detectGameSoon(game, now));
    push(detectLeadChange(prev, game));

    // Intervalo: anota quando começou para avisar 2 min antes de acabar.
    if (game.status === 'halftime') {
      if (prev && prev.status !== 'halftime' && !this.halftimeSince.has(id)) this.halftimeSince.set(id, now);
    } else {
      this.halftimeSince.delete(id);
    }
    push(detectHalftimeSoon(game, this.halftimeSince.get(id), now, game.simulated ? SIM_HALFTIME_ALERT_MS : undefined));

    const timeout = detectTimeoutEnd(this.timeouts.get(id) ?? null, game, chrono);
    this.timeouts.set(id, timeout.pending);
    push(timeout.event);

    if (plays) {
      const run = detectRun(this.runs.get(id), game, chrono);
      this.runs.set(id, run.state);
      push(run.event);
    }

    if (players) {
      events.push(...detectMilestones(this.playerLines.get(id), players, game));
      this.playerLines.set(id, players);
    }

    this.prev.set(id, game);
    for (const ev of events) await this.dispatch(ev, game);
    return events;
  }

  private takeNewPlays(gameId: string, plays: Play[]): Play[] {
    const seen = this.seenPlays.get(gameId);
    if (!seen) {
      // Primeira vez: só marca como visto, não avisa lances antigos.
      this.seenPlays.set(gameId, new Set(plays.map((p) => p.id)));
      return [];
    }
    const fresh = plays.filter((p) => !seen.has(p.id));
    for (const p of fresh) seen.add(p.id);
    return fresh;
  }

  private async dispatch(ev: DetectedEvent, game: Game): Promise<void> {
    if (!this.db.markSent(ev.key)) return;
    const devices = this.db.recipients(game.id, [game.home.id, game.away.id], ev.type);
    console.log(`[evento] ${ev.key} → ${devices.length} aparelho(s)`);

    // Um envio por combinação de idioma, modo sem spoiler e atraso do stream.
    const groups = groupBy(devices, (d) => `${d.lang}|${d.region}|${d.settings.hideScores}|${d.settings.delaySeconds}`);
    for (const group of groups.values()) {
      const { lang, region, settings } = group[0];
      const send = () =>
        this.notifier.send(group, {
          ...buildMessage(ev, game, lang, { hideScores: settings.hideScores, region }),
          data: { gameId: game.id, alertType: ev.type },
        });
      // Com atraso, o texto continua com o placar do momento do evento (o que o stream vai mostrar).
      if (settings.delaySeconds > 0) setTimeout(send, settings.delaySeconds * 1000);
      else await send();
    }
  }
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

export function groupByLang(devices: DeviceRow[]): Map<Lang, DeviceRow[]> {
  return groupBy(devices, (d) => d.lang) as Map<Lang, DeviceRow[]>;
}
