// Cliente da API pública (não oficial) da ESPN. Todo o parse fica aqui,
// para que uma mudança no formato da ESPN afete um arquivo só.
import type { Game, GameStatus, Play, PlayerLine, Team, TeamScore } from '@league-alert/shared';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`ESPN ${res.status} em ${url}`);
  return res.json();
}

export async function fetchScoreboard(date: string): Promise<Game[]> {
  const data = await getJson(`${BASE}/scoreboard?dates=${date}`);
  return parseScoreboard(data);
}

export interface Summary {
  game: Game;
  plays: Play[];
  players: PlayerLine[];
}

export async function fetchSummary(gameId: string): Promise<Summary> {
  const data = await getJson(`${BASE}/summary?event=${gameId}`);
  return parseSummary(data);
}

export async function fetchTeams(): Promise<Team[]> {
  const data = await getJson(`${BASE}/teams`);
  const list: any[] = data?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return list
    .map((t) => parseTeam(t.team))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- parse ----------

export function parseScoreboard(data: any): Game[] {
  return (data?.events ?? []).map((e: any) => parseCompetition(e.id, e.competitions[0], e.status ?? e.competitions[0].status));
}

export function parseSummary(data: any): Summary {
  const comp = data.header.competitions[0];
  const game = parseCompetition(data.header.id ?? comp.id, comp, comp.status);
  const plays: Play[] = (data.plays ?? []).map(parsePlay).reverse();
  return { game, plays, players: parsePlayers(data.boxscore) };
}

/** Box score: uma linha por jogador, dos dois times. */
export function parsePlayers(boxscore: any): PlayerLine[] {
  const out: PlayerLine[] = [];
  for (const team of boxscore?.players ?? []) {
    const block = team.statistics?.[0];
    if (!block) continue;
    const labels: string[] = block.names ?? block.labels ?? [];
    for (const a of block.athletes ?? []) {
      const stat = (label: string) => a.stats?.[labels.indexOf(label)] ?? '';
      const num = (label: string) => Number(stat(label)) || 0;
      out.push({
        id: String(a.athlete?.id),
        name: a.athlete?.displayName ?? '',
        shortName: a.athlete?.shortName ?? a.athlete?.displayName ?? '',
        teamId: String(team.team?.id),
        starter: Boolean(a.starter),
        played: !a.didNotPlay && (a.stats?.length ?? 0) > 0,
        min: num('MIN'),
        pts: num('PTS'),
        reb: num('REB'),
        ast: num('AST'),
        stl: num('STL'),
        blk: num('BLK'),
        fg: stat('FG'),
        threes: stat('3PT'),
        ft: stat('FT'),
      });
    }
  }
  return out;
}

function parseCompetition(id: string, comp: any, status: any): Game {
  const competitors: any[] = comp.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
  const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];
  const broadcasts = new Set<string>();
  for (const b of comp.broadcasts ?? []) for (const n of b.names ?? []) broadcasts.add(n);
  for (const b of comp.broadcasts ?? []) if (b.media?.shortName) broadcasts.add(b.media.shortName);

  const statusName: string = status?.type?.name ?? '';
  const displayClock: string = status?.displayClock ?? '0.0';
  return {
    id: String(id),
    startTime: comp.date ?? comp.startDate,
    status: mapStatus(statusName, status?.type?.state),
    period: Number(status?.period ?? 0),
    clock: displayClock,
    clockSeconds: typeof status?.clock === 'number' ? status.clock : parseClock(displayClock),
    home: parseCompetitor(home),
    away: parseCompetitor(away),
    broadcasts: [...broadcasts],
  };
}

function parseCompetitor(c: any): TeamScore {
  const records: any[] = c.records ?? c.record ?? [];
  const total = records.find((r) => r.type === 'total') ?? records[0];
  return {
    ...parseTeam(c.team),
    score: Number(c.score ?? 0) || 0,
    linescores: (c.linescores ?? []).map((l: any) => Number(l.value ?? l.displayValue ?? 0) || 0),
    record: total?.summary,
  };
}

function parseTeam(t: any): Team {
  const abbr: string = t.abbreviation;
  const logo =
    t.logo ??
    t.logos?.find((l: any) => l.rel?.includes('default'))?.href ??
    t.logos?.[0]?.href ??
    `https://a.espncdn.com/i/teamlogos/nba/500/${abbr.toLowerCase()}.png`;
  return {
    id: String(t.id),
    abbr,
    name: t.displayName,
    shortName: t.shortDisplayName ?? t.name,
    logo,
    color: t.color ?? '333333',
  };
}

function parsePlay(p: any): Play {
  return {
    id: String(p.id),
    text: p.text ?? '',
    period: Number(p.period?.number ?? 0),
    clock: p.clock?.displayValue ?? '',
    homeScore: Number(p.homeScore ?? 0),
    awayScore: Number(p.awayScore ?? 0),
    scoring: Boolean(p.scoringPlay),
    teamId: p.team?.id ? String(p.team.id) : undefined,
    kind: p.type?.text,
  };
}

export function mapStatus(name: string, state?: string): GameStatus {
  switch (name) {
    case 'STATUS_SCHEDULED':
      return 'scheduled';
    case 'STATUS_IN_PROGRESS':
      return 'live';
    case 'STATUS_HALFTIME':
      return 'halftime';
    case 'STATUS_END_PERIOD':
      return 'end_period';
    case 'STATUS_FINAL':
      return 'final';
    case 'STATUS_POSTPONED':
    case 'STATUS_CANCELED':
    case 'STATUS_SUSPENDED':
    case 'STATUS_DELAYED':
      return 'postponed';
  }
  if (state === 'in') return 'live';
  if (state === 'post') return 'final';
  return 'scheduled';
}

/** "8:42" → 522, "45.3" → 45.3 */
export function parseClock(display: string): number {
  if (!display) return 0;
  const parts = display.split(':');
  if (parts.length === 2) return Number(parts[0]) * 60 + Number(parts[1]);
  return Number(display) || 0;
}

/**
 * "Dia de jogos" no fuso dos EUA (ET), como a ESPN usa.
 * Até 6h da manhã em ET ainda conta como o dia anterior (jogos da costa oeste acabam tarde).
 */
export function currentGameDay(now = new Date()): string {
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  if (et.getHours() < 6) et.setDate(et.getDate() - 1);
  const y = et.getFullYear();
  const m = String(et.getMonth() + 1).padStart(2, '0');
  const d = String(et.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
