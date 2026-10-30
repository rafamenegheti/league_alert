// Detecta eventos comparando o estado anterior e o atual de um jogo.
// Função pura: não faz rede nem banco, para ser fácil de testar.
// O texto das notificações é montado depois, no idioma de cada aparelho (messages.ts).
import type { AlertType, Game, Play } from '@league-alert/shared';

export const CLUTCH_SECONDS = 5 * 60; // últimos 5 minutos
export const CLUTCH_MARGIN = 5; // diferença máxima de pontos

export interface DetectedEvent {
  key: string; // único por evento, usado para não enviar duas vezes
  type: AlertType;
  gameId: string;
  period?: number; // período que começou (inícios de período)
  playText?: string; // texto do lance (ejeção)
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
