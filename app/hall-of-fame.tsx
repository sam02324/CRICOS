/**
 * Hall of Fame — app-wide records and leaderboards aggregated across every
 * completed match and tournament.
 */
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Match } from '@/types/cricket';
import { HallOfFame, RecordHolder } from '@/types/clubs';
import { AppText, Card, EmptyState, Ionicons, Screen } from '@/components/ui';
import { Header } from '@/components/Header';
import { useTournamentStore } from '@/store/tournamentStore';
import { loadMatches } from '@/utils/storage';
import { computeHallOfFame } from '@/utils/competition';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

interface Section {
  key: keyof HallOfFame;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  unit: string;
}

const SECTIONS: Section[] = [
  { key: 'mostRuns', title: 'Most Runs', icon: 'trending-up-outline', unit: 'runs' },
  { key: 'mostWickets', title: 'Most Wickets', icon: 'flame-outline', unit: 'wkts' },
  { key: 'highestScores', title: 'Highest Scores', icon: 'flash-outline', unit: '' },
  { key: 'bestBowling', title: 'Best Bowling', icon: 'disc-outline', unit: '' },
  { key: 'mostMVPs', title: 'Most MVP Awards', icon: 'star-outline', unit: 'MVP' },
  { key: 'mostSixes', title: 'Most Sixes', icon: 'rocket-outline', unit: 'sixes' },
  { key: 'highestTeamTotals', title: 'Highest Team Totals', icon: 'bar-chart-outline', unit: '' },
  { key: 'mostMatches', title: 'Most Matches', icon: 'shield-outline', unit: 'caps' },
  { key: 'mostTitles', title: 'Most Titles', icon: 'trophy-outline', unit: 'titles' },
];

export default function HallOfFameScreen() {
  const { tournaments, refresh } = useTournamentStore();
  const [matches, setMatches] = useState<Match[]>([]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void loadMatches().then((all) => setMatches(all.filter((m) => m.status === 'completed')));
    }, [refresh]),
  );

  const hof = useMemo(() => computeHallOfFame(matches, tournaments), [matches, tournaments]);
  const hasAny = matches.length > 0;

  return (
    <Screen>
      <Header title="Hall of Fame" subtitle="All-time records" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!hasAny ? (
          <EmptyState icon="ribbon-outline" title="No records yet" subtitle="Complete matches to enter the Hall of Fame" />
        ) : (
          SECTIONS.map((s) => <RecordSection key={s.key} section={s} rows={hof[s.key]} />)
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function RecordSection({ section, rows }: { section: Section; rows: RecordHolder[] }) {
  if (rows.length === 0) return null;
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Ionicons name={section.icon} size={16} color={colors.gold} />
        </View>
        <AppText variant="title" weight={fontWeight.bold}>
          {section.title}
        </AppText>
      </View>
      {rows.map((r, i) => (
        <View key={`${r.name}-${i}`} style={styles.row}>
          <View style={[styles.rank, i === 0 && { backgroundColor: colors.warning }]}>
            <AppText variant="caption" weight={fontWeight.bold} color={i === 0 ? colors.black : colors.textMuted}>
              {i + 1}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="body" weight={fontWeight.semibold} numberOfLines={1}>
              {r.name}
            </AppText>
            {r.detail && !['runs', 'wkts', 'MVP', 'sixes', 'caps', 'titles'].includes(r.detail) ? (
              <AppText variant="caption" numberOfLines={1}>
                {r.detail}
              </AppText>
            ) : null}
          </View>
          <AppText variant="mono" color={colors.primary}>
            {r.value}
            {section.unit ? ` ${section.unit}` : ''}
          </AppText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rank: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' },
});
