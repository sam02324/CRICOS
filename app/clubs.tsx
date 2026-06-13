/**
 * Clubs directory — create persistent teams with rosters, browse them, and
 * jump into a club's stats + honours page.
 */
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
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

const EMOJIS = ['🏏', '🦁', '🐅', '🦅', '⚡', '🔥', '👑', '🚀', '🐉', '⭐'];
const COLORS = ['#22C55E', '#3B82F6', '#A855F7', '#EF4444', '#F59E0B', '#EC4899', '#14B8A6', '#F97316'];

export default function ClubsScreen() {
  const router = useRouter();
  const { clubs, refresh, addClub } = useClubStore();
  const { tournaments, refresh: refreshTours } = useTournamentStore();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [ground, setGround] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [roster, setRoster] = useState('');

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshTours();
    }, [refresh, refreshTours]),
  );

  const titlesFor = (clubId: string) => tournaments.filter((t) => t.championClubId === clubId).length;

  const create = async () => {
    if (!name.trim()) return;
    await addClub({
      name,
      shortName,
      emoji,
      color,
      homeGround: ground,
      foundedYear: null,
      memberNames: roster.split(/\n|,/).map((s) => s.trim()).filter(Boolean),
    });
    setName('');
    setShortName('');
    setGround('');
    setRoster('');
    setEmoji(EMOJIS[0]);
    setColor(COLORS[0]);
    setCreating(false);
  };

  return (
    <Screen>
      <Header
        title="Clubs"
        subtitle={`${clubs.length} clubs`}
        right={
          <Pressable onPress={() => setCreating((c) => !c)} hitSlop={10} style={styles.addBtn}>
            <Ionicons name={creating ? 'close' : 'add'} size={22} color={colors.black} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {creating ? (
          <Card style={{ gap: spacing.md }}>
            <AppText variant="title">New Club</AppText>
            <Field label="Club name" value={name} onChangeText={setName} placeholder="Royal Strikers" />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Field label="Short tag" value={shortName} onChangeText={setShortName} placeholder="RST" autoCapitalize="characters" maxLength={4} />
              </View>
              <View style={{ flex: 2 }}>
                <Field label="Home ground" value={ground} onChangeText={setGround} placeholder="Colony Ground" />
              </View>
            </View>
            <AppText variant="label">Crest</AppText>
            <View style={styles.wrap}>
              {EMOJIS.map((e) => (
                <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emojiBtn, emoji === e && { borderColor: colors.primary, backgroundColor: colors.surface3 }]}>
                  <AppText style={{ fontSize: 22 }}>{e}</AppText>
                </Pressable>
              ))}
            </View>
            <AppText variant="label">Colour</AppText>
            <View style={styles.wrap}>
              {COLORS.map((c) => (
                <Pressable key={c} onPress={() => setColor(c)} style={[styles.colorBtn, { backgroundColor: c }, color === c && styles.colorBtnOn]} />
              ))}
            </View>
            <Field
              label="Roster (one player per line)"
              value={roster}
              onChangeText={setRoster}
              placeholder={'Rahul\nVirat\nRavi'}
              multiline
              style={{ minHeight: 96, textAlignVertical: 'top' }}
            />
            <Button title="Create Club" icon="shield-checkmark" onPress={create} />
          </Card>
        ) : null}

        <SectionTitle>All clubs</SectionTitle>
        {clubs.length === 0 ? (
          <EmptyState icon="shield-outline" title="No clubs yet" subtitle="Create a club to track its squad, stats and honours" />
        ) : (
          clubs.map((c) => (
            <Pressable key={c.id} onPress={() => router.push(`/club/${c.id}`)} style={({ pressed }) => [styles.clubRow, pressed && { opacity: 0.85 }]}>
              <View style={[styles.crest, { backgroundColor: c.color }]}>
                <AppText style={{ fontSize: 24 }}>{c.emoji}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="title" weight={fontWeight.bold}>
                  {c.name}
                </AppText>
                <AppText variant="caption">
                  {c.shortName} • {c.members.length} players{titlesFor(c.id) > 0 ? ` • ${titlesFor(c.id)} 🏆` : ''}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
            </Pressable>
          ))
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emojiBtn: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderWidth: 2, borderColor: colors.border },
  colorBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
  colorBtnOn: { borderColor: colors.white },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  crest: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
