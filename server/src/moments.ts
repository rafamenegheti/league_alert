// Detectores dos "momentos" do jogo: lembrete antes do jogo, aviso antes do fim do intervalo,
// virada no fim, corrida de pontos e marcos de jogador. Funções puras, como em detector.ts.
import type { Game, Play, PlayerLine } from '@league-alert/shared';
import type { DetectedEvent } from './detector';

export const GAME_SOON_MS = 15 * 60_000; // lembrete 15 min antes do jogo
export const HALFTIME_MS = 15 * 60_000; // o intervalo da NBA dura 15 min
export const HALFTIME_LEAD_MS = 2 * 60_000; // avisa 2 min antes de acabar
export const LEAD_CHANGE_SECONDS = 2 * 60; // virada/empate só nos últimos 2 min
export const RUN_POINTS = 10; // corrida: 10 pontos seguidos sem resposta

const ev = (g: Game, type: DetectedEvent['type'], extra: string, more: Partial<DetectedEvent> = {}): DetectedEvent => ({
  key: `${g.id}:${type}:${extra}`,
  type,
  gameId: g.id,
  ...more,
});

// ---------- lembrete antes do jogo ----------

export function detectGameSoon(g: Game, now: number): DetectedEvent | null {
  const left = Date.parse(g.startTime) - now;
  return g.status === 'scheduled' && left > 0 && left <= GAME_SOON_MS ? ev(g, 'game_soon', 'soon') : null;
}

// ---------- intervalo acabando ----------

/**
 * @param since quando o intervalo começou (o servidor anota ao ver o jogo entrar no intervalo)
 * @param afterMs depois de quanto tempo de intervalo avisar
 */
export function detectHalftimeSoon(
  g: Game,
  since: number | undefined,
  now: number,
  afterMs = HALFTIME_MS - HALFTIME_LEAD_MS,
): DetectedEvent | null {
  return g.status === 'halftime' && since !== undefined && now - since >= afterMs ? ev(g, 'halftime_soon', 'soon') : null;
}

// ---------- virada ou empate no fim ----------

const leader = (g: Game) => Math.sign(g.home.score - g.away.score); // 1 mandante, -1 visitante, 0 empate

/** Virada ou empate nos últimos 2 minutos do 4º quarto ou de prorrogação (inclui cesta no estouro do relógio). */
export function detectLeadChange(prev: Game | undefined, g: Game): DetectedEvent | null {
  if (!prev || g.period < 4 || prev.period !== g.period) return null;
  if (!['live', 'end_period', 'final'].includes(g.status) || prev.status !== 'live') return null;
  if (g.clockSeconds > LEAD_CHANGE_SECONDS) return null;
  const before = leader(prev);
  const now = leader(g);
  if (before === now) return null;
  const teamId = now === 1 ? g.home.id : now === -1 ? g.away.id : undefined;
  return ev(g, 'lead_change', `${g.period}:${g.away.score}-${g.home.score}`, { teamId, period: g.period });
}

// ---------- corrida de pontos ----------

export interface RunState {
  lastHome: number;
  lastAway: number;
  side: 'home' | 'away' | null;
  points: number;
  startPlayId: string | null;
  notified: boolean;
}

/**
 * Pontos seguidos de um time sem o outro pontuar. Avisa uma vez por corrida, ao chegar em 10.
 * @param state undefined na primeira vez: só anota o placar atual
 * @param newPlays lances novos, do mais antigo para o mais recente
 */
export function detectRun(
  state: RunState | undefined,
  g: Game,
  newPlays: Play[],
): { state: RunState; event: DetectedEvent | null } {
  if (!state) {
    return {
      state: { lastHome: g.home.score, lastAway: g.away.score, side: null, points: 0, startPlayId: null, notified: false },
      event: null,
    };
  }
  let s = { ...state };
  let event: DetectedEvent | null = null;
  for (const p of newPlays) {
    const dh = p.homeScore - s.lastHome;
    const da = p.awayScore - s.lastAway;
    if (dh === 0 && da === 0) continue;
    if (dh < 0 || da < 0 || (dh > 0 && da > 0)) {
      // Placar corrigido pela arbitragem: recomeça a contagem.
      s = { lastHome: p.homeScore, lastAway: p.awayScore, side: null, points: 0, startPlayId: null, notified: false };
      continue;
    }
    const side = dh > 0 ? 'home' : 'away';
    const pts = dh + da;
    if (s.side === side) s.points += pts;
    else s = { ...s, side, points: pts, startPlayId: p.id, notified: false };
    s.lastHome = p.homeScore;
    s.lastAway = p.awayScore;
    if (!s.notified && s.points >= RUN_POINTS) {
      s.notified = true;
      const team = side === 'home' ? g.home : g.away;
      event = ev(g, 'scoring_run', s.startPlayId ?? p.id, {
        teamId: team.id,
        points: s.points,
        period: p.period,
        clock: p.clock,
      });
    }
  }
  return { state: s, event };
}

// ---------- marcos de jogador ----------

const doubleDigits = (p: PlayerLine) => [p.pts, p.reb, p.ast, p.stl, p.blk].filter((v) => v >= 10).length;

/** 40 pontos, 50 pontos e triplo-duplo. Na primeira vez (prev undefined) só anota, não avisa. */
export function detectMilestones(prev: PlayerLine[] | undefined, curr: PlayerLine[], g: Game): DetectedEvent[] {
  if (!prev) return [];
  const before = new Map(prev.map((p) => [p.id, p]));
  const events: DetectedEvent[] = [];
  for (const p of curr) {
    const b = before.get(p.id);
    if (!b) continue;
    const more = { player: p.shortName, teamId: p.teamId };
    for (const n of [40, 50] as const) {
      if (b.pts < n && p.pts >= n) events.push(ev(g, 'milestone', `${p.id}:${n}`, { ...more, milestone: `${n}` }));
    }
    if (doubleDigits(b) < 3 && doubleDigits(p) >= 3) {
      events.push(ev(g, 'milestone', `${p.id}:td`, { ...more, milestone: 'triple_double' }));
    }
  }
  return events;
}
