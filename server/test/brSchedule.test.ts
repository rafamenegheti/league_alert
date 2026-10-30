import { describe, expect, it } from 'vitest';
import type { Game } from '@league-alert/shared';
import { findBroadcast, parseDate, parseGrade, suggestChannel, teamKey } from '../src/brSchedule';
import { buildMessage } from '../src/messages';

const team = (abbr: string) => ({ id: abbr, abbr, name: abbr, shortName: abbr, logo: '', color: '000', score: 0, linescores: [] });
const game = (away: string, home: string, startTime: string, broadcasts: string[] = []): Game => ({
  id: 'g1', startTime, status: 'scheduled', period: 0, clock: '', clockSeconds: 0,
  home: team(home), away: team(away), broadcasts,
});

describe('times', () => {
  it('aceita siglas da ESPN, variações e apelidos', () => {
    expect(teamKey('LAL')).toBe('LAL');
    expect(teamKey('gsw')).toBe('GS');
    expect(teamKey('NYK')).toBe('NY');
    expect(teamKey('Lakers')).toBe('LAL');
    expect(teamKey('trail blazers')).toBe('POR');
    expect(teamKey('76ers')).toBe('PHI');
    expect(teamKey('Corinthians')).toBeNull();
  });
});

describe('datas', () => {
  it('aceita AAAA-MM-DD, DD/MM/AAAA e DD/MM', () => {
    expect(parseDate('2026-10-31')).toBe('2026-10-31');
    expect(parseDate('31/10/2026')).toBe('2026-10-31');
    expect(parseDate('1/11', new Date('2026-10-30T12:00:00Z'))).toBe('2026-11-01');
    expect(parseDate('31-10')).toBeNull();
  });
});

describe('arquivo grade-br.csv', () => {
  const text = `# comentário
data,visitante,mandante,canal

2026-10-31,LAL,BOS,Prime Video
01/11/2026,Warriors,Nuggets,ESPN 2 / Disney+
2026-11-02,LAL,XYZ,ESPN
2026-11-02,LAL
`;
  const { entries, warnings } = parseGrade(text);

  it('lê as linhas válidas e ignora comentários e cabeçalho', () => {
    expect(entries.map((e) => [e.date, e.teams, e.channel])).toEqual([
      ['2026-10-31', ['BOS', 'LAL'], 'Prime Video'],
      ['2026-11-01', ['DEN', 'GS'], 'ESPN 2 / Disney+'],
    ]);
  });

  it('avisa o que não entendeu, com o número da linha', () => {
    expect(warnings).toEqual([
      'linha 6: time "XYZ" não reconhecido',
      'linha 7: esperado "data,visitante,mandante,canal" → "2026-11-02,LAL"',
    ]);
  });

  it('acha o jogo pela data dos EUA ou do Brasil, em qualquer ordem dos times', () => {
    // Times em ordem trocada na grade
    const swapped = game('BOS', 'LAL', '2026-10-31T23:30:00Z');
    expect(findBroadcast(entries, swapped)).toEqual({ channel: 'Prime Video', source: 'grade' });
    // 22:30 em Nova York (9/11) = 00:30 de 10/11 em São Paulo: as duas datas valem
    const late = game('LAL', 'BOS', '2026-11-10T03:30:00Z');
    expect(findBroadcast(parseGrade('2026-11-09,LAL,BOS,Prime Video').entries, late).source).toBe('grade');
    expect(findBroadcast(parseGrade('2026-11-10,LAL,BOS,Prime Video').entries, late).source).toBe('grade');
    expect(findBroadcast(parseGrade('2026-11-11,LAL,BOS,Prime Video').entries, late).source).toBe('league_pass');
  });

  it('sem linha na grade: palpite pela TV dos EUA, senão League Pass', () => {
    expect(findBroadcast([], game('MIN', 'MIA', '2026-10-21T23:30:00Z', ['ESPN']))).toEqual({
      channel: 'ESPN/Disney+',
      source: 'suggested',
    });
    expect(findBroadcast([], game('NY', 'BOS', '2026-10-23T23:30:00Z', ['Prime Video'])).channel).toBe('Prime Video');
    expect(findBroadcast([], game('DET', 'MIA', '2026-10-23T23:30:00Z', ['NBA League Pass']))).toEqual({
      channel: 'NBA League Pass',
      source: 'league_pass',
    });
    expect(suggestChannel(game('A', 'B', '', ['ABC']))).toBe('ESPN/Disney+');
  });
});

describe('lembrete com o canal (só para quem está no Brasil)', () => {
  const ev = { key: 'k', type: 'game_soon' as const, gameId: 'g1' };
  const g = (source: 'grade' | 'suggested' | 'league_pass', channel: string) => ({
    ...game('LAL', 'BOS', '2026-10-31T23:30:00Z'),
    br: { channel, source },
  });
  it('confirmado, palpite e League Pass', () => {
    expect(buildMessage(ev, g('grade', 'Prime Video'), 'pt', { region: 'BR' }).body).toBe(
      'O jogo começa em 15 minutos, no Prime Video.',
    );
    expect(buildMessage(ev, g('suggested', 'ESPN/Disney+'), 'pt', { region: 'BR' }).body).toBe(
      'O jogo começa em 15 minutos (provavelmente no ESPN/Disney+).',
    );
    expect(buildMessage(ev, g('league_pass', 'NBA League Pass'), 'en', { region: 'BR' }).body).toBe(
      'Tip-off in 15 minutes on NBA League Pass.',
    );
  });
  it('fora do Brasil, sem canal', () => {
    expect(buildMessage(ev, g('grade', 'Prime Video'), 'pt', { region: 'PT' }).body).toBe('O jogo começa em 15 minutos.');
  });
});
