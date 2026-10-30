import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { currentGameDay, parseClock, parseScoreboard, parseSummary } from '../src/espn';

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));

describe('parse da ESPN', () => {
  it('scoreboard com jogo ao vivo', () => {
    const games = parseScoreboard(fixture('scoreboard-live.json'));
    expect(games.length).toBeGreaterThan(0);
    const liveGame = games.find((g) => g.status === 'live')!;
    expect(liveGame.period).toBeGreaterThan(0);
    expect(liveGame.home.abbr).toMatch(/^[A-Z]{2,4}$/);
    expect(liveGame.home.logo).toMatch(/^https:/);
    expect(liveGame.home.linescores.length).toBe(liveGame.period);
    expect(games.some((g) => g.status === 'final')).toBe(true);
  });

  it('summary com lances, mais recentes primeiro', () => {
    const { game, plays } = parseSummary(fixture('summary-live.json'));
    expect(game.status).toBe('live');
    expect(game.home.score).toBeGreaterThan(0);
    expect(plays.length).toBeGreaterThan(10);
    expect(Number(plays[0].id)).toBeGreaterThan(Number(plays[plays.length - 1].id));
  });

  it('relógio', () => {
    expect(parseClock('8:42')).toBe(522);
    expect(parseClock('45.3')).toBe(45.3);
    expect(parseClock('0.0')).toBe(0);
  });

  it('dia de jogos em ET (madrugada conta como dia anterior)', () => {
    expect(currentGameDay(new Date('2026-10-30T02:00:00Z'))).toBe('20261029'); // 22h ET
    expect(currentGameDay(new Date('2026-10-30T07:00:00Z'))).toBe('20261029'); // 3h ET
    expect(currentGameDay(new Date('2026-10-30T15:00:00Z'))).toBe('20261030');
  });
});
