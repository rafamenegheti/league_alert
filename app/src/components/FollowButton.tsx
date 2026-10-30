import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Game } from '@league-alert/shared';
import { followState, useDevice, useToggleGame } from '@/lib/hooks';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/theme';

/** Sino para seguir o jogo. Se um dos times é favorito, mostra uma estrela (já segue automaticamente). */
export function FollowButton({ game, size = 22 }: { game: Game; size?: number }) {
  const { data: device } = useDevice();
  const toggle = useToggleGame();
  const state = followState(device, game);
  const done = game.status === 'final';

  if (state === 'favorite') {
    return (
      <View style={styles.hit} accessibilityLabel={t('follow.favorite')}>
        <SymbolView name="star.fill" tintColor={colors.accent} size={size} />
      </View>
    );
  }
  const on = state === 'bell';
  if (done && !on) return null; // jogo acabou: não há mais o que avisar
  return (
    <Pressable
      hitSlop={10}
      style={styles.hit}
      disabled={!device}
      onPress={() => toggle.mutate({ gameId: game.id, on: !on })}
      accessibilityRole="button"
      accessibilityLabel={on ? t('follow.off') : t('follow.on')}
    >
      <SymbolView name={on ? 'bell.fill' : 'bell'} tintColor={on ? colors.accent : colors.muted} size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
