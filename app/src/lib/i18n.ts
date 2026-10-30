// Textos do app em português e inglês. O idioma vem do aparelho:
// português (qualquer variante) → pt; qualquer outro idioma → en.
// No iOS, trocar o idioma do sistema reinicia o app, então ler uma vez na abertura basta.
import { toLang, type AlertType, type Lang } from '@league-alert/shared';
import { getLocales } from 'expo-localization';

const device = getLocales()[0];
export const lang: Lang = toLang(device?.languageCode);
/** Locale para datas e horários, ex.: "pt-BR", "en-US". */
export const locale = device?.languageTag ?? (lang === 'pt' ? 'pt-BR' : 'en-US');

const pt = {
  'tab.games': 'Jogos',
  'tab.teams': 'Times',
  'tab.alerts': 'Alertas',

  'day.today': 'Hoje',
  'day.yesterday': 'Ontem',
  'day.tomorrow': 'Amanhã',
  'day.previous': 'Dia anterior',
  'day.next': 'Próximo dia',

  'games.serverDown': 'Não consegui falar com o servidor',
  'games.serverHint': 'Confira se ele está rodando em {url}',
  'games.retry': 'Tentar de novo',
  'games.empty': 'Nenhum jogo neste dia',

  'status.halftime': 'Intervalo',
  'status.endOf': 'Fim do {period}',
  'status.final': 'Final',
  'status.postponed': 'Adiado',

  'follow.favorite': 'Time favorito: alertas ligados',
  'follow.on': 'Ligar alertas deste jogo',
  'follow.off': 'Desligar alertas deste jogo',

  'teams.hint': 'Os jogos dos times marcados com estrela mandam alertas automaticamente, sem precisar ligar o sino.',

  'alerts.permissionOff': 'As notificações estão desligadas. Toque para permitir.',
  'alerts.notifyWhen': 'Avisar quando',
  'alerts.test': 'Testar',
  'alerts.sendTest': 'Enviar notificação de teste',
  'alerts.testTitle': 'Teste',
  'alerts.testSent': 'Enviada! Ela deve aparecer em instantes.',
  'alerts.testNoDevice': 'Aparelho não encontrado no servidor.',
  'alerts.simulate': 'Simular um jogo inteiro (LAL x BOS)',
  'alerts.simulateTitle': 'Simulação',
  'alerts.simulateDone':
    '{matchup} apareceu em "Jogos" como SIM. Ligue o sino nele nos próximos 20 segundos e saia do app: cada fase do jogo dura 5 segundos.',
  'alerts.error': 'Erro: {message}',
  'alerts.server': 'Servidor',
  'alerts.device': 'Aparelho',
  'alerts.simulator': 'Simulador',
  'alerts.iphone': 'iPhone',

  'alert.game_start': 'Início do jogo',
  'alert.game_start.desc': 'Quando a bola sobe no 1º quarto.',
  'alert.halftime_end': 'Volta do intervalo',
  'alert.halftime_end.desc': 'Quando o 3º quarto começa.',
  'alert.quarter_start': 'Volta entre quartos',
  'alert.quarter_start.desc': 'Início do 2º e do 4º quarto.',
  'alert.overtime_start': 'Prorrogação',
  'alert.overtime_start.desc': 'Quando cada prorrogação começa.',
  'alert.clutch': 'Clutch time',
  'alert.clutch.desc': 'Últimos 5 min do 4º quarto com diferença de até 5 pontos.',
  'alert.ejection': 'Ejeção',
  'alert.ejection.desc': 'Quando um jogador ou técnico é expulso.',
  'alert.game_end': 'Fim do jogo',
  'alert.game_end.desc': 'Placar final.',

  'game.loadError': 'Não foi possível carregar o jogo.',
  'game.latestPlays': 'Últimos lances',
  'game.total': 'T',
};

type Key = keyof typeof pt;

const en: Record<Key, string> = {
  'tab.games': 'Games',
  'tab.teams': 'Teams',
  'tab.alerts': 'Alerts',

  'day.today': 'Today',
  'day.yesterday': 'Yesterday',
  'day.tomorrow': 'Tomorrow',
  'day.previous': 'Previous day',
  'day.next': 'Next day',

  'games.serverDown': "Can't reach the server",
  'games.serverHint': "Make sure it's running at {url}",
  'games.retry': 'Try again',
  'games.empty': 'No games on this day',

  'status.halftime': 'Halftime',
  'status.endOf': 'End of {period}',
  'status.final': 'Final',
  'status.postponed': 'Postponed',

  'follow.favorite': 'Favorite team: alerts on',
  'follow.on': 'Turn on alerts for this game',
  'follow.off': 'Turn off alerts for this game',

  'teams.hint': "Games of starred teams send alerts automatically. You don't need to turn on the bell.",

  'alerts.permissionOff': 'Notifications are turned off. Tap to allow them.',
  'alerts.notifyWhen': 'Notify me when',
  'alerts.test': 'Test',
  'alerts.sendTest': 'Send a test notification',
  'alerts.testTitle': 'Test',
  'alerts.testSent': 'Sent! It should show up in a moment.',
  'alerts.testNoDevice': 'This device was not found on the server.',
  'alerts.simulate': 'Simulate a full game (LAL @ BOS)',
  'alerts.simulateTitle': 'Simulation',
  'alerts.simulateDone':
    '{matchup} is now in "Games" marked SIM. Turn on its bell within 20 seconds, then leave the app: each phase of the game lasts 5 seconds.',
  'alerts.error': 'Error: {message}',
  'alerts.server': 'Server',
  'alerts.device': 'Device',
  'alerts.simulator': 'Simulator',
  'alerts.iphone': 'iPhone',

  'alert.game_start': 'Tip-off',
  'alert.game_start.desc': 'When the 1st quarter starts.',
  'alert.halftime_end': 'End of halftime',
  'alert.halftime_end.desc': 'When the 3rd quarter starts.',
  'alert.quarter_start': 'Between quarters',
  'alert.quarter_start.desc': 'When the 2nd and 4th quarters start.',
  'alert.overtime_start': 'Overtime',
  'alert.overtime_start.desc': 'When each overtime starts.',
  'alert.clutch': 'Clutch time',
  'alert.clutch.desc': 'Last 5 minutes of the 4th quarter with a margin of 5 points or less.',
  'alert.ejection': 'Ejection',
  'alert.ejection.desc': 'When a player or coach is ejected.',
  'alert.game_end': 'Final score',
  'alert.game_end.desc': 'When the game ends.',

  'game.loadError': "Couldn't load this game.",
  'game.latestPlays': 'Latest plays',
  'game.total': 'T',
};

const dict: Record<Lang, Record<Key, string>> = { pt, en };

/** Texto no idioma do aparelho. `{nome}` é trocado pelo valor em `params`. */
export function t(key: Key, params?: Record<string, string | number>): string {
  let text = dict[lang][key];
  if (params) for (const [k, v] of Object.entries(params)) text = text.replace(`{${k}}`, String(v));
  return text;
}

export const alertLabel = (type: AlertType) => t(`alert.${type}` as Key);
export const alertDescription = (type: AlertType) => t(`alert.${type}.desc` as Key);
