import { StyleSheet, Text, View } from 'react-native';
import type { Game } from '@league-alert/shared';
import { statusText } from '@/lib/format';
import { colors } from '@/lib/theme';

export function StatusPill({ game, large = false }: { game: Game; large?: boolean }) {
  const live = game.status === 'live';
  const pause = game.status === 'halftime' || game.status === 'end_period';
  const color = live ? colors.live : pause ? colors.accent : colors.muted;
  return (
    <View style={styles.row}>
      {live || pause ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.text, { color: live || pause ? colors.text : colors.muted }, large && styles.large]}>
        {statusText(game)}
      </Text>
      {game.simulated ? <Text style={styles.sim}>SIM</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  large: { fontSize: 16 },
  sim: {
    color: colors.bg,
    backgroundColor: colors.accent,
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 4,
    borderRadius: 3,
    overflow: 'hidden',
  },
});
