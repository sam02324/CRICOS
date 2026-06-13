/**
 * Player stats. `/player/all` lists every player seen across saved matches;
 * `/player/<name>` shows that player's batting + bowling career and per-match log.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Match } from '@/types/cricket';
import {
  AppText,
  Card,
  EmptyState,
  Field,
  Ionicons,
  Screen,
  SectionTitle,
  StatBox,
} from '@/components/ui';
import { Header } from '@/components/Header';
import { loadMatches } from '@/utils/storage';
import { aggregatePlayerStats, allPlayerNames } from '@/utils/calculations';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);

  useFocusEffect(
    useCallback(() => {
      void loadMatches().then((all) => setMatches(all.filter((m) => m.status === 'completed')));
    }, []),
  );

  const isList = !id || id === 'all';
  if (isList) return <PlayerList matches={matches} onOpen={(name) => router.push(`/player/${encodeURIComponent(name)}`)} />;

  const playerName = decodeURIComponent(id);
  return <PlayerDetail name={playerName} matches={matches} />;
}

/* -------------------------------- list ----------------------------------- */

function PlayerList({ matches, onOpen }: { matches: Match[]; onOpen: (name: string) => void }) {
  const [query, setQuery] = useState('');
  const names = useMemo(() => allPlayerNames(matches), [matches]);
  const rows = useMemo(
    () =>
      names
        .filter((n) => n.toLowerCase().includes(query.trim().toLowerCase()))
        .map((n) => ({ name: n, stats: aggregatePlayerStats(n, matches) }))
        .sort((a, b) => b.stats.runs - a.stats.runs),
    [names, matches, query],
  );

  return (
    <Screen>
      <Header title="Players" subtitle={`${names.length} players`} />
      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
        <Field placeholder="Search players…" value={query} onChangeText={setQuery} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {rows.length === 0 ? (
          <EmptyState icon="people-outline" title="No players yet" subtitle="Player stats build up as you complete matches" />
        ) : (
          rows.map((r) => (
            <Pressable key={r.name} onPress={() => onOpen(r.name)} style={({ pressed }) => [styles.playerRow, pressed && { opacity: 0.85 }]}>
              <View style={styles.avatar}>
                <AppText variant="title" color={colors.black}>
                  {r.name.charAt(0).toUpperCase()}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="title" weight={fontWeight.semibold}>
                  {r.name}
                </AppText>
                <AppText variant="caption">
                  {r.stats.matches} matches • {r.stats.runs} runs • {r.stats.wickets} wkts
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

/* ------------------------------- detail ---------------------------------- */

function PlayerDetail({ name, matches }: { name: string; matches: Match[] }) {
  const stats = useMemo(() => aggregatePlayerStats(name, matches), [name, matches]);
  const log = useMemo(() => buildLog(name, matches), [name, matches]);

  return (
    <Screen>
      <Header title={name} subtitle={`${stats.matches} matches`} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle>Batting</SectionTitle>
        <View style={styles.statsGrid}>
          <StatBox label="Runs" value={stats.runs} accent={colors.primary} />
          <StatBox label="Average" value={stats.average.toFixed(1)} accent={colors.four} />
          <StatBox label="Strike Rate" value={stats.strikeRate.toFixed(1)} accent={colors.six} />
        </View>
        <View style={[styles.statsGrid, { marginTop: spacing.md }]}>
          <StatBox label="Highest" value={`${stats.highestScore}${stats.highestNotOut ? '*' : ''}`} />
          <StatBox label="50s / 100s" value={`${stats.fifties}/${stats.hundreds}`} />
          <StatBox label="4s / 6s" value={`${stats.fours}/${stats.sixes}`} />
        </View>

        <SectionTitle>Bowling</SectionTitle>
        <View style={styles.statsGrid}>
          <StatBox label="Wickets" value={stats.wickets} accent={colors.wicket} />
          <StatBox label="Economy" value={stats.economy.toFixed(2)} accent={colors.warning} />
          <StatBox
            label="Best"
            value={stats.bowlingInnings ? `${stats.bestBowlingWickets}/${stats.bestBowlingRuns}` : '—'}
          />
        </View>
        <View style={[styles.statsGrid, { marginTop: spacing.md }]}>
          <StatBox label="Bowl Avg" value={stats.wickets ? stats.bowlingAverage.toFixed(1) : '—'} />
          <StatBox label="Runs Conceded" value={stats.runsConceded} />
          <StatBox label="Innings" value={stats.bowlingInnings} />
        </View>

        <SectionTitle>Match by match</SectionTitle>
        {log.length === 0 ? (
          <EmptyState icon="document-text-outline" title="No appearances" />
        ) : (
          log.map((entry, i) => (
            <Card key={i} style={{ marginBottom: spacing.sm }}>
              <View style={styles.logTop}>
                <AppText variant="body" weight={fontWeight.semibold} numberOfLines={1} style={{ flex: 1 }}>
                  {entry.vs}
                </AppText>
                <AppText variant="caption">{entry.date}</AppText>
              </View>
              <AppText variant="label" color={colors.textMuted}>
                {entry.batting}
                {entry.bowling ? `  •  ${entry.bowling}` : ''}
              </AppText>
            </Card>
          ))
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

interface LogEntry {
  vs: string;
  date: string;
  batting: string;
  bowling: string | null;
}

function buildLog(name: string, matches: Match[]): LogEntry[] {
  const key = name.trim().toLowerCase();
  const out: LogEntry[] = [];
  for (const m of matches) {
    let batting: string | null = null;
    let bowling: string | null = null;
    for (const inn of m.innings) {
      const bat = inn.batsmen.find((b) => b.name.trim().toLowerCase() === key && b.hasBatted);
      if (bat) batting = `${bat.runs}${bat.isOut ? '' : '*'} (${bat.balls})`;
      const bowl = inn.bowlers.find((b) => b.name.trim().toLowerCase() === key && (b.legalBalls > 0 || b.wickets > 0));
      if (bowl) bowling = `${bowl.wickets}/${bowl.runs}`;
    }
    if (batting || bowling) {
      out.push({
        vs: `${m.team1.name} vs ${m.team2.name}`,
        date: format(new Date(m.createdAt), 'dd MMM'),
        batting: batting ?? 'DNB',
        bowling,
      });
    }
  }
  return out;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.sm },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', gap: spacing.md },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
});
