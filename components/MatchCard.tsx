/**
 * Compact summary of a match — format/status header, both innings as team rows
 * with monogram crests and tabular scores, and a gold result line. Tapping opens
 * the scorecard.
 */
import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { Match } from '@/types/cricket';
import { AppText, Card } from '@/components/ui';
import { formatOvers } from '@/utils/cricket';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

interface MatchCardProps {
  match: Match;
  onPress: () => void;
  onLongPress?: () => void;
}

export function MatchCard({ match, onPress, onLongPress }: MatchCardProps) {
  const won = match.result?.winnerTeam ?? null;
  const live = match.status === 'live';

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <Card style={{ marginBottom: spacing.md }} padded={false}>
        <View style={styles.inner}>
          <View style={styles.topRow}>
            <AppText variant="overline">
              {match.format} · {match.totalOvers} ov
            </AppText>
            {live ? (
              <View style={styles.liveTag}>
                <View style={styles.liveDot} />
                <AppText variant="caption" color={colors.wicket} weight={fontWeight.bold} style={{ letterSpacing: 0.6 }}>
                  LIVE
                </AppText>
              </View>
            ) : (
              <AppText variant="caption">{format(new Date(match.createdAt), 'dd MMM yyyy')}</AppText>
            )}
          </View>

          <TeamRow name={match.team1.name} score={teamScore(match, 1)} highlight={won === 1} dim={won === 2} />
          <TeamRow name={match.team2.name} score={teamScore(match, 2)} highlight={won === 2} dim={won === 1} />
        </View>

        {match.result ? (
          <View style={styles.resultRow}>
            <AppText variant="label" color={colors.gold} weight={fontWeight.bold}>
              {match.result.text}
            </AppText>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );

  function teamScore(m: Match, team: 1 | 2): string {
    const inn = m.innings.find((i) => i.battingTeam === team);
    if (!inn) return 'Yet to bat';
    return `${inn.totalRuns}/${inn.totalWickets} (${formatOvers(inn.legalBalls)})`;
  }
}

function TeamRow({ name, score, highlight, dim }: { name: string; score: string; highlight: boolean; dim: boolean }) {
  return (
    <View style={styles.teamRow}>
      <Crest name={name} />
      <AppText
        variant="title"
        numberOfLines={1}
        style={{ flex: 1 }}
        color={dim ? colors.textMuted : colors.text}
        weight={highlight ? fontWeight.bold : fontWeight.semibold}
      >
        {name}
      </AppText>
      <AppText variant="mono" color={dim ? colors.textMuted : colors.text}>
        {score}
      </AppText>
    </View>
  );
}

export function Crest({ name, size = 30 }: { name: string; size?: number }) {
  return (
    <View style={[styles.crest, { width: size, height: size, borderRadius: size / 2 }]}>
      <AppText variant="label" color={colors.text} weight={fontWeight.bold}>
        {name.trim().charAt(0).toUpperCase() || '?'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { padding: spacing.lg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.wicket },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 },
  crest: {
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
});
