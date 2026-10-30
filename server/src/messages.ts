// Texto das notificações em cada idioma.
import { periodLabel, periodShort, type Game, type Lang } from '@league-alert/shared';
import type { DetectedEvent } from './detector';

export interface Message {
  title: string;
  body: string;
}

/** "GS 100 x 97 NY" (pt) / "GS 100 – 97 NY" (en) */
export function scoreLine(g: Game, lang: Lang): string {
  const sep = lang === 'pt' ? 'x' : '–';
  return `${g.away.abbr} ${g.away.score} ${sep} ${g.home.score} ${g.home.abbr}`;
}

const matchup = (g: Game, lang: Lang) => `${g.away.abbr} ${lang === 'pt' ? 'x' : '@'} ${g.home.abbr}`;

export function buildMessage(ev: DetectedEvent, g: Game, lang: Lang): Message {
  const pt = lang === 'pt';
  const title = `🏀 ${scoreLine(g, lang)}`;
  const period = ev.period ?? g.period;
  switch (ev.type) {
    case 'game_start':
      return { title, body: pt ? 'O jogo começou!' : 'Tip-off! The game has started.' };
    case 'halftime_end':
      return {
        title,
        body: pt ? 'Fim do intervalo: o 3º quarto começou!' : 'Halftime is over: the 3rd quarter has started!',
      };
    case 'quarter_start':
      return { title, body: pt ? `O ${period}º quarto começou!` : `The ${periodLabel(period, lang)} has started!` };
    case 'overtime_start':
      return { title, body: pt ? `${periodLabel(period, lang)} começou!` : `${periodLabel(period, lang)} has started!` };
    case 'clutch':
      return {
        title: `🔥 ${scoreLine(g, lang)}`,
        body: pt
          ? `Clutch time! ${g.clock} no ${periodLabel(g.period, lang)}.`
          : `Clutch time! ${g.clock} left in the ${periodLabel(g.period, lang)}.`,
      };
    case 'ejection':
      return { title: `🟥 ${pt ? 'Ejeção em' : 'Ejection:'} ${matchup(g, lang)}`, body: ev.playText ?? '' };
    case 'game_end': {
      const ot = g.period > 4 ? ` (${periodShort(g.period, lang)})` : '';
      return { title: `🏁 ${scoreLine(g, lang)}`, body: pt ? `Fim de jogo${ot}.` : `Final${ot}.` };
    }
  }
}

export function testMessage(lang: Lang): Message {
  return {
    title: '🏀 League Alert',
    body: lang === 'pt' ? 'Notificação de teste: está tudo funcionando!' : 'Test notification: everything is working!',
  };
}
