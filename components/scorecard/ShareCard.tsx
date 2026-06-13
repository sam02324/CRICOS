/**
 * The WhatsApp / Instagram-ready result card. This exact view is captured to a
 * PNG by react-native-view-shot, so it is styled to read well as a standalone
 * image (fixed dark background, branding, highlights).
 */
import React, { forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Match } from '@/types/cricket';
import { AppText } from '@/components/ui';
import { bestBowler, formatOvers, topScorer } from '@/utils/cricket';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

export const ShareCard = forwardRef<View, { match: Match }>(({ match }, ref) => {
  const [first, second] = match.innings;
  const allInnings = match.innings.filter(Boolean);

  let topBat = null as ReturnType<typeof topScorer>;
  for (const inn of allInnings) {
    const t = topScorer(inn);
    if (t && (!topBat || t.runs > topBat.runs)) topBat = t;
  }
  let topBowl = null as ReturnType<typeof bestBowler>;
  for (const inn of allInnings) {
    const b = bestBowler(inn);
    if (b && (!topBowl || b.wickets > topBowl.wickets || (b.wickets === topBowl.wickets && b.runs < topBowl.runs)))
      topBowl = b;
  }

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.brand}>
        <AppText style={{ fontSize: 26 }}>🏏</AppText>
        <AppText variant="h2" weight={fontWeight.black}>
          Match Result
        </AppText>
      </View>
      <AppText variant="title" center color={colors.textMuted}>
        {match.team1.name} vs {match.team2.name}
      </AppText>

      <View style={styles.divider} />

      {first ? <ScoreLine name={first.battingTeamName} score={`${first.totalRuns}/${first.totalWickets}`} overs={formatOvers(first.legalBalls)} /> : null}
      {second ? <ScoreLine name={second.battingTeamName} score={`${second.totalRuns}/${second.totalWickets}`} overs={formatOvers(second.legalBalls)} /> : null}

      {match.result ? (
        <View style={styles.resultBox}>
          <AppText variant="title" center color={colors.black} weight={fontWeight.black}>
            {match.result.text} 🎉
          </AppText>
        </View>
      ) : null}

      <View style={styles.highlights}>
        {topBat && topBat.balls > 0 ? (
          <AppText variant="body" weight={fontWeight.semibold}>
            💥 Top Scorer: {topBat.name} — {topBat.runs}({topBat.balls})
          </AppText>
        ) : null}
        {topBowl && topBowl.legalBalls > 0 ? (
          <AppText variant="body" weight={fontWeight.semibold} style={{ marginTop: 4 }}>
            🎯 Best Bowler: {topBowl.name} — {topBowl.wickets}/{topBowl.runs}
          </AppText>
        ) : null}
      </View>

      <View style={styles.divider} />
      <AppText variant="label" center color={colors.primary} weight={fontWeight.bold}>
        Scored with CRICOS 🏏
      </AppText>
    </View>
  );
});

ShareCard.displayName = 'ShareCard';

function ScoreLine({ name, score, overs }: { name: string; score: string; overs: string }) {
  return (
    <View style={styles.scoreLine}>
      <AppText variant="title" weight={fontWeight.semibold} numberOfLines={1} style={{ flex: 1 }}>
        {name}
      </AppText>
      <AppText variant="title" weight={fontWeight.bold} color={colors.primary}>
        {score}
      </AppText>
      <AppText variant="label" style={{ marginLeft: 6 }}>
        ({overs})
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  divider: { height: 2, backgroundColor: colors.border, marginVertical: spacing.md },
  scoreLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  resultBox: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, marginVertical: spacing.md },
  highlights: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg },
});
