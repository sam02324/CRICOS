/**
 * Compact summary of a completed match: both innings lines, the result banner,
 * format badge and date. Tapping opens the full scorecard.
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
  const [first, second] = match.innings;
  const won = match.result?.winnerTeam ?? null;

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <AppText variant="caption" color={colors.primary} weight={fontWeight.bold}>
              {match.format.toUpperCase()}
            </AppText>
          </View>
          <AppText variant="caption">{format(new Date(match.createdAt), 'dd MMM yyyy')}</AppText>
        </View>

        <InningsLine
          name={match.team1.name}
          highlight={won === 1}
          score={teamScore(match, 1)}
        />
        <InningsLine
          name={match.team2.name}
          highlight={won === 2}
          score={teamScore(match, 2)}
        />

        {match.result ? (
          <View style={styles.resultRow}>
            <AppText variant="label" color={colors.primary} weight={fontWeight.semibold}>
              {match.result.text}
            </AppText>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );

  function teamScore(m: Match, team: 1 | 2): string {
    const inn = m.innings.find((i) => i.battingTeam === team);
    if (!inn) return 'DNB';
    return `${inn.totalRuns}/${inn.totalWickets} (${formatOvers(inn.legalBalls)})`;
  }
}

function InningsLine({ name, score, highlight }: { name: string; score: string; highlight: boolean }) {
  return (
    <View style={styles.inningsRow}>
      <AppText
        variant="title"
        numberOfLines={1}
        style={{ flex: 1 }}
        color={highlight ? colors.text : colors.textMuted}
        weight={highlight ? fontWeight.bold : fontWeight.semibold}
      >
        {name}
      </AppText>
      <AppText variant="mono" color={highlight ? colors.primary : colors.textMuted}>
        {score}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  badge: {
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  inningsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  resultRow: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
});
