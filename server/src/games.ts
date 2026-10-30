// Guarda o estado dos jogos, acompanha os jogos ao vivo e dispara as notificações.
import type { Game, GameDetail, Lang, Play, Team } from '@league-alert/shared';
import type { Db, DeviceRow } from './db';
import { detectEvents, type DetectedEvent } from './detector';
import { currentGameDay, fetchScoreboard, fetchSummary, fetchTeams } from './espn';
import { buildMessage } from './messages';
import type { Notifier } from './notifier';

const LIVE_STATUSES = new Set(['live', 'halftime', 'end_period']);
const FAST_POLL_MS = 10_000;
const SLOW_POLL_MS = 60_000;
const CACHE_MS = 15_000;

interface Cached<T> {
  value: T;
  at: number;
}

export class GameService {
  private scoreboards = new Map<string, Cached<Game[]>>();
  private details = new Map<string, Cached<GameDetail>>();
  private prev = new Map<string, Game>();
  private seenPlays = new Map<string, Set<string>>();
  private teams: Cached<Team[]> | null = null;
  /** Jogos falsos do modo simulação, que aparecem junto com os de hoje. */
  readonly simulated = new Map<string, GameDetail>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private db: Db,
    private notifier: Notifier,
  ) {}

  // ---------- leitura (usada pela API) ----------

  async getGames(date = currentGameDay()): Promise<Game[]> {
    const cached = this.scoreboards.get(date);
    let games = cached && Date.now() - cached.at < CACHE_MS ? cached.value : null;
    if (!games) {
      games = await fetchScoreboard(date);
      this.scoreboards.set(date, { value: games, at: Date.now() });
    }
    const sims = date === currentGameDay() ? [...this.simulated.values()].map((d) => d.game) : [];
    return [...sims, ...games].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async getDetail(id: string): Promise<GameDetail> {
    const sim = this.simulated.get(id);
    if (sim) return sim;
    const cached = this.details.get(id);
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
    const { game, plays } = await fetchSummary(id);
    const detail = { game, plays: plays.slice(0, 60) };
    this.details.set(id, { value: detail, at: Date.now() });
    return detail;
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
      if (isLive || wasLive) {
        try {
          const detail = await fetchSummary(game.id);
          plays = detail.plays;
          this.details.set(game.id, { value: { game, plays: plays.slice(0, 60) }, at: Date.now() });
        } catch (e) {
          console.error(`[poller] summary ${game.id}:`, (e as Error).message);
        }
      }
      await this.process(game, plays);
    }
    return active ? FAST_POLL_MS : SLOW_POLL_MS;
  }

  /** Compara com o estado anterior, detecta eventos e envia. Usado também pela simulação. */
  async process(game: Game, plays?: Play[]): Promise<DetectedEvent[]> {
    const newPlays = plays ? this.takeNewPlays(game.id, plays) : [];
    const events = detectEvents(this.prev.get(game.id), game, newPlays);
    this.prev.set(game.id, game);
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
    // Um envio por idioma, cada um com o texto montado naquele idioma.
    for (const [lang, group] of groupByLang(devices)) {
      await this.notifier.send(group, {
        ...buildMessage(ev, game, lang),
        data: { gameId: game.id, alertType: ev.type },
      });
    }
  }
}

export function groupByLang(devices: DeviceRow[]): Map<Lang, DeviceRow[]> {
  const groups = new Map<Lang, DeviceRow[]>();
  for (const d of devices) groups.set(d.lang, [...(groups.get(d.lang) ?? []), d]);
  return groups;
}
