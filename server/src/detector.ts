// Detecta eventos comparando o estado anterior e o atual de um jogo.
// Função pura: não faz rede nem banco, para ser fácil de testar.
// O texto das notificações é montado depois, no idioma de cada aparelho (messages.ts).
import type { AlertType, Game, Play } from '@league-alert/shared';
import { parseClock } from './espn';

export const CLUTCH_SECONDS = 5 * 60; // últimos 5 minutos
export const CLUTCH_MARGIN = 5; // diferença máxima de pontos

export interface DetectedEvent {
  key: string; // único por evento, usado para não enviar duas vezes
  type: AlertType;
  gameId: string;
  period?: number; // período que começou (inícios de período)
  playText?: string; // texto do lance (ejeção)
  clock?: string; // relógio no momento do evento, quando não é o do placar atual
  teamId?: string; // time da corrida de pontos / que virou o jogo
  points?: number; // tamanho da corrida
  player?: string; // jogador do marco (ex.: "C. Coward")
  milestone?: '40' | '50' | 'triple_double';
}

export function periodLength(period: number): number {
  return period <= 4 ? 12 * 60 : 5 * 60;
}

/**
 * Até qual período a bola já subiu.
 * "Em andamento" com o relógio ainda cheio (12:00) não conta: a ESPN às vezes muda o status
 * antes do lance inicial, e o relógio rodando é o que confirma que o jogo voltou.
 */
export function startedPeriod(g: Game): number {
  switch (g.status) {
    case 'scheduled':
    case 'postponed':
      return 0;
    case 'live':
      return g.clockSeconds < periodLength(g.period) ? g.period : g.period - 1;
    default:
      return g.period;
  }
}

function isClutch(g: Game): boolean {
  return (
    g.status === 'live' &&
    g.period === 4 &&
    g.clockSeconds <= CLUTCH_SECONDS &&
    Math.abs(g.home.score - g.away.score) <= CLUTCH_MARGIN
  );
}

/**
 * @param prev estado anterior (undefined na primeira vez que o jogo é visto: não gera eventos,
 *             só serve de base, para não avisar coisas que já aconteceram)
 * @param curr estado atual
 * @param newPlays lances que ainda não tinham sido vistos
 */
export function detectEvents(prev: Game | undefined, curr: Game, newPlays: Play[] = []): DetectedEvent[] {
  if (!prev) return [];
  const events: DetectedEvent[] = [];
  const add = (type: AlertType, extra: string, more: Partial<DetectedEvent> = {}) =>
    events.push({ key: `${curr.id}:${type}:${extra}`, type, gameId: curr.id, ...more });

  // Início de período. Se pulou mais de um (servidor ficou parado), avisa só o mais recente.
  const before = startedPeriod(prev);
  const now = startedPeriod(curr);
  if (now > before && curr.status !== 'final') {
    const type: AlertType =
      now === 1 ? 'game_start' : now === 3 ? 'halftime_end' : now === 2 || now === 4 ? 'quarter_start' : 'overtime_start';
    add(type, String(now), { period: now });
  }

  if (isClutch(curr) && !isClutch(prev)) add('clutch', String(curr.period), { period: curr.period });

  for (const p of newPlays) {
    if (/ejected/i.test(p.text)) add('ejection', p.id, { playText: p.text });
  }

  if (curr.status === 'final' && prev.status !== 'final') add('game_end', 'final');

  return events;
}

// ---------- volta de tempo técnico ----------

/** Pedido de tempo que ainda não acabou. */
export interface PendingTimeout {
  playId: string;
  period: number;
  clockSeconds: number;
}

/** "Full Timeout", "Short Timeout"... (desafio de técnico não é pedido de tempo). */
export function isTimeout(p: Play): boolean {
  return /timeout/i.test(p.kind ?? '') && !/challenge/i.test(p.kind ?? '');
}

/** Lances que acontecem com a bola parada: não indicam que o jogo voltou. */
function isDeadBall(p: Play): boolean {
  return isTimeout(p) || /substitution|challenge|replay|review|timeout/i.test(p.kind ?? '');
}

/**
 * O jogo voltou de um pedido de tempo quando aparece o primeiro lance de bola em jogo
 * (arremesso, falta, lance livre...) ou quando o relógio volta a correr.
 * Se o período acabar antes, não avisa: o aviso de início de período cobre esse caso.
 *
 * @param pending pedido de tempo em aberto, vindo da rodada anterior
 * @param newPlays lances novos, do mais antigo para o mais recente
 */
export function detectTimeoutEnd(
  pending: PendingTimeout | null,
  curr: Game,
  newPlays: Play[],
): { pending: PendingTimeout | null; event: DetectedEvent | null } {
  let event: DetectedEvent | null = null;
  const resume = (t: PendingTimeout) => {
    event = { key: `${curr.id}:timeout_end:${t.playId}`, type: 'timeout_end', gameId: curr.id, period: t.period };
  };

  for (const p of newPlays) {
    if (isTimeout(p)) {
      pending = { playId: p.id, period: p.period, clockSeconds: parseClock(p.clock) };
    } else if (pending && !isDeadBall(p)) {
      if (p.period === pending.period) resume(pending);
      pending = null;
    }
  }

  if (pending) {
    if (curr.period !== pending.period || curr.status === 'final') {
      pending = null; // o período acabou com o tempo em aberto
    } else if (curr.status === 'live' && curr.clockSeconds < pending.clockSeconds) {
      resume(pending); // o relógio voltou a correr
      pending = null;
    }
  }

  return { pending, event };
}
