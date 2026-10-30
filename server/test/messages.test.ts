import { describe, expect, it } from 'vitest';
import type { Game } from '@league-alert/shared';
import type { DetectedEvent } from '../src/detector';
import { buildMessage, testMessage } from '../src/messages';

const team = (abbr: string, score: number) => ({
  id: abbr, abbr, name: abbr, shortName: abbr, logo: '', color: '000', score, linescores: [],
});

const g = (period: number, away: number, home: number, clock = '11:45'): Game => ({
  id: 'g1', startTime: '', status: 'live', period, clock, clockSeconds: 705,
  home: team('BOS', home), away: team('LAL', away), broadcasts: [],
});

const ev = (type: DetectedEvent['type'], more: Partial<DetectedEvent> = {}): DetectedEvent => ({
  key: 'k', type, gameId: 'g1', ...more,
});

describe('mensagens em português', () => {
  it('volta do intervalo', () => {
    expect(buildMessage(ev('halftime_end', { period: 3 }), g(3, 51, 54), 'pt')).toEqual({
      title: '🏀 LAL 51 x 54 BOS',
      body: 'Fim do intervalo: o 3º quarto começou!',
    });
  });

  it('quartos, prorrogação, clutch, ejeção e fim', () => {
    expect(buildMessage(ev('quarter_start', { period: 2 }), g(2, 30, 25), 'pt').body).toBe('O 2º quarto começou!');
    expect(buildMessage(ev('overtime_start', { period: 5 }), g(5, 110, 108), 'pt').body).toBe('Prorrogação começou!');
    expect(buildMessage(ev('overtime_start', { period: 6 }), g(6, 120, 118), 'pt').body).toBe('2ª prorrogação começou!');
    expect(buildMessage(ev('clutch'), g(4, 100, 97, '4:48'), 'pt')).toEqual({
      title: '🔥 LAL 100 x 97 BOS',
      body: 'Clutch time! 4:48 no 4º quarto.',
    });
    expect(buildMessage(ev('ejection', { playText: 'X ejected' }), g(2, 0, 0), 'pt').title).toBe('🟥 Ejeção em LAL x BOS');
    expect(buildMessage(ev('game_end'), { ...g(5, 118, 115), status: 'final' }, 'pt').body).toBe('Fim de jogo (OT).');
  });
});

describe('mensagens em inglês', () => {
  it('volta do intervalo', () => {
    expect(buildMessage(ev('halftime_end', { period: 3 }), g(3, 51, 54), 'en')).toEqual({
      title: '🏀 LAL 51 – 54 BOS',
      body: 'Halftime is over: the 3rd quarter has started!',
    });
  });

  it('quartos, prorrogação, clutch, ejeção e fim', () => {
    expect(buildMessage(ev('game_start', { period: 1 }), g(1, 0, 2), 'en').body).toBe('Tip-off! The game has started.');
    expect(buildMessage(ev('quarter_start', { period: 4 }), g(4, 86, 80), 'en').body).toBe('The 4th quarter has started!');
    expect(buildMessage(ev('overtime_start', { period: 5 }), g(5, 110, 108), 'en').body).toBe('Overtime has started!');
    expect(buildMessage(ev('clutch'), g(4, 100, 97, '4:48'), 'en').body).toBe('Clutch time! 4:48 left in the 4th quarter.');
    expect(buildMessage(ev('ejection', { playText: 'X ejected' }), g(2, 0, 0), 'en').title).toBe('🟥 Ejection: LAL @ BOS');
    expect(buildMessage(ev('game_end'), { ...g(4, 100, 110), status: 'final' }, 'en').body).toBe('Final.');
  });

  it('teste', () => {
    expect(testMessage('en').body).toBe('Test notification: everything is working!');
  });
});
