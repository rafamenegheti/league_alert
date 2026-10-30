// Textos do app em português e inglês. O idioma vem do aparelho:
// português (qualquer variante) → pt; qualquer outro idioma → en.
// No iOS, trocar o idioma do sistema reinicia o app, então ler uma vez na abertura basta.
import { toLang, type AlertType, type Lang } from '@league-alert/shared';
import { getLocales } from 'expo-localization';

const device = getLocales()[0];
export const lang: Lang = toLang(device?.languageCode);
/** País do aparelho (Ajustes → Geral → Idioma e Região), ex.: "BR". */
export const region: string | null = device?.regionCode ?? null;
export const inBrazil = region === 'BR';
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

  'follow.favorite': 'Time favorito: alertas ligados. Toque para silenciar só este jogo',
  'follow.muted': 'Jogo silenciado. Toque para voltar a avisar',
  'follow.on': 'Ligar alertas deste jogo',
  'follow.off': 'Desligar alertas deste jogo',

  'teams.hint':
    'Os jogos dos times marcados com estrela mandam alertas automaticamente, sem precisar ligar o sino. Para pular um jogo específico, toque na estrela dele na lista de jogos.',

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
  'alert.timeout_end': 'Volta de tempo técnico',
  'alert.timeout_end.desc': 'Quando o jogo volta depois de um pedido de tempo.',
  'alert.overtime_start': 'Prorrogação',
  'alert.overtime_start.desc': 'Quando cada prorrogação começa.',
  'alert.clutch': 'Clutch time',
  'alert.clutch.desc': 'Últimos 5 min do 4º quarto com diferença de até 5 pontos.',
  'alert.ejection': 'Ejeção',
  'alert.ejection.desc': 'Quando um jogador ou técnico é expulso.',
  'alert.game_end': 'Fim do jogo',
  'alert.game_end.desc': 'Placar final.',

  'alert.game_soon': 'Lembrete antes do jogo',
  'alert.game_soon.desc': '15 minutos antes da bola subir.',
  'alert.halftime_soon': 'Intervalo acabando',
  'alert.halftime_soon.desc': 'Cerca de 2 minutos antes do 3º quarto.',
  'alert.lead_change': 'Virada ou empate no fim',
  'alert.lead_change.desc': 'Nos últimos 2 minutos do 4º quarto ou da prorrogação.',
  'alert.scoring_run': 'Corrida de pontos',
  'alert.scoring_run.desc': 'Quando um time faz 10 pontos seguidos.',
  'alert.milestone': 'Marcos de jogador',
  'alert.milestone.desc': '40 ou 50 pontos, ou triplo-duplo.',
  'group.back': 'Voltar a assistir',
  'group.moments': 'Momentos do jogo',
  'settings.title': 'Notificações',
  'settings.hideScores': 'Modo sem spoiler',
  'settings.hideScores.desc': 'Não mostra o placar nem quem virou o jogo.',
  'settings.delay': 'Atraso do seu stream',
  'settings.delay.desc': 'Segura os avisos para chegarem junto com a sua transmissão.',
  'settings.delay.none': 'Sem',
  'game.boxScore': 'Estatísticas',
  'br.likely': 'provável',
  'game.player': 'Jogador',
  'game.min': 'MIN',
  'game.pts': 'PTS',
  'game.reb': 'REB',
  'game.ast': 'AST',
  'game.loadError': 'Não foi possível carregar o jogo.',
  'game.latestPlays': 'Últimos lances',
  'game.total': 'T',

  'support.title': 'Apoie o League Alert',
  'support.row.desc': 'Ajude a manter o app e o servidor no ar',
  'support.row.thanks': 'Obrigado pelo apoio! Dá para apoiar de novo quando quiser.',
  'support.intro':
    'O League Alert é feito por uma pessoa só, sem anúncios e sem assinatura. Se ele te ajuda a não perder a volta do jogo, escolha um valor para ajudar a pagar o servidor e as próximas novidades.',
  'support.tier.5': 'Lance livre',
  'support.tier.10': 'Bandeja',
  'support.tier.25': 'Bola de 3',
  'support.tier.50': 'Enterrada',
  'support.tier.100': 'Triplo-duplo',
  'support.tier.200': 'MVP',
  'support.note': 'Pagamento único pela Apple. Não é assinatura e não libera nada extra: o app continua igual para todo mundo.',
  'support.loading': 'Carregando valores…',
  'support.unavailable': 'As compras não estão disponíveis agora. Tente de novo mais tarde.',
  'support.error': 'Não deu certo',
  'support.thanks.title': 'Valeu demais! 🏀',
  'support.thanks.text': 'Seu apoio ajuda o League Alert a continuar no ar. Bons jogos!',
  'support.close': 'Fechar',
  'support.prompt.title': 'Curtindo o League Alert?',
  'support.prompt.text':
    'O app é feito por uma pessoa só, sem anúncios. Se ele te ajudou a voltar para o jogo na hora certa, que tal apoiar com qualquer valor?',
  'support.prompt.yes': 'Quero apoiar',
  'support.prompt.later': 'Agora não',
  'support.prompt.never': 'Não perguntar mais',
  'support.preview': 'Mostrar o pedido de apoio',
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

  'follow.favorite': 'Favorite team: alerts on. Tap to mute just this game',
  'follow.muted': 'Game muted. Tap to turn alerts back on',
  'follow.on': 'Turn on alerts for this game',
  'follow.off': 'Turn off alerts for this game',

  'teams.hint':
    "Games of starred teams send alerts automatically. You don't need to turn on the bell. To skip a specific game, tap its star in the games list.",

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
  'alert.timeout_end': 'After timeouts',
  'alert.timeout_end.desc': 'When play resumes after a timeout.',
  'alert.overtime_start': 'Overtime',
  'alert.overtime_start.desc': 'When each overtime starts.',
  'alert.clutch': 'Clutch time',
  'alert.clutch.desc': 'Last 5 minutes of the 4th quarter with a margin of 5 points or less.',
  'alert.ejection': 'Ejection',
  'alert.ejection.desc': 'When a player or coach is ejected.',
  'alert.game_end': 'Final score',
  'alert.game_end.desc': 'When the game ends.',

  'alert.game_soon': 'Pre-game reminder',
  'alert.game_soon.desc': '15 minutes before tip-off.',
  'alert.halftime_soon': 'Halftime ending',
  'alert.halftime_soon.desc': 'About 2 minutes before the 3rd quarter.',
  'alert.lead_change': 'Late lead change or tie',
  'alert.lead_change.desc': 'In the last 2 minutes of the 4th quarter or overtime.',
  'alert.scoring_run': 'Scoring runs',
  'alert.scoring_run.desc': 'When a team scores 10 straight points.',
  'alert.milestone': 'Player milestones',
  'alert.milestone.desc': '40 or 50 points, or a triple-double.',
  'group.back': 'Get back to the game',
  'group.moments': 'Game moments',
  'settings.title': 'Notifications',
  'settings.hideScores': 'Spoiler-free mode',
  'settings.hideScores.desc': "Hides the score and who took the lead.",
  'settings.delay': 'Your stream delay',
  'settings.delay.desc': 'Holds alerts so they arrive in sync with your stream.',
  'settings.delay.none': 'None',
  'game.boxScore': 'Box score',
  'br.likely': 'likely',
  'game.player': 'Player',
  'game.min': 'MIN',
  'game.pts': 'PTS',
  'game.reb': 'REB',
  'game.ast': 'AST',
  'game.loadError': "Couldn't load this game.",
  'game.latestPlays': 'Latest plays',
  'game.total': 'T',

  'support.title': 'Support League Alert',
  'support.row.desc': 'Help keep the app and its server running',
  'support.row.thanks': 'Thanks for your support! You can chip in again anytime.',
  'support.intro':
    "League Alert is made by one person, with no ads and no subscription. If it helps you catch the game when it's back, pick an amount to help pay for the server and what comes next.",
  'support.tier.5': 'Free throw',
  'support.tier.10': 'Layup',
  'support.tier.25': 'Three-pointer',
  'support.tier.50': 'Slam dunk',
  'support.tier.100': 'Triple-double',
  'support.tier.200': 'MVP',
  'support.note': "One-time payment through Apple. It's not a subscription and unlocks nothing: the app stays the same for everyone.",
  'support.loading': 'Loading amounts…',
  'support.unavailable': 'Purchases are not available right now. Please try again later.',
  'support.error': 'Something went wrong',
  'support.thanks.title': 'Thank you! 🏀',
  'support.thanks.text': 'Your support keeps League Alert running. Enjoy the games!',
  'support.close': 'Close',
  'support.prompt.title': 'Enjoying League Alert?',
  'support.prompt.text':
    "The app is made by one person, with no ads. If it helped you get back to the game right on time, how about chipping in any amount?",
  'support.prompt.yes': 'I want to help',
  'support.prompt.later': 'Not now',
  'support.prompt.never': "Don't ask again",
  'support.preview': 'Show the support request',
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
export const supportTierName = (amount: number) => t(`support.tier.${amount}` as Key);
