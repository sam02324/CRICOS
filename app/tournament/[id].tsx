/**
 * Tournament detail — live points table with NRR, MVP leaderboard, fixtures /
 * results, "new match in this tournament", and crowning the champion.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Match } from '@/types/cricket';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  Ionicons,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { Header } from '@/components/Header';
import { MatchCard } from '@/components/MatchCard';
import { PlayerPicker, PickerOption } from '@/components/scoring/PlayerPicker';
import { useTournamentStore } from '@/store/tournamentStore';
import { loadMatches } from '@/utils/storage';
import { computeStandings, tournamentMatches } from '@/utils/competition';
import { aggregateMVP } from '@/utils/mvp';
import { formatOvers } from '@/utils/cricket';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getTournament, crown, deleteTournament, refresh } = useTournamentStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [crowning, setCrowning] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void loadMatches().then(setMatches);
    }, [refresh]),
  );

  const tournament = getTournament(id);

  const fixtures = useMemo(
    () => (tournament ? tournamentMatches(tournament, matches) : []),
    [tournament, matches],
  );
  const standings = useMemo(
    () => (tournament ? computeStandings(tournament, matches) : []),
    [tournament, matches],
  );
  const mvps = useMemo(
    () => (tournament ? aggregateMVP(fixtures.filter((m) => m.status === 'completed')).slice(0, 5) : []),
    [tournament, fixtures],
  );

  if (!tournament) {
    return (
      <Screen>
        <Header title="Tournament" />
        <View style={styles.center}>
          <AppText variant="title">Tournament not found</AppText>
        </View>
      </Screen>
    );
  }

  const completedCount = fixtures.filter((m) => m.status === 'completed').length;

  const championOptions: PickerOption[] = standings.map((r) => ({
    id: r.clubId ?? `name:${r.name}`,
    name: r.name,
    note: `${r.points} pts • NRR ${r.nrr >= 0 ? '+' : ''}${r.nrr.toFixed(2)}`,
  }));

  const doCrown = (optionId: string) => {
    setCrowning(false);
    const row = standings.find((r) => (r.clubId ?? `name:${r.name}`) === optionId);
    if (!row) return;
    const mvpName = mvps[0]?.name ?? null;
    void crown(tournament.id, row.name, row.clubId, mvpName);
  };

  return (
    <Screen>
      <Header title={tournament.name} subtitle={`${tournament.entries.length} teams • ${tournament.overs} ov`} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tournament.status === 'completed' ? (
          <Card style={[styles.champ, { borderColor: colors.warning }]}>
            <AppText style={{ fontSize: 44 }}>🏆</AppText>
            <AppText variant="h2" center weight={fontWeight.black} color={colors.warning}>
              {tournament.championName}
            </AppText>
            <AppText variant="label" center>
              Champions
            </AppText>
            {tournament.mvpName ? (
              <AppText variant="label" center color={colors.primary} style={{ marginTop: 4 }}>
                ⭐ MVP: {tournament.mvpName}
              </AppText>
            ) : null}
          </Card>
        ) : null}

        {/* Points table */}
        <SectionTitle>Points Table</SectionTitle>
        <Card padded={false}>
          <View style={[styles.tRow, styles.tHead]}>
            <AppText variant="caption" style={styles.cPos}>#</AppText>
            <AppText variant="caption" style={styles.cTeam}>TEAM</AppText>
            <AppText variant="caption" style={styles.cNum}>P</AppText>
            <AppText variant="caption" style={styles.cNum}>W</AppText>
            <AppText variant="caption" style={styles.cNum}>L</AppText>
            <AppText variant="caption" style={styles.cPts}>PTS</AppText>
            <AppText variant="caption" style={styles.cNrr}>NRR</AppText>
          </View>
          {standings.map((r, i) => (
            <View key={r.name} style={[styles.tRow, i < standings.length - 1 && styles.tBorder]}>
              <AppText variant="body" style={styles.cPos} color={i < 2 ? colors.primary : colors.textMuted} weight={fontWeight.bold}>
                {i + 1}
              </AppText>
              <AppText variant="body" style={styles.cTeam} weight={fontWeight.semibold} numberOfLines={1}>
                {r.name}
              </AppText>
              <AppText variant="body" style={styles.cNum} color={colors.textMuted}>{r.played}</AppText>
              <AppText variant="body" style={styles.cNum} color={colors.textMuted}>{r.won}</AppText>
              <AppText variant="body" style={styles.cNum} color={colors.textMuted}>{r.lost}</AppText>
              <AppText variant="mono" style={styles.cPts} color={colors.primary}>{r.points}</AppText>
              <AppText variant="caption" style={styles.cNrr} color={r.nrr >= 0 ? colors.primary : colors.wicket}>
                {r.nrr >= 0 ? '+' : ''}
                {r.nrr.toFixed(2)}
              </AppText>
            </View>
          ))}
        </Card>

        {/* MVP leaderboard */}
        {mvps.length > 0 ? (
          <View>
            <SectionTitle>MVP Leaderboard ⭐</SectionTitle>
            <Card style={{ gap: spacing.sm }}>
              {mvps.map((m, i) => (
                <View key={m.name} style={styles.mvpRow}>
                  <AppText variant="title" style={{ width: 28 }} color={i === 0 ? colors.warning : colors.textMuted}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </AppText>
                  <AppText variant="body" weight={fontWeight.semibold} style={{ flex: 1 }}>
                    {m.name}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted} style={{ marginRight: spacing.md }}>
                    {m.mvpAwards} MVP
                  </AppText>
                  <AppText variant="mono" color={colors.primary}>{m.points}</AppText>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {/* Fixtures */}
        <SectionTitle right={<AppText variant="caption">{completedCount}/{fixtures.length} done</AppText>}>
          Fixtures & Results
        </SectionTitle>
        {tournament.status !== 'completed' ? (
          <Button
            title="New match in this tournament"
            icon="add-circle"
            onPress={() => router.push(`/new-match?tournamentId=${tournament.id}`)}
          />
        ) : null}
        {fixtures.length === 0 ? (
          <EmptyState icon="calendar-outline" title="No matches yet" subtitle="Add a match to get the table going" />
        ) : (
          fixtures.map((m) =>
            m.status === 'completed' ? (
              <MatchCard key={m.id} match={m} onPress={() => router.push(`/scorecard/${m.id}`)} />
            ) : (
              <Pressable key={m.id} onPress={() => router.push(`/scoring/${m.id}`)}>
                <Card style={styles.liveFixture}>
                  <View style={styles.liveDot} />
                  <AppText variant="title" style={{ flex: 1 }} numberOfLines={1}>
                    {m.team1.name} vs {m.team2.name}
                  </AppText>
                  <AppText variant="caption" color={colors.primary}>
                    LIVE {formatOvers(m.innings[m.currentInningsIndex]?.legalBalls ?? 0)}
                  </AppText>
                </Card>
              </Pressable>
            ),
          )
        )}

        {/* Crown */}
        {tournament.status !== 'completed' ? (
          <Button
            title="Declare champion"
            icon="trophy"
            variant="secondary"
            disabled={completedCount === 0}
            onPress={() => setCrowning(true)}
            style={{ marginTop: spacing.md }}
          />
        ) : null}
        <Button
          title="Delete tournament"
          icon="trash-outline"
          variant="ghost"
          onPress={async () => {
            await deleteTournament(tournament.id);
            router.back();
          }}
        />
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <PlayerPicker
        visible={crowning}
        title="Declare champion"
        subtitle="Pick the winning team"
        options={championOptions}
        dismissable
        onClose={() => setCrowning(false)}
        onSelect={doCrown}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  champ: { alignItems: 'center', borderWidth: 1, gap: 2 },
  tRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tHead: { backgroundColor: colors.surface2 },
  tBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  cPos: { width: 24 },
  cTeam: { flex: 1, paddingRight: spacing.xs },
  cNum: { width: 26, textAlign: 'center' },
  cPts: { width: 34, textAlign: 'center' },
  cNrr: { width: 52, textAlign: 'right' },
  mvpRow: { flexDirection: 'row', alignItems: 'center' },
  liveFixture: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.primary },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
