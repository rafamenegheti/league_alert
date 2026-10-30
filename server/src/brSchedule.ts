// Onde cada jogo passa no Brasil.
// A fonte é o arquivo grade-br.csv na raiz do repositório, que o dono do app edita pelo site do
// GitHub uma vez por semana. O servidor lê a versão publicada (raw.githubusercontent.com) de tempos
// em tempos, então uma edição chega sem precisar mexer no servidor.
import { readFile } from 'node:fs/promises';
import type { BrBroadcast, Game } from '@league-alert/shared';

export const DEFAULT_GRADE_URL =
  process.env.GRADE_BR_URL ?? 'https://raw.githubusercontent.com/rafamenegheti/league_alert/master/grade-br.csv';
const LOCAL_GRADE = new URL('../../grade-br.csv', import.meta.url).pathname;
const REFRESH_MS = 15 * 60_000;

export interface GradeEntry {
  date: string; // YYYY-MM-DD
  teams: [string, string]; // siglas da ESPN, em ordem alfabética
  channel: string;
  line: number;
}

export interface ParsedGrade {
  entries: GradeEntry[];
  warnings: string[];
}

// Siglas da ESPN e as variações que aparecem por aí (NBA.com, Basketball Reference...).
const ESPN_TEAMS: Record<string, string> = {
  ATL: 'Hawks', BOS: 'Celtics', BKN: 'Nets', CHA: 'Hornets', CHI: 'Bulls', CLE: 'Cavaliers', DAL: 'Mavericks',
  DEN: 'Nuggets', DET: 'Pistons', GS: 'Warriors', HOU: 'Rockets', IND: 'Pacers', LAC: 'Clippers', LAL: 'Lakers',
  MEM: 'Grizzlies', MIA: 'Heat', MIL: 'Bucks', MIN: 'Timberwolves', NO: 'Pelicans', NY: 'Knicks', OKC: 'Thunder',
  ORL: 'Magic', PHI: '76ers', PHX: 'Suns', POR: 'Trail Blazers', SAC: 'Kings', SA: 'Spurs', TOR: 'Raptors',
  UTAH: 'Jazz', WSH: 'Wizards',
};
const ALIASES: Record<string, string> = {
  GSW: 'GS', NYK: 'NY', NOP: 'NO', NOR: 'NO', SAS: 'SA', UTA: 'UTAH', WAS: 'WSH', BRK: 'BKN', BRO: 'BKN',
  PHO: 'PHX', CHO: 'CHA', SIXERS: 'PHI', BLAZERS: 'POR', WOLVES: 'MIN', CAVS: 'CLE', MAVS: 'DAL',
};
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toUpperCase();
const BY_NAME = Object.fromEntries(Object.entries(ESPN_TEAMS).map(([abbr, name]) => [normalize(name), abbr]));

/** "LAL", "lakers", "GSW", "Trail Blazers" → sigla da ESPN; null se não reconhecer. */
export function teamKey(raw: string): string | null {
  const k = normalize(raw);
  if (ESPN_TEAMS[k]) return k;
  return ALIASES[k] ?? BY_NAME[k] ?? null;
}

