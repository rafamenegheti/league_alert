import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { GameCard } from '@/components/GameCard';
import { API_URL } from '@/lib/api';
import { addDays, dayLabel } from '@/lib/format';
import { useGames } from '@/lib/hooks';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/theme';

export default function GamesScreen() {
  const [date, setDate] = useState<string | null>(null); // null = hoje
  const today = useGames(null).data?.date;
  const { data, isLoading, error, refetch, isRefetching } = useGames(date);
  const shown = date ?? today;

  const move = (days: number) => {
    if (!shown || !today) return;
    const next = addDays(shown, days);
    setDate(next === today ? null : next);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.dateBar}>
        <Pressable hitSlop={12} onPress={() => move(-1)} accessibilityLabel={t('day.previous')}>
          <SymbolView name="chevron.left" tintColor={colors.text} size={20} />
        </Pressable>
        <Pressable onPress={() => setDate(null)}>
          <Text style={styles.dateText}>{shown && today ? dayLabel(shown, today) : ' '}</Text>
        </Pressable>
        <Pressable hitSlop={12} onPress={() => move(1)} accessibilityLabel={t('day.next')}>
          <SymbolView name="chevron.right" tintColor={colors.text} size={20} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('games.serverDown')}</Text>
          <Text style={styles.emptyText}>{t('games.serverHint', { url: API_URL })}</Text>
          <Pressable onPress={() => refetch()} style={styles.retry}>
            <Text style={styles.retryText}>{t('games.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data?.games ?? []}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => <GameCard game={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.muted} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('games.empty')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  dateText: { color: colors.text, fontSize: 17, fontWeight: '600', textTransform: 'capitalize' },
  list: { padding: 16, paddingTop: 4, gap: 12 },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  retry: { marginTop: 12, backgroundColor: colors.card, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: colors.accent, fontWeight: '600' },
});
