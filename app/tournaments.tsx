/**
 * Tournaments directory — create a league / knockout from clubs (or plain team
 * names), then open it to score fixtures and watch the table.
 */
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { TournamentEntry, TournamentFormat } from '@/types/clubs';
import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Ionicons,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { Header } from '@/components/Header';
import { useClubStore } from '@/store/clubStore';
import { useTournamentStore } from '@/store/tournamentStore';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

const FORMATS: { value: TournamentFormat; label: string }[] = [
  { value: 'league', label: 'League' },
  { value: 'knockout', label: 'Knockout' },
  { value: 'league-playoffs', label: 'League + Playoffs' },
];
const OVERS = [5, 6, 8, 10, 12, 15, 20];

export default function TournamentsScreen() {
  const router = useRouter();
  const { tournaments, refresh, addTournament } = useTournamentStore();
  const { clubs, refresh: refreshClubs } = useClubStore();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('league');
  const [overs, setOvers] = useState(10);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const [otherTeams, setOtherTeams] = useState('');

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshClubs();
    }, [refresh, refreshClubs]),
  );

  const toggleClub = (id: string) =>
    setSelectedClubs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const create = async () => {
    const entries: TournamentEntry[] = [];
    for (const id of selectedClubs) {
      const c = clubs.find((x) => x.id === id);
      if (c) entries.push({ clubId: c.id, name: c.name });
    }
    for (const n of otherTeams.split(/\n|,/).map((s) => s.trim()).filter(Boolean)) {
      entries.push({ clubId: null, name: n });
    }
    if (!name.trim() || entries.length < 2) return;
    const t = await addTournament({ name, emoji: '', format, overs, entries });
    setCreating(false);
    setName('');
    setSelectedClubs([]);
    setOtherTeams('');
    router.push(`/tournament/${t.id}`);
  };

  const canCreate = name.trim().length > 0 && selectedClubs.length + otherTeams.split(/\n|,/).filter((s) => s.trim()).length >= 2;

  return (
    <Screen>
      <Header
        title="Tournaments"
        subtitle={`${tournaments.length} tournaments`}
        right={
          <Pressable onPress={() => setCreating((c) => !c)} hitSlop={10} style={styles.addBtn}>
            <Ionicons name={creating ? 'close' : 'add'} size={22} color={colors.black} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {creating ? (
          <Card style={{ gap: spacing.md }}>
            <AppText variant="title">New Tournament</AppText>
            <Field label="Name" value={name} onChangeText={setName} placeholder="Colony Premier League" />
            <AppText variant="label">Format</AppText>
            <View style={styles.wrap}>
              {FORMATS.map((f) => (
                <Chip key={f.value} label={f.label} selected={format === f.value} onPress={() => setFormat(f.value)} />
              ))}
            </View>
            <AppText variant="label">Overs per match</AppText>
            <View style={styles.wrap}>
              {OVERS.map((o) => (
                <Chip key={o} label={`${o}`} selected={overs === o} onPress={() => setOvers(o)} />
              ))}
            </View>
            <AppText variant="label">Teams from clubs</AppText>
            {clubs.length === 0 ? (
              <AppText variant="caption">No clubs yet — add plain team names below, or create clubs first.</AppText>
            ) : (
              <View style={styles.wrap}>
                {clubs.map((c) => (
                  <Chip key={c.id} label={c.name} selected={selectedClubs.includes(c.id)} onPress={() => toggleClub(c.id)} />
                ))}
              </View>
            )}
            <Field
              label="Other teams (one per line)"
              value={otherTeams}
              onChangeText={setOtherTeams}
              placeholder={'Strikers\nWarriors'}
              multiline
              style={{ minHeight: 72, textAlignVertical: 'top' }}
            />
            <Button title="Create Tournament" icon="trophy" disabled={!canCreate} onPress={create} />
          </Card>
        ) : null}

        <SectionTitle>All tournaments</SectionTitle>
        {tournaments.length === 0 ? (
          <EmptyState icon="trophy-outline" title="No tournaments yet" subtitle="Group matches into a league or knockout with a live points table" />
        ) : (
          tournaments.map((t) => (
            <Pressable key={t.id} onPress={() => router.push(`/tournament/${t.id}`)} style={({ pressed }) => [styles.tourRow, pressed && { opacity: 0.85 }]}>
              <View style={styles.tourIcon}>
                <Ionicons name="trophy-outline" size={20} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="title" weight={fontWeight.bold} numberOfLines={1}>
                  {t.name}
                </AppText>
                <AppText variant="caption">
                  {t.entries.length} teams · {t.overs} ov · {labelFormat(t.format)}
                </AppText>
              </View>
              {t.status === 'completed' ? (
                <View style={styles.champBadge}>
                  <AppText variant="caption" color={colors.black} weight={fontWeight.bold} numberOfLines={1}>
                    {t.championName}
                  </AppText>
                </View>
              ) : (
                <View style={styles.liveBadge}>
                  <AppText variant="caption" color={colors.primary} weight={fontWeight.bold}>
                    LIVE
                  </AppText>
                </View>
              )}
            </Pressable>
          ))
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function labelFormat(f: TournamentFormat): string {
  return f === 'league' ? 'League' : f === 'knockout' ? 'Knockout' : 'League + Playoffs';
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  tourIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  champBadge: { backgroundColor: colors.gold, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, maxWidth: 110 },
  liveBadge: { backgroundColor: colors.primaryGlow, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
});
