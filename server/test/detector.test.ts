import { describe, expect, it } from 'vitest';
import type { Game, Play } from '@league-alert/shared';
import { detectEvents, startedPeriod } from '../src/detector';

const team = (abbr: string, score: number) => ({
  id: abbr, abbr, name: abbr, shortName: abbr, logo: '', color: '000', score, linescores: [],
});

function game(partial: Partial<Game> & { homeScore?: number; awayScore?: number } = {}): Game {
  const { homeScore = 0, awayScore = 0, ...rest } = partial;
  return {
    id: 'g1',
    startTime: '2026-10-30T00:00Z',
    status: 'scheduled',
    period: 0,
    clock: '0.0',
    clockSeconds: 0,
    home: team('BOS', homeScore),
    away: team('LAL', awayScore),
    broadcasts: [],
    ...rest,
  };
}

const live = (period: number, clockSeconds: number, extra: Partial<Game> & { homeScore?: number; awayScore?: number } = {}) =>
  game({ status: 'live', period, clockSeconds, clock: String(clockSeconds), ...extra });

const types = (evs: ReturnType<typeof detectEvents>) => evs.map((e) => e.type);

describe('startedPeriod', () => {
  it('não conta o período enquanto o relógio está cheio', () => {
    expect(startedPeriod(live(3, 720))).toBe(2);
    expect(startedPeriod(live(3, 715))).toBe(3);
    expect(startedPeriod(game({ status: 'halftime', period: 2 }))).toBe(2);
    expect(startedPeriod(game())).toBe(0);
  });
});

describe('detectEvents', () => {
  it('primeira vez que vê o jogo não gera eventos', () => {
    expect(detectEvents(undefined, live(3, 600))).toEqual([]);
  });

  it('início do jogo só quando o relógio roda', () => {
    expect(detectEvents(game(), live(1, 720))).toEqual([]);
    expect(types(detectEvents(live(1, 720), live(1, 700)))).toEqual(['game_start']);
  });

  it('volta do intervalo', () => {
    const half = game({ status: 'halftime', period: 2 });
    expect(detectEvents(half, live(3, 720))).toEqual([]); // status mudou mas relógio parado
    const evs = detectEvents(live(3, 720), live(3, 705, { homeScore: 54, awayScore: 51 }));
    expect(types(evs)).toEqual(['halftime_end']);
    expect(evs[0].key).toBe('g1:halftime_end:3');
    expect(evs[0].period).toBe(3);
  });

  it('volta entre quartos (2º e 4º)', () => {
    expect(types(detectEvents(game({ status: 'end_period', period: 1 }), live(2, 690)))).toEqual(['quarter_start']);
    expect(types(detectEvents(game({ status: 'end_period', period: 3 }), live(4, 700)))).toEqual(['quarter_start']);
  });

  it('prorrogação', () => {
    const evs = detectEvents(game({ status: 'end_period', period: 4 }), live(5, 290));
    expect(types(evs)).toEqual(['overtime_start']);
    expect(evs[0].period).toBe(5);
  });

  it('se pulou vários períodos, avisa só o mais recente', () => {
    expect(types(detectEvents(live(1, 300), live(3, 600)))).toEqual(['halftime_end']);
  });

  it('clutch time: entra uma vez, não repete enquanto continua', () => {
    const a = live(4, 310, { homeScore: 100, awayScore: 98 });
    const b = live(4, 295, { homeScore: 100, awayScore: 98 });
    const c = live(4, 280, { homeScore: 102, awayScore: 98 });
    expect(types(detectEvents(a, b))).toEqual(['clutch']);
    expect(detectEvents(b, c)).toEqual([]);
  });

  it('sem clutch se a diferença é grande', () => {
    expect(detectEvents(live(4, 310, { homeScore: 110 }), live(4, 290, { homeScore: 110 }))).toEqual([]);
  });

  it('ejeção pelos lances novos', () => {
    const play: Play = {
      id: 'p9', text: 'Draymond Green ejected', period: 2, clock: '3:00', homeScore: 0, awayScore: 0, scoring: false,
    };
    const evs = detectEvents(live(2, 200), live(2, 190), [play]);
    expect(types(evs)).toEqual(['ejection']);
    expect(evs[0].key).toBe('g1:ejection:p9');
  });

  it('fim de jogo', () => {
    const evs = detectEvents(live(4, 1), game({ status: 'final', period: 4, homeScore: 110, awayScore: 100 }));
    expect(types(evs)).toEqual(['game_end']);
  });

  it('fim de jogo não gera "início de período"', () => {
    expect(types(detectEvents(game({ status: 'halftime', period: 2 }), game({ status: 'final', period: 4 })))).toEqual(['game_end']);
  });
});
