import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Game, TeamScore } from '@league-alert/shared';
import { isActive } from '@/lib/format';
import { colors } from '@/lib/theme';
import { FollowButton } from './FollowButton';
import { StatusPill } from './StatusPill';

export function GameCard({ game }: { game: Game }) {
  const showScore = game.status !== 'scheduled' && game.status !== 'postponed';
  const winner =
    game.status === 'final' ? (game.home.score > game.away.score ? game.home.id : game.away.id) : null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/jogo/[id]', params: { id: game.id } })}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.cardPressed }]}
    >
      <View style={styles.teams}>
        <TeamRow team={game.away} showScore={showScore} dim={winner !== null && winner !== game.away.id} />
        <TeamRow team={game.home} showScore={showScore} dim={winner !== null && winner !== game.home.id} />
      </View>
      <View style={styles.side}>
        <StatusPill game={game} />
        {!isActive(game) && game.broadcasts[0] ? (
          <Text style={styles.broadcast} numberOfLines={1}>
            {game.broadcasts[0]}
          </Text>
        ) : null}
        <FollowButton game={game} />
      </View>
    </Pressable>
  );
}

function TeamRow({ team, showScore, dim }: { team: TeamScore; showScore: boolean; dim: boolean }) {
  return (
    <View style={styles.teamRow}>
      <Image source={team.logo} style={styles.logo} contentFit="contain" />
      <Text style={[styles.abbr, dim && styles.dim]}>{team.abbr}</Text>
      <Text style={styles.record}>{team.record}</Text>
      {showScore ? <Text style={[styles.score, dim && styles.dim]}>{team.score}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  teams: { flex: 1, gap: 10 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 30, height: 30 },
  abbr: { color: colors.text, fontSize: 18, fontWeight: '700', width: 52 },
  record: { color: colors.muted, fontSize: 13, flex: 1 },
  score: { color: colors.text, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dim: { color: colors.muted },
  side: {
    width: 118,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
    paddingLeft: 10,
  },
  broadcast: { color: colors.muted, fontSize: 11, textAlign: 'right' },
});
