/**
 * Full batting + bowling tables for one innings, plus extras and fall of wickets.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Innings } from '@/types/cricket';
import { AppText, Card } from '@/components/ui';
import { formatOvers } from '@/utils/cricket';
import { economyRate, formatRate, strikeRate } from '@/utils/calculations';
import { colors, fontWeight, spacing } from '@/constants/theme';

export function InningsTable({ innings }: { innings: Innings }) {
  const batted = innings.batsmen.filter((b) => b.hasBatted);
  const didNotBat = innings.batsmen.filter((b) => !b.hasBatted);
  const usedBowlers = innings.bowlers.filter((b) => b.legalBalls > 0 || b.wickets > 0);
  const extrasTotal =
    innings.extras.bye + innings.extras.legBye + innings.extras.wide + innings.extras.noBall + innings.extras.penalty;

  return (
    <Card style={{ marginBottom: spacing.lg }} padded={false}>
      {/* Innings header */}
      <View style={styles.header}>
        <AppText variant="title" weight={fontWeight.bold}>
          {innings.battingTeamName}
        </AppText>
        <AppText variant="title" color={colors.primary} weight={fontWeight.bold}>
          {innings.totalRuns}/{innings.totalWickets} ({formatOvers(innings.legalBalls)})
        </AppText>
      </View>

      {/* Batting */}
      <View style={styles.row}>
        <AppText variant="caption" style={styles.cBatter}>
          BATTER
        </AppText>
        <AppText variant="caption" style={styles.cNum}>R</AppText>
        <AppText variant="caption" style={styles.cNum}>B</AppText>
        <AppText variant="caption" style={styles.cNum}>4s</AppText>
        <AppText variant="caption" style={styles.cNum}>6s</AppText>
        <AppText variant="caption" style={styles.cSr}>SR</AppText>
      </View>
      {batted.map((b) => (
        <View key={b.playerId} style={styles.batRow}>
          <View style={styles.cBatter}>
            <AppText variant="body" weight={fontWeight.semibold} numberOfLines={1}>
              {b.name} {!b.isOut && !b.isRetired ? '*' : ''}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {dismissalText(b)}
            </AppText>
          </View>
          <AppText variant="mono" style={styles.cNum}>{b.runs}</AppText>
          <AppText variant="body" style={styles.cNum} color={colors.textMuted}>{b.balls}</AppText>
          <AppText variant="body" style={styles.cNum} color={colors.textMuted}>{b.fours}</AppText>
          <AppText variant="body" style={styles.cNum} color={colors.textMuted}>{b.sixes}</AppText>
          <AppText variant="body" style={styles.cSr} color={colors.textMuted}>
            {b.balls ? strikeRate(b.runs, b.balls).toFixed(1) : '—'}
          </AppText>
        </View>
      ))}

      {/* Extras + total */}
      <View style={styles.extrasRow}>
        <AppText variant="body" weight={fontWeight.semibold}>Extras</AppText>
        <AppText variant="body" color={colors.textMuted}>
          {extrasTotal} (b {innings.extras.bye}, lb {innings.extras.legBye}, w {innings.extras.wide}, nb {innings.extras.noBall})
        </AppText>
      </View>
      <View style={styles.totalRow}>
        <AppText variant="title" weight={fontWeight.bold}>Total</AppText>
        <AppText variant="title" weight={fontWeight.bold} color={colors.primary}>
          {innings.totalRuns}/{innings.totalWickets}
        </AppText>
      </View>

      {didNotBat.length > 0 ? (
        <AppText variant="caption" style={styles.dnb}>
          Did not bat: {didNotBat.map((b) => b.name).join(', ')}
        </AppText>
      ) : null}

      {/* Bowling */}
      <View style={styles.bowlHeader}>
        <AppText variant="caption" style={styles.cBowler}>BOWLER</AppText>
        <AppText variant="caption" style={styles.cNum}>O</AppText>
        <AppText variant="caption" style={styles.cNum}>M</AppText>
        <AppText variant="caption" style={styles.cNum}>R</AppText>
        <AppText variant="caption" style={styles.cNum}>W</AppText>
        <AppText variant="caption" style={styles.cSr}>ECON</AppText>
      </View>
      {usedBowlers.map((b) => (
        <View key={b.playerId} style={styles.batRow}>
          <View style={styles.cBowler}>
            <AppText variant="body" weight={fontWeight.semibold} numberOfLines={1}>
              {b.name}
            </AppText>
            {b.wides + b.noBalls > 0 ? (
              <AppText variant="caption">
                wd {b.wides} · nb {b.noBalls}
              </AppText>
            ) : null}
          </View>
          <AppText variant="body" style={styles.cNum} color={colors.textMuted}>{formatOvers(b.legalBalls)}</AppText>
          <AppText variant="body" style={styles.cNum} color={colors.textMuted}>{b.maidens}</AppText>
          <AppText variant="body" style={styles.cNum} color={colors.textMuted}>{b.runs}</AppText>
          <AppText variant="mono" style={styles.cNum}>{b.wickets}</AppText>
          <AppText variant="body" style={styles.cSr} color={colors.textMuted}>
            {formatRate(economyRate(b.legalBalls, b.runs))}
          </AppText>
        </View>
      ))}

      {/* Fall of wickets */}
      {innings.fallOfWickets.length > 0 ? (
        <View style={styles.fow}>
          <AppText variant="caption" weight={fontWeight.bold} style={{ marginBottom: 4 }}>
            FALL OF WICKETS
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {innings.fallOfWickets
              .map((f) => `${f.score}-${f.wicketNumber} (${f.batterName}, ${f.overs})`)
              .join('  •  ')}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

function dismissalText(b: Innings['batsmen'][number]): string {
  if (b.isRetired) return 'retired not out';
  if (!b.isOut) return 'not out';
  const type = b.dismissal ?? 'out';
  if (type === 'Bowled') return `b ${b.bowlerName ?? ''}`.trim();
  if (type === 'LBW') return `lbw b ${b.bowlerName ?? ''}`.trim();
  if (type === 'Caught' || type === 'One Hand Catch')
    return `c ${b.fielderName ?? ''} b ${b.bowlerName ?? ''}`.trim();
  if (type === 'Stumped') return `st ${b.fielderName ?? ''} b ${b.bowlerName ?? ''}`.trim();
  if (type === 'Run Out' || type === 'Tip and Run Run Out')
    return `run out${b.fielderName ? ` (${b.fielderName})` : ''}`;
  if (type === 'Hit Wicket') return `hit wicket b ${b.bowlerName ?? ''}`.trim();
  if (type === 'Boundary on Full') return `boundary on full b ${b.bowlerName ?? ''}`.trim();
  return type.toLowerCase();
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface2,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  bowlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  batRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  cBatter: { flex: 1, paddingRight: spacing.sm },
  cBowler: { flex: 1, paddingRight: spacing.sm },
  cNum: { width: 34, textAlign: 'center' },
  cSr: { width: 48, textAlign: 'right' },
  extrasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  dnb: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  fow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
