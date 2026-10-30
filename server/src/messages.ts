// Texto das notificações em cada idioma, com ou sem placar (modo sem spoiler).
import { periodLabel, periodShort, type Game, type Lang } from '@league-alert/shared';
import type { DetectedEvent } from './detector';

export interface Message {
  title: string;
  body: string;
}

export interface MessageOptions {
  hideScores?: boolean;
  region?: string | null; // "BR": o lembrete diz onde o jogo passa no Brasil
}

/** "GS 100 x 97 NY" (pt) / "GS 100 – 97 NY" (en) */
export function scoreLine(g: Game, lang: Lang): string {
  const sep = lang === 'pt' ? 'x' : '–';
  return `${g.away.abbr} ${g.away.score} ${sep} ${g.home.score} ${g.home.abbr}`;
}

/** "GS x NY" (pt) / "GS @ NY" (en) */
export const matchup = (g: Game, lang: Lang) => `${g.away.abbr} ${lang === 'pt' ? 'x' : '@'} ${g.home.abbr}`;

const abbrOf = (g: Game, teamId?: string) => (teamId === g.home.id ? g.home.abbr : g.away.abbr);

export function buildMessage(ev: DetectedEvent, g: Game, lang: Lang, opts: MessageOptions = {}): Message {
  const pt = lang === 'pt';
  const hide = Boolean(opts.hideScores);
  const head = hide ? matchup(g, lang) : scoreLine(g, lang);
  const title = `🏀 ${head}`;
  const period = ev.period ?? g.period;
  const clock = ev.clock ?? g.clock;
  const when = pt ? `${clock} no ${periodLabel(period, lang)}` : `${clock} left in the ${periodLabel(period, lang)}`;

  switch (ev.type) {
    case 'game_soon': {
      const base = pt ? 'O jogo começa em 15 minutos' : 'Tip-off in 15 minutes';
      const br = opts.region === 'BR' ? g.br : undefined;
      const where = !br
        ? ''
        : br.source === 'suggested'
          ? pt
            ? ` (provavelmente no ${br.channel})`
            : ` (likely on ${br.channel})`
          : pt
            ? `, no ${br.channel}`
            : ` on ${br.channel}`;
      return { title: `⏰ ${matchup(g, lang)}`, body: `${base}${where}.` };
    }
    case 'game_start':
      return { title, body: pt ? 'O jogo começou!' : 'Tip-off! The game has started.' };
    case 'halftime_soon':
      return {
        title: `⏳ ${head}`,
        body: pt ? 'O intervalo está acabando: o 3º quarto começa em ~2 min.' : 'Halftime is almost over: the 3rd quarter starts in ~2 min.',
      };
    case 'halftime_end':
      return {
        title,
        body: pt ? 'Fim do intervalo: o 3º quarto começou!' : 'Halftime is over: the 3rd quarter has started!',
      };
    case 'quarter_start':
      return { title, body: pt ? `O ${period}º quarto começou!` : `The ${periodLabel(period, lang)} has started!` };
    case 'timeout_end':
      return {
        title,
        body: pt ? `Fim do tempo técnico: o jogo voltou! ${when}.` : `Timeout's over: play has resumed! ${when}.`,
      };
    case 'overtime_start':
      return { title, body: pt ? `${periodLabel(period, lang)} começou!` : `${periodLabel(period, lang)} has started!` };
    case 'clutch':
      return { title: `🔥 ${head}`, body: `Clutch time! ${when}.` };
    case 'lead_change': {
      if (hide) {
        return { title: `🔥 ${head}`, body: pt ? `Mudança no placar no fim do jogo! ${when}.` : `The lead changed late in the game! ${when}.` };
      }
      const body = ev.teamId
        ? pt
          ? `${abbrOf(g, ev.teamId)} vira o jogo! ${when}.`
          : `${abbrOf(g, ev.teamId)} takes the lead! ${when}.`
        : pt
          ? `Empate! ${when}.`
          : `Tie game! ${when}.`;
      return { title: `🔥 ${head}`, body };
    }
    case 'scoring_run': {
      if (hide) {
        return { title: `🔥 ${head}`, body: pt ? `Corrida de pontos em andamento! ${when}.` : `A team is on a big run! ${when}.` };
      }
      const run = `${ev.points}-0`;
      const team = abbrOf(g, ev.teamId);
      return {
        title: `🔥 ${head}`,
        body: pt ? `${team} em corrida de ${run}! ${when}.` : `${team} is on a ${run} run! ${when}.`,
      };
    }
    case 'milestone': {
      const who = ev.player ?? '';
      const body =
        ev.milestone === 'triple_double'
          ? pt
            ? `${who} fez um triplo-duplo!`
            : `${who} has a triple-double!`
          : pt
            ? `${who} chegou a ${ev.milestone} pontos!`
            : `${who} has ${ev.milestone} points!`;
      return { title: `⭐ ${head}`, body };
    }
    case 'ejection':
      return { title: `🟥 ${pt ? 'Ejeção em' : 'Ejection:'} ${matchup(g, lang)}`, body: ev.playText ?? '' };
    case 'game_end': {
      const ot = g.period > 4 ? ` (${periodShort(g.period, lang)})` : '';
      return { title: `🏁 ${head}`, body: pt ? `Fim de jogo${ot}.` : `Final${ot}.` };
    }
  }
}

export function testMessage(lang: Lang): Message {
  return {
    title: '🏀 League Alert',
    body: lang === 'pt' ? 'Notificação de teste: está tudo funcionando!' : 'Test notification: everything is working!',
  };
}
