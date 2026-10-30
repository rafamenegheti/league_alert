// Mantém o widget da tela inicial em dia com a lista de jogos que o app acabou de buscar.
import type { DeviceState, Game } from '@league-alert/shared';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import GamesWidget, { type WidgetGame } from '@/widgets/GamesWidget';
import { isActive, statusText } from './format';
import { followState } from './hooks';
import { locale, t } from './i18n';

/** Ordem no widget: jogos seguidos, depois ao vivo, depois os que ainda vão começar, por último os encerrados. */
function rank(g: Game, followed: boolean): number {
  const phase = isActive(g) ? 0 : g.status === 'scheduled' ? 1 : 2;
  return (followed ? 0 : 3) + phase;
}

export function toWidgetGames(games: Game[], device: DeviceState | undefined): WidgetGame[] {
  return games
    .map((g) => ({ g, followed: followState(device, g) !== 'none' }))
    .sort((a, b) => rank(a.g, a.followed) - rank(b.g, b.followed) || a.g.startTime.localeCompare(b.g.startTime))
    .map(({ g, followed }) => ({
      id: g.id,
      away: g.away.abbr,
      home: g.home.abbr,
      awayScore: g.away.score,
      homeScore: g.home.score,
      showScore: g.status !== 'scheduled' && g.status !== 'postponed',
      status: statusText(g),
      live: isActive(g),
      followed,
    }));
}

/** Atualiza o widget sempre que a lista de jogos de hoje muda. */
export function useGamesWidget(games: Game[] | undefined, device: DeviceState | undefined) {
  useEffect(() => {
    if (Platform.OS !== 'ios' || !games) return;
    try {
      GamesWidget.updateSnapshot({
        title: 'LEAGUE ALERT',
        empty: t('games.empty'),
        updated: new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
        games: toWidgetGames(games, device),
      });
    } catch (e) {
      // Sem o widget configurado (ex.: build antigo), só ignora.
      console.warn('[widget]', (e as Error).message);
    }
  }, [games, device]);
}
