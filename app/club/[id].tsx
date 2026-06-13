/**
 * Club detail — career record, top performers, honours, editable roster, and
 * the club's recent matches.
 */
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Match } from '@/types/cricket';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  Field,
  Ionicons,
  Screen,
  SectionTitle,
  StatBox,
} from '@/components/ui';
import { Header } from '@/components/Header';
import { MatchCard } from '@/components/MatchCard';
import { useClubStore } from '@/store/clubStore';
import { useTournamentStore } from '@/store/tournamentStore';
import { loadMatches } from '@/utils/storage';
import { clubSide, computeClubStats } from '@/utils/competition';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getClub, addMember, removeMember, deleteClub, refresh } = useClubStore();
  const { tournaments, refresh: refreshTours } = useTournamentStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [newMember, setNewMember] = useState('');

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshTours();
      void loadMatches().then((all) => setMatches(all.filter((m) => m.status === 'completed')));
    }, [refresh, refreshTours]),
  );

  const club = getClub(id);
  const stats = useMemo(
    () => (club ? computeClubStats(club, matches, tournaments) : null),
    [club, matches, tournaments],
  );
  const clubMatches = useMemo(
    () => (club ? matches.filter((m) => clubSide(m, club.id) != null) : []),
    [club, matches],
  );
  const titles = useMemo(
    () => (club ? tournaments.filter((t) => t.championClubId === club.id) : []),
    [club, tournaments],
  );

  if (!club || !stats) {
    return (
      <Screen>
        <Header title="Club" />
        <View style={styles.center}>
          <AppText variant="title">Club not found</AppText>
        </View>
      </Screen>
    );
  }

  const confirmDelete = () =>
    Alert.alert('Delete club?', `${club.name} will be removed. Match history is kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteClub(club.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Header title={club.name} subtitle={`${club.shortName}${club.homeGround ? ` • ${club.homeGround}` : ''}`} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card style={[styles.banner, { borderColor: club.color }]}>
          <View style={[styles.crest, { backgroundColor: club.color }]}>
            <AppText style={{ fontSize: 34 }}>{club.emoji}</AppText>
          </View>
          <View style={styles.bannerStats}>
            <Mini label="Played" value={stats.played} />
            <Mini label="Won" value={stats.won} accent={colors.primary} />
            <Mini label="Win %" value={`${stats.winPct.toFixed(0)}%`} accent={colors.four} />
            <Mini label="Titles" value={stats.titles} accent={colors.warning} />
          </View>
        </Card>

        <View style={styles.grid}>
          <StatBox label="Runs scored" value={stats.runsScored} accent={colors.primary} />
          <StatBox label="Conceded" value={stats.runsConceded} accent={colors.wicket} />
          <StatBox label="Highest" value={stats.highestTotal} accent={colors.six} />
        </View>

        <Card style={{ gap: spacing.sm }}>
          <Row label="🏏 Top scorer" value={stats.topScorerName ? `${stats.topScorerName} — ${stats.topScorerRuns}` : '—'} />
          <View style={styles.thin} />
          <Row label="🎯 Top wicket-taker" value={stats.topWicketName ? `${stats.topWicketName} — ${stats.topWickets}` : '—'} />
        </Card>

        {titles.length > 0 ? (
          <View>
            <SectionTitle>Honours 🏆</SectionTitle>
            {titles.map((t) => (
              <Card key={t.id} style={{ marginBottom: spacing.sm }}>
                <AppText variant="title" weight={fontWeight.bold} color={colors.warning}>
                  {t.emoji} {t.name}
                </AppText>
                {t.mvpName ? <AppText variant="caption">Tournament MVP: {t.mvpName}</AppText> : null}
              </Card>
            ))}
          </View>
        ) : null}

        <SectionTitle right={<AppText variant="caption">{club.members.length}</AppText>}>Squad</SectionTitle>
        <Card style={{ gap: spacing.xs }}>
          {club.members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <Pressable style={{ flex: 1 }} onPress={() => router.push(`/player/${encodeURIComponent(m.name)}`)}>
                <AppText variant="body" weight={fontWeight.semibold}>
                  {m.name}
                </AppText>
              </Pressable>
              <Pressable onPress={() => void removeMember(club.id, m.id)} hitSlop={8}>
                <Ionicons name="remove-circle-outline" size={22} color={colors.textFaint} />
              </Pressable>
            </View>
          ))}
          {club.members.length === 0 ? <AppText variant="caption">No players yet.</AppText> : null}
          <View style={styles.addMember}>
            <View style={{ flex: 1 }}>
              <Field value={newMember} onChangeText={setNewMember} placeholder="Add player…" />
            </View>
            <Button
              title="Add"
              size="sm"
              fullWidth={false}
              onPress={async () => {
                await addMember(club.id, newMember);
                setNewMember('');
              }}
              style={{ paddingHorizontal: spacing.lg }}
            />
          </View>
        </Card>

        <SectionTitle>Recent matches</SectionTitle>
        {clubMatches.length === 0 ? (
          <EmptyState icon="calendar-outline" title="No matches yet" subtitle="Start a match with this club to build its record" />
        ) : (
          clubMatches.slice(0, 8).map((m) => <MatchCard key={m.id} match={m} onPress={() => router.push(`/scorecard/${m.id}`)} />)
        )}

        <Button title="Delete club" icon="trash-outline" variant="ghost" onPress={confirmDelete} />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function Mini({ label, value, accent = colors.text }: { label: string; value: string | number; accent?: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <AppText variant="h2" color={accent}>
        {value}
      </AppText>
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="body" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="body" weight={fontWeight.semibold}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, borderWidth: 1 },
  crest: { width: 64, height: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  bannerStats: { flex: 1, flexDirection: 'row' },
  grid: { flexDirection: 'row', gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  thin: { height: 1, backgroundColor: colors.border },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  addMember: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
});
