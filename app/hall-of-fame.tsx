/**
 * Hall of Fame — app-wide records and leaderboards aggregated across every
 * completed match and tournament.
 */
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Match } from '@/types/cricket';
import { HallOfFame, RecordHolder } from '@/types/clubs';
import { AppText, Card, EmptyState, Screen } from '@/components/ui';
import { Header } from '@/components/Header';
import { useTournamentStore } from '@/store/tournamentStore';
import { loadMatches } from '@/utils/storage';
import { computeHallOfFame } from '@/utils/competition';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

interface Section {
  key: keyof HallOfFame;
  title: string;
  emoji: string;
  unit: string;
}

const SECTIONS: Section[] = [
  { key: 'mostRuns', title: 'Most Runs', emoji: '🏏', unit: 'runs' },
  { key: 'mostWickets', title: 'Most Wickets', emoji: '🎯', unit: 'wkts' },
  { key: 'highestScores', title: 'Highest Scores', emoji: '💥', unit: '' },
  { key: 'bestBowling', title: 'Best Bowling', emoji: '🔥', unit: '' },
  { key: 'mostMVPs', title: 'Most MVP Awards', emoji: '⭐', unit: 'MVP' },
  { key: 'mostSixes', title: 'Most Sixes', emoji: '🚀', unit: 'sixes' },
  { key: 'highestTeamTotals', title: 'Highest Team Totals', emoji: '📈', unit: '' },
  { key: 'mostMatches', title: 'Most Matches', emoji: '🧢', unit: 'caps' },
  { key: 'mostTitles', title: 'Most Titles', emoji: '🏆', unit: 'titles' },
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
      <AppText variant="title" weight={fontWeight.bold}>
        {section.emoji} {section.title}
      </AppText>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rank: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' },
});
