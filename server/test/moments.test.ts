import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Game, Play, PlayerLine } from '@league-alert/shared';
import { parseSummary } from '../src/espn';
import {
  detectGameSoon,
  detectHalftimeSoon,
  detectLeadChange,
  detectMilestones,
  detectRun,
} from '../src/moments';

const team = (id: string, score: number) => ({
  id, abbr: id, name: id, shortName: id, logo: '', color: '000', score, linescores: [],
});

function game(over: Omit<Partial<Game>, 'away' | 'home'> & { away?: number; home?: number } = {}): Game {
  const { away = 0, home = 0, ...rest } = over;
  return {
    id: 'g1', startTime: '2026-10-30T02:00:00Z', status: 'live', period: 4, clock: '1:30', clockSeconds: 90,
    home: team('BOS', home), away: team('LAL', away), broadcasts: [], ...rest,
  };
}

describe('lembrete antes do jogo', () => {
  const start = Date.parse('2026-10-30T02:00:00Z');
  const scheduled = game({ status: 'scheduled', period: 0 });
  it('avisa nos 15 minutos antes', () => {
    expect(detectGameSoon(scheduled, start - 10 * 60_000)?.key).toBe('g1:game_soon:soon');
  });
  it('não avisa cedo demais nem depois de começar', () => {
    expect(detectGameSoon(scheduled, start - 30 * 60_000)).toBeNull();
    expect(detectGameSoon(scheduled, start + 60_000)).toBeNull();
    expect(detectGameSoon(game({ status: 'live' }), start - 60_000)).toBeNull();
  });
});

describe('intervalo acabando', () => {
  const half = game({ status: 'halftime', period: 2 });
  it('avisa 13 min depois do início do intervalo', () => {
    expect(detectHalftimeSoon(half, 0, 12 * 60_000)).toBeNull();
    expect(detectHalftimeSoon(half, 0, 13 * 60_000)?.type).toBe('halftime_soon');
  });
  it('sem horário de início (servidor ligou no meio do intervalo), não avisa', () => {
    expect(detectHalftimeSoon(half, undefined, 20 * 60_000)).toBeNull();
  });
});

describe('virada ou empate no fim', () => {
  it('avisa virada nos últimos 2 minutos do 4º quarto', () => {
    const e = detectLeadChange(game({ away: 100, home: 99, clockSeconds: 100 }), game({ away: 100, home: 101, clockSeconds: 80 }));
    expect(e?.type).toBe('lead_change');
    expect(e?.teamId).toBe('BOS');
  });
  it('avisa empate', () => {
    const e = detectLeadChange(game({ away: 100, home: 98 }), game({ away: 100, home: 100 }));
    expect(e?.teamId).toBeUndefined();
  });
  it('cesta no estouro do relógio (jogo já final) também conta', () => {
    const e = detectLeadChange(game({ away: 100, home: 99, clockSeconds: 2 }), game({ status: 'final', away: 100, home: 102, clockSeconds: 0 }));
    expect(e?.teamId).toBe('BOS');
  });
  it('não avisa antes dos 2 minutos finais nem antes do 4º quarto', () => {
    expect(detectLeadChange(game({ away: 50, home: 49, clockSeconds: 300 }), game({ away: 50, home: 52, clockSeconds: 280 }))).toBeNull();
    expect(detectLeadChange(game({ period: 3, away: 50, home: 49 }), game({ period: 3, away: 50, home: 52 }))).toBeNull();
  });
});

describe('corrida de pontos', () => {
  const play = (id: string, away: number, home: number): Play => ({
    id, text: '', period: 2, clock: '5:00', awayScore: away, homeScore: home, scoring: true,
  });
  it('avisa ao chegar em 10-0, uma vez só', () => {
    let r = detectRun(undefined, game({ away: 20, home: 20 }), []);
    r = detectRun(r.state, game(), [play('a', 20, 23), play('b', 20, 25), play('c', 20, 28)]);
    expect(r.event).toBeNull();
    r = detectRun(r.state, game(), [play('d', 20, 30)]);
    expect(r.event?.points).toBe(10);
    expect(r.event?.teamId).toBe('BOS');
    expect(r.event?.key).toBe('g1:scoring_run:a');
    r = detectRun(r.state, game(), [play('e', 20, 33)]);
    expect(r.event).toBeNull();
  });
  it('a corrida zera quando o outro time pontua', () => {
    let r = detectRun(undefined, game({ away: 20, home: 20 }), []);
    r = detectRun(r.state, game(), [play('a', 20, 28), play('b', 22, 28), play('c', 22, 30)]);
    expect(r.event).toBeNull();
    expect(r.state.points).toBe(2);
  });
});

describe('marcos de jogador', () => {
  const line = (over: Partial<PlayerLine>): PlayerLine => ({
    id: 'p1', name: 'Player One', shortName: 'P. One', teamId: 'LAL', starter: true, played: true,
    min: 30, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fg: '', threes: '', ft: '', ...over,
  });
  it('40 e 50 pontos', () => {
    const evs = detectMilestones([line({ pts: 38 })], [line({ pts: 41 })], game());
    expect(evs.map((e) => e.key)).toEqual(['g1:milestone:p1:40']);
    expect(detectMilestones([line({ pts: 39 })], [line({ pts: 51 })], game()).map((e) => e.milestone)).toEqual(['40', '50']);
  });
  it('triplo-duplo', () => {
    const evs = detectMilestones([line({ pts: 20, reb: 10, ast: 9 })], [line({ pts: 20, reb: 10, ast: 10 })], game());
    expect(evs[0].milestone).toBe('triple_double');
    expect(evs[0].player).toBe('P. One');
  });
  it('primeira vez só anota', () => {
    expect(detectMilestones(undefined, [line({ pts: 45 })], game())).toEqual([]);
  });
});

describe('box score da ESPN', () => {
  it('lê os jogadores dos dois times', () => {
    const data = JSON.parse(readFileSync(new URL('./fixtures/summary-live.json', import.meta.url), 'utf8'));
    const { game: g, players } = parseSummary(data);
    expect(players.length).toBeGreaterThan(10);
    expect(new Set(players.map((p) => p.teamId))).toEqual(new Set([g.home.id, g.away.id]));
    const top = [...players].sort((a, b) => b.pts - a.pts)[0];
    expect(top.pts).toBeGreaterThan(5);
    expect(top.fg).toMatch(/^\d+-\d+$/);
  });
});
