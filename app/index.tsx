/**
 * Home dashboard. Resume banner for an in-progress match, headline stats,
 * a big New Match CTA, quick links, and the recent-matches feed.
 */
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Match } from '@/types/cricket';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  Ionicons,
  Screen,
  SectionTitle,
  StatBox,
} from '@/components/ui';
import { MatchCard } from '@/components/MatchCard';
import { useHistoryStore, summarizeHistory } from '@/store/historyStore';
import { useMatchStore } from '@/store/matchStore';
import { loadLiveMatch } from '@/utils/storage';
import { formatOvers } from '@/utils/cricket';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { matches, refresh } = useHistoryStore();
  const loadMatch = useMatchStore((s) => s.loadMatch);
  const [live, setLive] = useState<Match | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void loadLiveMatch().then(setLive);
    }, [refresh]),
  );

  const stats = summarizeHistory(matches);
  const recent = matches.slice(0, 8);

  const resume = () => {
    if (!live) return;
    loadMatch(live);
    router.push(`/scoring/${live.id}`);
  };

  return (
    <Screen>
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <AppText variant="h2" color={colors.black} weight={fontWeight.black}>
            🏏
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="h1">CRICOS</AppText>
          <AppText variant="label">Offline cricket scoring</AppText>
        </View>
        <Pressable onPress={() => router.push('/history')} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="time-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {live ? (
          <Pressable onPress={resume}>
            <Card variant="surface" style={styles.liveCard}>
              <View style={styles.liveDot} />
              <View style={{ flex: 1 }}>
                <AppText variant="label" color={colors.primary} weight={fontWeight.bold}>
                  LIVE • TAP TO RESUME
                </AppText>
                <AppText variant="title" numberOfLines={1}>
                  {live.team1.name} vs {live.team2.name}
                </AppText>
                <AppText variant="label">{liveSummary(live)}</AppText>
              </View>
              <Ionicons name="play-circle" size={40} color={colors.primary} />
            </Card>
          </Pressable>
        ) : null}

        <Button
          title="New Match"
          icon="add-circle"
          size="lg"
          onPress={() => router.push('/new-match')}
        />

        <View style={styles.statsRow}>
          <StatBox label="Matches" value={stats.totalMatches} accent={colors.primary} />
          <StatBox label="Completed" value={stats.completed} accent={colors.four} />
          <StatBox label="Tied" value={stats.ties} accent={colors.warning} />
        </View>

        <View style={styles.quickRow}>
          <QuickLink icon="shield-half" label="Clubs" onPress={() => router.push('/clubs')} />
          <QuickLink icon="trophy" label="Tournaments" onPress={() => router.push('/tournaments')} />
          <QuickLink icon="ribbon" label="Hall of Fame" onPress={() => router.push('/hall-of-fame')} />
        </View>
        <View style={styles.quickRow}>
          <QuickLink icon="fitness" label="Practice" onPress={() => router.push('/practice')} />
          <QuickLink icon="stats-chart" label="Players" onPress={() => router.push('/player/all')} />
          <QuickLink icon="time" label="History" onPress={() => router.push('/history')} />
        </View>

        <SectionTitle
          right={
            matches.length > 0 ? (
              <Pressable onPress={() => router.push('/history')}>
                <AppText variant="label" color={colors.primary}>
                  See all
                </AppText>
              </Pressable>
            ) : undefined
          }
        >
          Recent Matches
        </SectionTitle>

        {recent.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title="No matches yet"
            subtitle="Tap New Match to score your first game"
          />
        ) : (
          recent.map((m) => (
            <MatchCard key={m.id} match={m} onPress={() => router.push(`/scorecard/${m.id}`)} />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function liveSummary(m: Match): string {
  const inn = m.innings[m.currentInningsIndex];
  if (!inn) return 'Starting…';
  return `${inn.battingTeamName} ${inn.totalRuns}/${inn.totalWickets} (${formatOvers(inn.legalBalls)})`;
}

function QuickLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickLink, pressed && { opacity: 0.85 }]}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <AppText variant="label" color={colors.text} weight={fontWeight.semibold} style={{ marginTop: 6 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  liveCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.primary },
  liveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  quickRow: { flexDirection: 'row', gap: spacing.md },
  quickLink: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
