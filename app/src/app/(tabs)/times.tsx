import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useDevice, useTeams, useToggleFavorite } from '@/lib/hooks';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/theme';
import { icons } from '@/lib/icons';

export default function TeamsScreen() {
  const { data: teams, isLoading } = useTeams();
  const { data: device } = useDevice();
  const toggle = useToggleFavorite();
  const favorites = new Set(device?.favorites ?? []);

  if (isLoading) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={teams ?? []}
      keyExtractor={(team) => team.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text style={styles.hint}>{t('teams.hint')}</Text>
      }
      renderItem={({ item }) => {
        const on = favorites.has(item.id);
        return (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.cardPressed }]}
            onPress={() => toggle.mutate({ teamId: item.id, on: !on })}
            disabled={!device}
            accessibilityRole="switch"
            accessibilityState={{ checked: on }}
          >
            <Image source={item.logo} style={styles.logo} contentFit="contain" />
            <Text style={styles.name}>{item.name}</Text>
            <SymbolView name={on ? icons.starFill : icons.star} tintColor={on ? colors.accent : colors.muted} size={22} />
          </Pressable>
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  hint: { color: colors.muted, fontSize: 14, marginBottom: 12, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10 },
  logo: { width: 32, height: 32 },
  name: { color: colors.text, fontSize: 16, flex: 1 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 52 },
});
