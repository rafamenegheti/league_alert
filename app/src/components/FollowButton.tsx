import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';
import type { Game } from '@league-alert/shared';
import { followState, useDevice, useToggleGame, useToggleMute } from '@/lib/hooks';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/theme';
import { icons } from '@/lib/icons';

/**
 * Botão de alertas do jogo:
 * - sino: liga/desliga os alertas deste jogo
 * - estrela: jogo de time favorito (avisa sozinho); tocar silencia só este jogo
 * - sino cortado: jogo silenciado; tocar volta a avisar
 */
export function FollowButton({ game, size = 22 }: { game: Game; size?: number }) {
  const { data: device } = useDevice();
  const toggleGame = useToggleGame();
  const toggleMute = useToggleMute();
  const state = followState(device, game);
  const done = game.status === 'final';

  // Jogo encerrado: só mostra o ícone se ele estava sendo acompanhado.
  if (done && (state === 'none' || state === 'muted')) return null;

  const look: Record<typeof state, { icon: SymbolViewProps['name']; color: string; label: string }> = {
    favorite: { icon: icons.starFill, color: colors.accent, label: t('follow.favorite') },
    muted: { icon: icons.bellSlash, color: colors.muted, label: t('follow.muted') },
    bell: { icon: icons.bellFill, color: colors.accent, label: t('follow.off') },
    none: { icon: icons.bell, color: colors.muted, label: t('follow.on') },
  };

  const onPress = () => {
    if (state === 'favorite') toggleMute.mutate({ gameId: game.id, muted: true });
    else if (state === 'muted') toggleMute.mutate({ gameId: game.id, muted: false });
    else toggleGame.mutate({ gameId: game.id, on: state === 'none' });
  };

  return (
    <Pressable
      hitSlop={10}
      style={styles.hit}
      disabled={!device || done}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={look[state].label}
    >
      <SymbolView name={look[state].icon} tintColor={look[state].color} size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
