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
  broadcasts: string[]; // transmissões dos EUA (da ESPN)
  br?: BrBroadcast; // onde passa no Brasil
  simulated?: boolean;
}

/**
 * Onde o jogo passa no Brasil.
 * - grade: confirmado no arquivo grade-br.csv
 * - suggested: palpite pela TV nacional dos EUA (ESPN → ESPN/Disney+, Prime → Prime Video)
 * - league_pass: sem informação; todos os jogos passam no NBA League Pass
 */
export interface BrBroadcast {
  channel: string;
  source: 'grade' | 'suggested' | 'league_pass';
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
  kind?: string; // tipo do lance na ESPN, ex.: "Full Timeout", "Substitution", "Jump Shot"
}

/** Linha do box score de um jogador. */
export interface PlayerLine {
  id: string;
  name: string; // "Cedric Coward"
  shortName: string; // "C. Coward"
  teamId: string;
  starter: boolean;
  played: boolean;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fg: string; // "6-13"
  threes: string; // "2-4"
  ft: string;
}

export interface GameDetail {
  game: Game;
  plays: Play[]; // mais recentes primeiro
  players: PlayerLine[];
}

export type AlertType =
  | 'game_soon'
  | 'game_start'
  | 'quarter_start'
  | 'halftime_soon'
  | 'halftime_end'
  | 'timeout_end'
  | 'overtime_start'
  | 'clutch'
  | 'lead_change'
  | 'scoring_run'
  | 'milestone'
  | 'ejection'
  | 'game_end';

/** Grupos da tela de alertas, na ordem em que aparecem. Os textos ficam no app (i18n). */
export const ALERT_GROUPS: { id: 'back' | 'moments'; types: AlertType[] }[] = [
  {
    id: 'back', // avisos para voltar a assistir
    types: ['game_soon', 'game_start', 'halftime_soon', 'halftime_end', 'quarter_start', 'timeout_end', 'overtime_start'],
  },
  {
    id: 'moments', // momentos do jogo
    types: ['clutch', 'lead_change', 'scoring_run', 'milestone', 'ejection', 'game_end'],
  },
];

export const ALERT_TYPES: AlertType[] = ALERT_GROUPS.flatMap((g) => g.types);

export type AlertPrefs = Record<AlertType, boolean>;

export const DEFAULT_PREFS = Object.fromEntries(ALERT_TYPES.map((t) => [t, true])) as AlertPrefs;

/** Configurações das notificações de cada aparelho. */
export interface DeviceSettings {
  hideScores: boolean; // modo sem spoiler: não mostra o placar no push
  delaySeconds: number; // atraso do stream: segura o push esse tempo
}

export const DEFAULT_SETTINGS: DeviceSettings = { hideScores: false, delaySeconds: 0 };
export const DELAY_OPTIONS = [0, 15, 30, 45, 60, 90, 120];

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
  muted: string[]; // ids de jogos silenciados (mesmo sendo de time favorito)
  prefs: AlertPrefs;
  settings: DeviceSettings;
  lang: Lang;
}

export interface RegisterDeviceBody {
  deviceId: string;
  platform: Platform;
  pushToken?: string | null;
  lang?: Lang;
  region?: string | null; // país do aparelho, ex.: "BR"
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
