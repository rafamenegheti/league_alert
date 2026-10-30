import { periodShort, type Game, type Play, type TeamScore } from '@league-alert/shared';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FollowButton } from '@/components/FollowButton';
import { StatusPill } from '@/components/StatusPill';
import { useGame } from '@/lib/hooks';
import { lang, t } from '@/lib/i18n';
import { colors } from '@/lib/theme';

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch, isRefetching } = useGame(id);

  if (isLoading) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;
  if (error || !data) return <Text style={styles.error}>{t('game.loadError')}</Text>;

  const { game, plays } = data;
  const showScore = game.status !== 'scheduled' && game.status !== 'postponed';

  return (
    <>
      <Stack.Screen
        options={{
          title: `${game.away.abbr} x ${game.home.abbr}`,
          headerRight: game.status === 'final' ? undefined : () => <FollowButton game={game} />,
        }}
      />
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.muted} />}
      >
        <View style={styles.header}>
          <TeamBlock team={game.away} />
          <View style={styles.center}>
            {showScore ? (
              <Text style={styles.score} numberOfLines={1} adjustsFontSizeToFit>
                {game.away.score} <Text style={styles.scoreSep}>–</Text> {game.home.score}
              </Text>
            ) : null}
            <StatusPill game={game} large />
          </View>
          <TeamBlock team={game.home} />
        </View>

        {game.broadcasts.length ? <Text style={styles.broadcast}>{game.broadcasts.join(' · ')}</Text> : null}

        {game.home.linescores.length ? <LineScore game={game} /> : null}

        {plays.length ? (
          <>
            <Text style={styles.section}>{t('game.latestPlays')}</Text>
            <View style={styles.group}>
              {plays.slice(0, 40).map((p, i) => (
                <PlayRow key={p.id} play={p} game={game} border={i > 0} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

function TeamBlock({ team }: { team: TeamScore }) {
  return (
    <View style={styles.team}>
      <Image source={team.logo} style={styles.bigLogo} contentFit="contain" />
      <Text style={styles.teamAbbr}>{team.abbr}</Text>
      {team.record ? <Text style={styles.muted}>{team.record}</Text> : null}
    </View>
  );
}

function LineScore({ game }: { game: Game }) {
  const periods = Math.max(4, game.home.linescores.length, game.away.linescores.length);
  const cols = Array.from({ length: periods }, (_, i) => i);
  const row = (t: TeamScore) => (
    <View style={styles.lsRow}>
      <Text style={[styles.lsTeam, styles.lsText]}>{t.abbr}</Text>
      {cols.map((i) => (
        <Text key={i} style={[styles.lsCell, styles.lsText]}>
          {t.linescores[i] ?? '–'}
        </Text>
      ))}
      <Text style={[styles.lsCell, styles.lsText, styles.lsTotal]}>{t.score}</Text>
    </View>
  );
  return (
    <View style={[styles.group, { padding: 12, marginTop: 16 }]}>
      <View style={styles.lsRow}>
        <Text style={[styles.lsTeam, styles.muted]} />
        {cols.map((i) => (
          <Text key={i} style={[styles.lsCell, styles.muted]}>
            {periodShort(i + 1, lang)}
          </Text>
        ))}
        <Text style={[styles.lsCell, styles.muted]}>{t('game.total')}</Text>
      </View>
      {row(game.away)}
      {row(game.home)}
    </View>
  );
}

function PlayRow({ play, game, border }: { play: Play; game: Game; border: boolean }) {
  return (
    <View style={[styles.play, border && styles.rowBorder]}>
      <Text style={styles.playTime}>
        {periodShort(play.period, lang)} {play.clock}
      </Text>
      <Text style={[styles.playText, play.scoring && { fontWeight: '600' }]}>{play.text}</Text>
      {play.scoring ? (
        <Text style={styles.playScore}>
          {play.awayScore}-{play.homeScore}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  error: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  team: { width: 76, alignItems: 'center', gap: 4 },
  bigLogo: { width: 56, height: 56 },
  teamAbbr: { color: colors.text, fontSize: 18, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', gap: 8 },
  score: { color: colors.text, fontSize: 36, fontWeight: '800', fontVariant: ['tabular-nums'] },
  scoreSep: { color: colors.muted, fontWeight: '400' },
  muted: { color: colors.muted, fontSize: 13 },
  broadcast: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 4 },
  section: { color: colors.muted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginTop: 24, marginBottom: 8, marginLeft: 4 },
  group: { backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden' },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  lsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  lsTeam: { width: 48 },
  lsCell: { flex: 1, textAlign: 'center', fontSize: 13, fontVariant: ['tabular-nums'] },
  lsText: { color: colors.text, fontSize: 15 },
  lsTotal: { fontWeight: '800' },
  play: { flexDirection: 'row', padding: 12, gap: 10, alignItems: 'flex-start' },
  playTime: { color: colors.muted, fontSize: 12, width: 58, fontVariant: ['tabular-nums'], marginTop: 2 },
  playText: { color: colors.text, fontSize: 14, flex: 1, lineHeight: 19 },
  playScore: { color: colors.accent, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: 1 },
});
