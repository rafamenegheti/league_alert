import { periodShort, type Game } from '@league-alert/shared';
import { lang, locale, t } from './i18n';

export function startTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** Texto curto do status: "21:30", "3Q 7:21" / "Q3 7:21", "Intervalo" / "Halftime", "Final". */
export function statusText(g: Game): string {
  switch (g.status) {
    case 'scheduled':
      return startTime(g.startTime);
    case 'live':
      return `${periodShort(g.period, lang)} ${g.clock}`;
    case 'halftime':
      return t('status.halftime');
    case 'end_period':
      return t('status.endOf', { period: periodShort(g.period, lang) });
    case 'final':
      return g.period > 4 ? `${t('status.final')}/${periodShort(g.period, lang)}` : t('status.final');
    case 'postponed':
      return t('status.postponed');
  }
}

export const isActive = (g: Game) => g.status === 'live' || g.status === 'halftime' || g.status === 'end_period';

// ---------- datas no formato YYYYMMDD ----------

function toDate(ymd: string): Date {
  return new Date(Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)), 12));
}

export function addDays(ymd: string, days: number): string {
  const d = toDate(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function dayLabel(ymd: string, today: string): string {
  if (ymd === today) return t('day.today');
  if (ymd === addDays(today, -1)) return t('day.yesterday');
  if (ymd === addDays(today, 1)) return t('day.tomorrow');
  return toDate(ymd).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}
