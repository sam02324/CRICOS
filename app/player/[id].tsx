/**
 * Player stats. `/player/all` lists every player seen across saved matches;
 * `/player/<name>` shows a rich profile — Overview (batting / bowling / fielding,
 * recent form, match log) and Statistics (per-format career breakdown).
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Match, PlayerCareerStats } from '@/types/cricket';
import { AppText, Card, EmptyState, Field, Ionicons, Screen, SectionTitle } from '@/components/ui';
import { Header } from '@/components/Header';
import { Crest } from '@/components/MatchCard';
import { loadMatches } from '@/utils/storage';
import {
  FormInnings,
  aggregateFielding,
  aggregatePlayerStats,
  allPlayerNames,
  profileId,
  recentForm,
  statsByFormat,
} from '@/utils/calculations';
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
  return <PlayerDetail name={decodeURIComponent(id)} matches={matches} />;
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
            <Pressable key={r.name} onPress={() => onOpen(r.name)} style={({ pressed }) => [styles.playerRow, pressed && { backgroundColor: colors.surface2 }]}>
              <Crest name={r.name} size={40} />
              <View style={{ flex: 1 }}>
                <AppText variant="title" weight={fontWeight.semibold}>
                  {r.name}
                </AppText>
                <AppText variant="caption">
                  {r.stats.matches} mat · {r.stats.runs} runs · {r.stats.wickets} wkts
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

/* ------------------------------- detail ---------------------------------- */

function PlayerDetail({ name, matches }: { name: string; matches: Match[] }) {
  const [tab, setTab] = useState<'overview' | 'stats'>('overview');
  const stats = useMemo(() => aggregatePlayerStats(name, matches), [name, matches]);
  const fielding = useMemo(() => aggregateFielding(name, matches), [name, matches]);
  const form = useMemo(() => recentForm(name, matches, 8), [name, matches]);
  const byFormat = useMemo(() => statsByFormat(name, matches), [name, matches]);
  const log = useMemo(() => buildLog(name, matches), [name, matches]);
  const pid = useMemo(() => profileId(name), [name]);

  return (
    <Screen>
      <Header title="Profile" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Crest name={name} size={76} />
          <AppText variant="h1" center style={{ marginTop: spacing.md }}>
            {name}
          </AppText>
          <View style={styles.idChip}>
            <Ionicons name="finger-print" size={13} color={colors.textMuted} />
            <AppText variant="caption" color={colors.textMuted}>
              ID · {pid}
            </AppText>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.segment}>
          <SegBtn label="Overview" active={tab === 'overview'} onPress={() => setTab('overview')} />
          <SegBtn label="Statistics" active={tab === 'stats'} onPress={() => setTab('stats')} />
        </View>

        {tab === 'overview' ? (
          <>
            <StatGroup
              title="Batting"
              accent={colors.primary}
              cells={[
                { label: 'Runs', value: stats.runs },
                { label: 'Average', value: stats.average.toFixed(1) },
                { label: 'SR', value: stats.strikeRate.toFixed(1) },
                { label: 'Highest', value: `${stats.highestScore}${stats.highestNotOut ? '*' : ''}` },
                { label: '50s / 100s', value: `${stats.fifties}/${stats.hundreds}` },
                { label: '4s / 6s', value: `${stats.fours}/${stats.sixes}` },
              ]}
            />
            <StatGroup
              title="Bowling"
              accent={colors.four}
              cells={[
                { label: 'Wickets', value: stats.wickets },
                { label: 'Average', value: stats.wickets ? stats.bowlingAverage.toFixed(1) : '—' },
                { label: 'Economy', value: stats.ballsBowled ? stats.economy.toFixed(2) : '—' },
                { label: 'Best', value: stats.bowlingInnings ? `${stats.bestBowlingWickets}/${stats.bestBowlingRuns}` : '—' },
                { label: 'Conceded', value: stats.runsConceded },
                { label: 'Innings', value: stats.bowlingInnings },
              ]}
            />
            <StatGroup
              title="Fielding"
              accent={colors.gold}
              cells={[
                { label: 'Catches', value: fielding.catches },
                { label: 'Stumpings', value: fielding.stumpings },
                { label: 'Run outs', value: fielding.runouts },
              ]}
            />

            {form.length > 0 ? (
              <View>
                <SectionTitle>Recent Form</SectionTitle>
                <View style={styles.formRow}>
                  {form.map((f, i) => (
                    <FormPill key={i} inn={f} />
                  ))}
                </View>
              </View>
            ) : null}

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
                    {entry.bowling ? `   ·   ${entry.bowling}` : ''}
                  </AppText>
                </Card>
              ))
            )}
          </>
        ) : (
          <FormatTable rows={byFormat} />
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

/* ------------------------------- pieces ---------------------------------- */

function SegBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segBtn, active && styles.segBtnOn]}>
      <AppText variant="label" color={active ? colors.text : colors.textMuted} weight={fontWeight.bold}>
        {label}
      </AppText>
    </Pressable>
  );
}

