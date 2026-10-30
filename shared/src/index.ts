// Tipos e constantes usados pelo servidor e pelo app.

export type GameStatus =
  | 'scheduled'
  | 'live'
  | 'halftime'
  | 'end_period'
  | 'final'
  | 'postponed';

export interface Team {
  id: string;
  abbr: string;
  name: string; // "Portland Trail Blazers"
  shortName: string; // "Trail Blazers"
  logo: string;
  color: string; // hex sem '#'
}

export interface TeamScore extends Team {
  score: number;
  linescores: number[]; // pontos por período
  record?: string; // "3-0"
}

export interface Game {
  id: string;
  startTime: string; // ISO UTC
  status: GameStatus;
  period: number; // 0 antes de começar
  clock: string; // "8:42"
  clockSeconds: number;
  home: TeamScore;
  away: TeamScore;
  broadcasts: string[];
  simulated?: boolean;
}

export interface Play {
  id: string;
  text: string;
  period: number;
  clock: string;
  homeScore: number;
  awayScore: number;
  scoring: boolean;
  teamId?: string;
}

export interface GameDetail {
  game: Game;
  plays: Play[]; // mais recentes primeiro
}

export type AlertType =
  | 'game_start'
  | 'quarter_start'
  | 'halftime_end'
  | 'overtime_start'
  | 'clutch'
  | 'ejection'
  | 'game_end';

/** Ordem em que os tipos aparecem na tela de alertas. Os textos ficam no app (i18n). */
export const ALERT_TYPES: AlertType[] = [
  'game_start',
  'halftime_end',
  'quarter_start',
  'overtime_start',
  'clutch',
  'ejection',
  'game_end',
];

export type AlertPrefs = Record<AlertType, boolean>;

export const DEFAULT_PREFS: AlertPrefs = {
  game_start: true,
  halftime_end: true,
  quarter_start: true,
  overtime_start: true,
  clutch: true,
  ejection: true,
  game_end: true,
};

export type Platform = 'simulator' | 'ios';

/** Idiomas suportados. Qualquer outro idioma do aparelho cai em inglês. */
export type Lang = 'pt' | 'en';

export function toLang(languageCode: string | null | undefined): Lang {
  return languageCode?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

export interface DeviceState {
  deviceId: string;
  platform: Platform;
  favorites: string[]; // ids de times
  games: string[]; // ids de jogos com o sino ligado
  prefs: AlertPrefs;
  lang: Lang;
}

export interface RegisterDeviceBody {
  deviceId: string;
  platform: Platform;
  pushToken?: string | null;
  lang?: Lang;
}

export interface GamesResponse {
  date: string; // YYYYMMDD
  games: Game[];
}

/** Payload extra que vai junto do push. */
export interface PushData {
  gameId: string;
  alertType: AlertType | 'test';
}

const EN_ORDINAL = ['', '1st', '2nd', '3rd', '4th'];
const ordinalEn = (n: number) => EN_ORDINAL[n] ?? `${n}th`;

/** "3º quarto" / "3rd quarter", "Prorrogação" / "Overtime". */
export function periodLabel(period: number, lang: Lang): string {
  if (period <= 0) return '';
  const ot = period - 4;
  if (lang === 'pt') {
    if (period <= 4) return `${period}º quarto`;
    return ot === 1 ? 'Prorrogação' : `${ot}ª prorrogação`;
  }
  if (period <= 4) return `${ordinalEn(period)} quarter`;
  return ot === 1 ? 'Overtime' : `${ordinalEn(ot)} overtime`;
}

/** "3Q" / "Q3", "OT", "2OT". */
export function periodShort(period: number, lang: Lang): string {
  if (period <= 0) return '';
  if (period <= 4) return lang === 'pt' ? `${period}Q` : `Q${period}`;
  const ot = period - 4;
  return ot === 1 ? 'OT' : `${ot}OT`;
}
