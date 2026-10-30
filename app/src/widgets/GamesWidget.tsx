// Widget da tela inicial com os jogos do dia.
// Regras do expo-widgets: a função do widget não pode usar hooks, estado, imports nem variáveis
// de fora dela; só componentes de @expo/ui/swift-ui. Por isso os textos já vêm traduzidos nas props.
import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, monospacedDigit } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type WidgetGame = {
  id: string;
  away: string;
  home: string;
  awayScore: number;
  homeScore: number;
  showScore: boolean;
  status: string; // "Q3 7:13", "Intervalo", "21:30"...
  live: boolean;
  followed: boolean;
};

export type GamesWidgetProps = {
  title: string;
  empty: string;
  updated: string; // horário da última atualização, ex.: "00:52"
  games: WidgetGame[];
};

// Precisa ser `function` (não arrow function): o Babel do Expo só transforma funções declaradas assim.
function GamesWidget(props: GamesWidgetProps, env: WidgetEnvironment) {
  'widget';
  const BG = '#0C1020';
  const TEXT = '#F2F4F8';
  const MUTED = '#8A93A6';
  const ACCENT = '#FF7A1A';
  const LIVE = '#FF453A';
  const small = env.widgetFamily === 'systemSmall';
  const max = small ? 2 : env.widgetFamily === 'systemLarge' ? 8 : 3;
  const games = props.games.slice(0, max);
  const size = small ? 13 : 15;

  return (
    <VStack alignment="leading" spacing={small ? 6 : 8} modifiers={[containerBackground(BG, 'widget')]}>
      <HStack>
        <Text modifiers={[font({ size: 12, weight: 'heavy' }), foregroundStyle(ACCENT)]}>{props.title}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED)]}>{props.updated}</Text>
      </HStack>
      {games.length === 0 ? (
        <Text modifiers={[font({ size: 13 }), foregroundStyle(MUTED)]}>{props.empty}</Text>
      ) : null}
      {games.map((g) =>
        small ? (
          <VStack key={g.id} alignment="leading" spacing={1}>
            <Text modifiers={[font({ size, weight: 'semibold' }), foregroundStyle(TEXT), monospacedDigit()]}>
              {g.showScore ? `${g.away} ${g.awayScore} – ${g.homeScore} ${g.home}` : `${g.away} x ${g.home}`}
            </Text>
            <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(g.live ? LIVE : MUTED)]}>
              {g.followed ? `🔔 ${g.status}` : g.status}
            </Text>
          </VStack>
        ) : (
          <HStack key={g.id} spacing={6}>
            <Text modifiers={[font({ size, weight: 'semibold' }), foregroundStyle(TEXT), monospacedDigit()]}>
              {g.showScore ? `${g.away} ${g.awayScore} – ${g.homeScore} ${g.home}` : `${g.away} x ${g.home}`}
            </Text>
            {g.followed ? <Text modifiers={[font({ size: 11 })]}>🔔</Text> : null}
            <Spacer />
            <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(g.live ? LIVE : MUTED), monospacedDigit()]}>
              {g.status}
            </Text>
          </HStack>
        ),
      )}
      <Spacer />
    </VStack>
  );
}

export default createWidget<GamesWidgetProps>('GamesWidget', GamesWidget, {
  title: 'LEAGUE ALERT',
  empty: '',
  updated: '',
  games: [],
});