function StatGroup({ title, accent, cells }: { title: string; accent: string; cells: { label: string; value: string | number }[] }) {
  return (
    <View>
      <View style={styles.groupHead}>
        <View style={[styles.groupDot, { backgroundColor: accent }]} />
        <AppText variant="overline">{title}</AppText>
      </View>
      <Card padded={false}>
        <View style={styles.cellWrap}>
          {cells.map((c, i) => (
            <View key={c.label} style={[styles.cell, i % 3 !== 2 && styles.cellBorderR, i < cells.length - (cells.length % 3 || 3) && styles.cellBorderB]}>
              <AppText variant="h2" style={{ fontVariant: ['tabular-nums'] }}>
                {c.value}
              </AppText>
              <AppText variant="caption" style={{ marginTop: 2 }}>
                {c.label}
              </AppText>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

function FormPill({ inn }: { inn: FormInnings }) {
  const bg =
    inn.runs >= 50 ? colors.goldMuted : inn.runs >= 30 ? colors.primaryMuted : inn.runs === 0 && !inn.notOut ? colors.wicketDark : colors.surface2;
  const fg = inn.runs >= 50 ? colors.gold : inn.runs >= 30 ? colors.primary : inn.runs === 0 && !inn.notOut ? colors.wicket : colors.text;
  return (
    <View style={[styles.formPill, { backgroundColor: bg, borderColor: bg }]}>
      <AppText variant="body" weight={fontWeight.bold} color={fg} style={{ fontVariant: ['tabular-nums'] }}>
        {inn.runs}
        {inn.notOut ? '*' : ''}
      </AppText>
    </View>
  );
}

function FormatTable({ rows }: { rows: { format: string; stats: PlayerCareerStats }[] }) {
  if (rows.length === 0) return <EmptyState icon="stats-chart-outline" title="No statistics yet" />;
  const metrics: { label: string; get: (s: PlayerCareerStats) => string | number }[] = [
    { label: 'Matches', get: (s) => s.matches },
    { label: 'Innings', get: (s) => s.battingInnings },
    { label: 'Runs', get: (s) => s.runs },
    { label: 'Highest', get: (s) => `${s.highestScore}${s.highestNotOut ? '*' : ''}` },
    { label: 'Average', get: (s) => s.average.toFixed(1) },
    { label: 'SR', get: (s) => s.strikeRate.toFixed(1) },
    { label: '50s', get: (s) => s.fifties },
    { label: '100s', get: (s) => s.hundreds },
    { label: 'Wickets', get: (s) => s.wickets },
    { label: 'Economy', get: (s) => (s.ballsBowled ? s.economy.toFixed(2) : '—') },
  ];
  return (
    <Card padded={false} style={{ marginTop: spacing.sm }}>
      <View style={[styles.tRow, styles.tHead]}>
        <AppText variant="overline" style={styles.tMetric}>
          Format
        </AppText>
        {rows.map((r) => (
          <AppText key={r.format} variant="caption" color={colors.primary} weight={fontWeight.bold} style={styles.tCol}>
            {r.format}
          </AppText>
        ))}
      </View>
      {metrics.map((m, idx) => (
        <View key={m.label} style={[styles.tRow, idx < metrics.length - 1 && styles.cellBorderB]}>
          <AppText variant="label" style={styles.tMetric}>
            {m.label}
          </AppText>
          {rows.map((r) => (
            <AppText key={r.format} variant="body" color={colors.textMuted} style={[styles.tCol, { fontVariant: ['tabular-nums'] }]}>
              {m.get(r.stats)}
            </AppText>
          ))}
        </View>
      ))}
    </Card>
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
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  hero: { alignItems: 'center', paddingTop: spacing.sm },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 4 },
  segBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm },
  segBtnOn: { backgroundColor: colors.surface3 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  cellWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '33.333%', paddingVertical: spacing.lg, alignItems: 'center' },
  cellBorderR: { borderRightWidth: 1, borderRightColor: colors.border },
  cellBorderB: { borderBottomWidth: 1, borderBottomColor: colors.border },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  formPill: { minWidth: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1 },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  tHead: { backgroundColor: colors.surface2 },
  tMetric: { flex: 1.4 },
  tCol: { flex: 1, textAlign: 'right' },
});
