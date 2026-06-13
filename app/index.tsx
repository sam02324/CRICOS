/**
 * Home. A personal header, resume-live banner, headline stats, the primary
 * New Match action, a clean icon grid of destinations, and the recent feed.
 */
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Match } from '@/types/cricket';
import { AppText, Card, EmptyState, Ionicons, Screen, SectionTitle } from '@/components/ui';
import { MatchCard, Crest } from '@/components/MatchCard';
import { useHistoryStore } from '@/store/historyStore';
import { useMatchStore } from '@/store/matchStore';
import { useAuthStore } from '@/store/authStore';
import { loadLiveMatch } from '@/utils/storage';
import { formatOvers } from '@/utils/cricket';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}

const ACTIONS: Action[] = [
  { icon: 'shield-half-outline', label: 'Clubs', route: '/clubs' },
  { icon: 'trophy-outline', label: 'Tournaments', route: '/tournaments' },
  { icon: 'ribbon-outline', label: 'Hall of Fame', route: '/hall-of-fame' },
  { icon: 'people-outline', label: 'Players', route: '/player/all' },
  { icon: 'barbell-outline', label: 'Practice', route: '/practice' },
  { icon: 'time-outline', label: 'History', route: '/history' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { matches, refresh } = useHistoryStore();
  const loadMatch = useMatchStore((s) => s.loadMatch);
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const [live, setLive] = useState<Match | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void loadLiveMatch().then(setLive);
    }, [refresh]),
  );

  const stats = useMemo(() => {
    let runs = 0;
    let wickets = 0;
    for (const m of matches) {
      for (const inn of m.innings) {
        runs += inn.totalRuns;
        wickets += inn.totalWickets;
      }
    }
    return { matches: matches.length, runs, wickets };
  }, [matches]);

  const recent = matches.slice(0, 8);
  const name = profile?.display_name || user?.email?.split('@')[0] || 'Player';
  const avatar = profile?.avatar_url ?? null;

  const resume = () => {
    if (!live) return;
    loadMatch(live);
    router.push(`/scoring/${live.id}`);
  };

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <AppText variant="overline">Welcome back</AppText>
          <AppText variant="h1">{name}</AppText>
        </View>
        <Pressable onPress={() => router.push('/player/all')} hitSlop={8}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <Crest name={name} size={44} />
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {live ? (
          <Pressable onPress={resume}>
            <Card style={styles.liveCard} padded={false}>
              <View style={styles.liveAccent} />
              <View style={styles.liveBody}>
                <View style={styles.liveHead}>
                  <View style={styles.liveDot} />
                  <AppText variant="overline" color={colors.wicket}>
                    Live · tap to resume
                  </AppText>
                </View>
                <AppText variant="title" numberOfLines={1} style={{ marginTop: 4 }}>
                  {live.team1.name} vs {live.team2.name}
                </AppText>
                <AppText variant="label" style={{ marginTop: 2 }}>
                  {liveSummary(live)}
                </AppText>
              </View>
              <View style={styles.livePlay}>
                <Ionicons name="play" size={18} color={colors.black} />
              </View>
            </Card>
          </Pressable>
        ) : null}

        {/* Stats strip */}
        <Card style={styles.statsCard} padded={false}>
          <Stat value={stats.matches} label="Matches" />
          <View style={styles.statDivider} />
          <Stat value={stats.runs} label="Runs" />
          <View style={styles.statDivider} />
          <Stat value={stats.wickets} label="Wickets" />
        </Card>

        {/* Primary action */}
        <Pressable onPress={() => router.push('/new-match')} style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
          <View style={styles.ctaIcon}>
            <Ionicons name="add" size={22} color={colors.black} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="title" color={colors.black}>
              New Match
            </AppText>
            <AppText variant="caption" color="rgba(0,0,0,0.7)">
              Set up and start scoring in seconds
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(0,0,0,0.6)" />
        </Pressable>

        {/* Actions grid */}
        <View style={styles.grid}>
          {ACTIONS.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => router.push(a.route as never)}
              style={({ pressed }) => [styles.tile, pressed && { backgroundColor: colors.surface2 }]}
            >
              <Ionicons name={a.icon} size={22} color={colors.primary} />
              <AppText variant="label" color={colors.text} weight={fontWeight.semibold} style={{ marginTop: spacing.sm }}>
                {a.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        <SectionTitle
          right={
            matches.length > 0 ? (
              <Pressable onPress={() => router.push('/history')} hitSlop={8}>
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
          <EmptyState icon="albums-outline" title="No matches yet" subtitle="Start your first match to see it here" />
        ) : (
          recent.map((m) => (
            <MatchCard key={m.id} match={m} onPress={() => router.push(`/scorecard/${m.id}`)} />
          ))
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="h1" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
      <AppText variant="overline" style={{ marginTop: 2 }}>
        {label}
      </AppText>
    </View>
  );
}

function liveSummary(m: Match): string {
  const inn = m.innings[m.currentInningsIndex];
  if (!inn) return 'Starting…';
  return `${inn.battingTeamName}  ${inn.totalRuns}/${inn.totalWickets}  (${formatOvers(inn.legalBalls)})`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  liveCard: { flexDirection: 'row', alignItems: 'stretch', borderColor: colors.borderStrong },
  liveAccent: { width: 4, backgroundColor: colors.wicket },
  liveBody: { flex: 1, padding: spacing.lg },
  liveHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.wicket },
  livePlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginRight: spacing.lg,
  },

  statsCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: colors.border },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  ctaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    width: '31.5%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
});