/** "2026-10-31", "31/10/2026" ou "31/10" → "2026-10-31". */
export function parseDate(raw: string, now = new Date()): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!m) return null;
  const day = +m[1];
  const month = +m[2];
  let year = m[3] ? +m[3] : now.getFullYear();
  if (year < 100) year += 2000;
  return iso(year, month, day);
}

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Linhas: data,visitante,mandante,canal. Linhas vazias ou começando com # são ignoradas. */
export function parseGrade(text: string, now = new Date()): ParsedGrade {
  const entries: GradeEntry[] = [];
  const warnings: string[] = [];
  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = rawLine.trim();
    const n = i + 1;
    if (!line || line.startsWith('#')) return;
    const cols = line.split(',').map((c) => c.trim());
    if (/^data$/i.test(cols[0])) return; // cabeçalho
    if (cols.length < 4 || !cols[3]) {
      warnings.push(`linha ${n}: esperado "data,visitante,mandante,canal" → "${line}"`);
      return;
    }
    const date = parseDate(cols[0], now);
    const a = teamKey(cols[1]);
    const b = teamKey(cols[2]);
    if (!date) warnings.push(`linha ${n}: data "${cols[0]}" não reconhecida (use 2026-10-31 ou 31/10)`);
    if (!a) warnings.push(`linha ${n}: time "${cols[1]}" não reconhecido`);
    if (!b) warnings.push(`linha ${n}: time "${cols[2]}" não reconhecido`);
    if (!date || !a || !b) return;
    entries.push({ date, teams: [a, b].sort() as [string, string], channel: cols.slice(3).join(', '), line: n });
  });
  return { entries, warnings };
}

/** Data do jogo num fuso, no formato YYYY-MM-DD. */
function dateIn(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return ''; // sem horário: não dá para casar com a grade
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Palpite pela TV nacional dos EUA, que costuma coincidir com a do Brasil. */
export function suggestChannel(g: Game): string | null {
  if (g.broadcasts.some((b) => /^(ESPN|ABC)\b/i.test(b))) return 'ESPN/Disney+';
  if (g.broadcasts.some((b) => /prime video/i.test(b))) return 'Prime Video';
  return null;
}

export function findBroadcast(entries: GradeEntry[], g: Game): BrBroadcast {
  const teams = [g.away.abbr, g.home.abbr].sort().join('|');
  // Aceita a data dos EUA (a da tabela da NBA) ou a do Brasil (jogo tarde pode virar o dia).
  const dates = new Set([dateIn(g.startTime, 'America/New_York'), dateIn(g.startTime, 'America/Sao_Paulo')]);
  const hit = entries.find((e) => e.teams.join('|') === teams && dates.has(e.date));
  if (hit) return { channel: hit.channel, source: 'grade' };
  const guess = suggestChannel(g);
  if (guess) return { channel: guess, source: 'suggested' };
  return { channel: 'NBA League Pass', source: 'league_pass' };
}

/** Mantém a grade carregada e atualizada. */
export class BrSchedule {
  private grade: ParsedGrade = { entries: [], warnings: [] };
  private loadedFrom = 'nada carregado ainda';
  private loadedAt: Date | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(private url = DEFAULT_GRADE_URL, private localPath = LOCAL_GRADE) {}

  start(): void {
    this.load();
    this.timer = setInterval(() => this.load(), REFRESH_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Tenta o GitHub; se falhar, usa o arquivo local (útil em desenvolvimento). */
  async load(): Promise<void> {
    try {
      const res = await fetch(`${this.url}?t=${Date.now()}`, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.set(await res.text(), this.url);
      return;
    } catch (e) {
      console.warn(`[grade-br] não consegui ler ${this.url}: ${(e as Error).message}`);
    }
    try {
      this.set(await readFile(this.localPath, 'utf8'), this.localPath);
    } catch {
      // Sem grade nenhuma: segue com palpite / League Pass.
    }
  }

  setText(text: string, from = 'texto'): void {
    this.set(text, from);
  }

  private set(text: string, from: string): void {
    this.grade = parseGrade(text);
    this.loadedFrom = from;
    this.loadedAt = new Date();
    console.log(`[grade-br] ${this.grade.entries.length} jogo(s) de ${from}`);
    for (const w of this.grade.warnings) console.warn(`[grade-br] ${w}`);
  }

  lookup(g: Game): BrBroadcast {
    return findBroadcast(this.grade.entries, g);
  }

  status() {
    return {
      source: this.loadedFrom,
      loadedAt: this.loadedAt?.toISOString() ?? null,
      games: this.grade.entries.length,
      warnings: this.grade.warnings,
    };
  }
}
