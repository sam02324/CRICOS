/**
 * New Match setup. Pick a format preset (pre-fills overs / players / rules),
 * name the teams, set the toss, tweak rules — then start scoring in seconds.
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BallType,
  MatchFormat,
  MatchRules,
  Player,
  Team,
} from '@/types/cricket';
import { TournamentEntry } from '@/types/clubs';
import {
  AppText,
  Button,
  Card,
  Chip,
  Field,
  Ionicons,
  Screen,
  SectionTitle,
  ToggleRow,
} from '@/components/ui';
import { Header } from '@/components/Header';
import {
  BALL_TYPES,
  DEFAULT_RULES,
  FORMAT_PRESETS,
  OVERS_OPTIONS,
  RULE_TOGGLES,
} from '@/constants/formats';
import { useMatchStore } from '@/store/matchStore';
import { useHistoryStore } from '@/store/historyStore';
import { useClubStore } from '@/store/clubStore';
import { useTournamentStore } from '@/store/tournamentStore';
import { uid } from '@/utils/cricket';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

export default function NewMatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tournamentId?: string }>();
  const startMatch = useMatchStore((s) => s.startMatch);
  const { templates, addTemplate } = useHistoryStore();
  const { clubs, getClub, refresh: refreshClubs } = useClubStore();
  const { getTournament, refresh: refreshTours } = useTournamentStore();

  const [format, setFormat] = useState<MatchFormat>('T20');
  const [overs, setOvers] = useState(20);
  const [playersPerSide, setPlayersPerSide] = useState(11);
  const [ballType, setBallType] = useState<BallType>('leather');
  const [rules, setRules] = useState<MatchRules>({ ...DEFAULT_RULES, lbw: true });

  const [team1Name, setTeam1Name] = useState('Team A');
  const [team2Name, setTeam2Name] = useState('Team B');
  const [team1Players, setTeam1Players] = useState<string[]>(defaultNames(11));
  const [team2Players, setTeam2Players] = useState<string[]>(defaultNames(11));
  const [editPlayers, setEditPlayers] = useState(false);
  const [venue, setVenue] = useState('');

  const [tossWinner, setTossWinner] = useState<1 | 2>(1);
  const [tossChoice, setTossChoice] = useState<'bat' | 'bowl'>('bat');

  const [team1ClubId, setTeam1ClubId] = useState<string | null>(null);
  const [team2ClubId, setTeam2ClubId] = useState<string | null>(null);

  const tournamentId = typeof params.tournamentId === 'string' ? params.tournamentId : null;
  const tournament = getTournament(tournamentId);

  useEffect(() => {
    void refreshClubs();
    void refreshTours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tournament) setOvers(tournament.overs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament?.id]);

  const applyClub = (side: 1 | 2, clubId: string | null) => {
    if (clubId == null) {
      if (side === 1) setTeam1ClubId(null);
      else setTeam2ClubId(null);
      return;
    }
    const club = getClub(clubId);
    if (!club) return;
    const names = club.members.map((m) => m.name);
    if (names.length >= 2) {
      const pps = Math.max(2, Math.min(11, names.length));
      setPlayersPerSide(pps);
      if (side === 1) {
        setTeam1Name(club.name);
        setTeam1Players(resize(names, pps));
        setTeam2Players((prev) => resize(prev, pps));
        setTeam1ClubId(clubId);
      } else {
        setTeam2Name(club.name);
        setTeam2Players(resize(names, pps));
        setTeam1Players((prev) => resize(prev, pps));
        setTeam2ClubId(clubId);
      }
    } else if (side === 1) {
      setTeam1Name(club.name);
      setTeam1ClubId(clubId);
    } else {
      setTeam2Name(club.name);
      setTeam2ClubId(clubId);
    }
  };

  const applyEntry = (side: 1 | 2, entry: TournamentEntry) => {
    if (entry.clubId) {
      applyClub(side, entry.clubId);
    } else if (side === 1) {
      setTeam1Name(entry.name);
      setTeam1ClubId(null);
    } else {
      setTeam2Name(entry.name);
      setTeam2ClubId(null);
    }
  };

  const applyPreset = (f: MatchFormat) => {
    const preset = FORMAT_PRESETS.find((p) => p.format === f);
    if (!preset) return;
    setFormat(f);
    setOvers(preset.overs);
    setPlayersPerSide(preset.playersPerSide);
    setRules({ ...DEFAULT_RULES, ...preset.rules });
    if (preset.rules.ballType) setBallType(preset.rules.ballType);
    setTeam1Players((prev) => resize(prev, preset.playersPerSide));
    setTeam2Players((prev) => resize(prev, preset.playersPerSide));
  };

  const setPlayers = (n: number) => {
    const clamped = Math.max(2, Math.min(11, n));
    setPlayersPerSide(clamped);
    setTeam1Players((prev) => resize(prev, clamped));
    setTeam2Players((prev) => resize(prev, clamped));
  };

  const toggleRule = (key: keyof Omit<MatchRules, 'ballType'>) =>
    setRules((r) => ({ ...r, [key]: !r[key] }));

  const buildTeams = (): { team1: Team; team2: Team } => {
    const mk = (names: string[], label: string): Player[] =>
      names.slice(0, playersPerSide).map((name, i) => ({
        id: uid('pl_'),
        name: name.trim() || `${label} ${i + 1}`,
      }));
    return {
      team1: { name: team1Name.trim() || 'Team A', players: mk(team1Players, 'Player') },
      team2: { name: team2Name.trim() || 'Team B', players: mk(team2Players, 'Player') },
    };
  };

  const onStart = () => {
    if (overs < 1) {
      Alert.alert('Set overs', 'Choose at least 1 over.');
      return;
    }
    const { team1, team2 } = buildTeams();
    const id = startMatch({
      format,
      totalOvers: overs,
      playersPerSide,
      venue: venue.trim(),
      team1,
      team2,
      toss: { winnerTeam: tossWinner, choice: tossChoice },
      rules: { ...rules, ballType },
      team1ClubId,
      team2ClubId,
      tournamentId,
    });
    router.replace(`/scoring/${id}`);
  };

  const onSaveTemplate = () => {
    void addTemplate({ name: `${format} • ${overs} ov`, format, totalOvers: overs, playersPerSide, rules: { ...rules, ballType } });
    Alert.alert('Saved', 'Template saved. One tap to reuse next time.');
  };

  const tossText = useMemo(() => {
    const winner = tossWinner === 1 ? team1Name : team2Name;
    const batting =
      tossChoice === 'bat'
        ? winner
        : tossWinner === 1
          ? team2Name
          : team1Name;
    return `${winner} won the toss & chose to ${tossChoice}. ${batting} bat first.`;
  }, [tossWinner, tossChoice, team1Name, team2Name]);

  return (
    <Screen>
      <Header title="New Match" subtitle="Set it up in seconds" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {tournament ? (
          <Card variant="surface" style={styles.tourBanner}>
            <AppText style={{ fontSize: 26 }}>{tournament.emoji}</AppText>
            <View style={{ flex: 1 }}>
              <AppText variant="label" color={colors.primary} weight={fontWeight.bold}>
                TOURNAMENT MATCH
              </AppText>
              <AppText variant="title" numberOfLines={1}>
                {tournament.name}
              </AppText>
            </View>
          </Card>
        ) : null}

        {templates.length > 0 ? (
          <View>
            <SectionTitle>Templates</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {templates.map((t) => (
                <Chip
                  key={t.id}
                  label={t.name}
                  emoji="⭐"
                  onPress={() => {
                    setFormat(t.format);
                    setOvers(t.totalOvers);
                    setPlayers(t.playersPerSide);
                    setRules(t.rules);
                    setBallType(t.rules.ballType);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View>
          <SectionTitle>Format</SectionTitle>
          <View style={styles.wrap}>
            {FORMAT_PRESETS.map((p) => (
              <Chip
                key={p.format}
                label={p.label}
                emoji={p.emoji}
                selected={format === p.format}
                onPress={() => applyPreset(p.format)}
              />
            ))}
          </View>
        </View>

        {tournament ? (
          <View>
            <SectionTitle>Pick the two teams</SectionTitle>
            <Card style={{ gap: spacing.md }}>
              <AppText variant="label">Team 1</AppText>
              <View style={styles.wrap}>
                {tournament.entries.map((e) => (
                  <Chip
                    key={`t1-${e.name}`}
                    label={e.name}
                    selected={team1Name === e.name}
                    onPress={() => applyEntry(1, e)}
                  />
                ))}
              </View>
              <AppText variant="label">Team 2</AppText>
              <View style={styles.wrap}>
                {tournament.entries.map((e) => (
                  <Chip
                    key={`t2-${e.name}`}
                    label={e.name}
                    selected={team2Name === e.name}
                    onPress={() => applyEntry(2, e)}
                  />
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        <View>
          <SectionTitle>Teams</SectionTitle>
          <Card style={{ gap: spacing.md }}>
            <Field label="Team 1" value={team1Name} onChangeText={setTeam1Name} placeholder="Team A" />
            <Field label="Team 2" value={team2Name} onChangeText={setTeam2Name} placeholder="Team B" />
            <Field label="Venue (optional)" value={venue} onChangeText={setVenue} placeholder="e.g. Colony Ground" />
          </Card>
        </View>

        {!tournament && clubs.length > 0 ? (
          <View>
            <SectionTitle>Use a club (optional)</SectionTitle>
            <Card style={{ gap: spacing.md }}>
              <AppText variant="label">Team 1 club</AppText>
              <View style={styles.wrap}>
                <Chip label="None" selected={team1ClubId == null} onPress={() => applyClub(1, null)} />
                {clubs.map((c) => (
                  <Chip key={`c1-${c.id}`} label={c.name} emoji={c.emoji} selected={team1ClubId === c.id} onPress={() => applyClub(1, c.id)} />
                ))}
              </View>
              <AppText variant="label">Team 2 club</AppText>
              <View style={styles.wrap}>
                <Chip label="None" selected={team2ClubId == null} onPress={() => applyClub(2, null)} />
                {clubs.map((c) => (
                  <Chip key={`c2-${c.id}`} label={c.name} emoji={c.emoji} selected={team2ClubId === c.id} onPress={() => applyClub(2, c.id)} />
                ))}
              </View>
              <AppText variant="caption">Picking a club fills the team name and squad from its roster.</AppText>
            </Card>
          </View>
        ) : null}

        <View>
          <SectionTitle>Players per side</SectionTitle>
          <Stepper value={playersPerSide} min={2} max={11} onChange={setPlayers} />
          <Pressable onPress={() => setEditPlayers((e) => !e)} style={styles.editToggle}>
            <Ionicons name={editPlayers ? 'chevron-up' : 'create-outline'} size={16} color={colors.primary} />
            <AppText variant="label" color={colors.primary}>
              {editPlayers ? 'Hide player names' : 'Edit player names (optional)'}
            </AppText>
          </Pressable>
          {editPlayers ? (
            <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
              <PlayerNames title={team1Name} names={team1Players} onChange={setTeam1Players} />
              <PlayerNames title={team2Name} names={team2Players} onChange={setTeam2Players} />
            </View>
          ) : null}
        </View>

        <View>
          <SectionTitle>Overs</SectionTitle>
          <View style={styles.wrap}>
            {OVERS_OPTIONS.map((o) => (
              <Chip key={o} label={`${o}`} selected={overs === o} onPress={() => setOvers(o)} />
            ))}
          </View>
        </View>

        <View>
          <SectionTitle>Ball type</SectionTitle>
          <View style={styles.wrap}>
            {BALL_TYPES.map((b) => (
              <Chip
                key={b.value}
                label={b.label}
                emoji={b.emoji}
                selected={ballType === b.value}
                onPress={() => setBallType(b.value)}
              />
            ))}
          </View>
        </View>

        <View>
          <SectionTitle>Toss</SectionTitle>
          <Card style={{ gap: spacing.md }}>
            <AppText variant="label">Won by</AppText>
            <View style={styles.wrap}>
              <Chip label={team1Name} selected={tossWinner === 1} onPress={() => setTossWinner(1)} />
              <Chip label={team2Name} selected={tossWinner === 2} onPress={() => setTossWinner(2)} />
            </View>
            <AppText variant="label">Elected to</AppText>
            <View style={styles.wrap}>
              <Chip label="🏏 Bat" selected={tossChoice === 'bat'} onPress={() => setTossChoice('bat')} />
              <Chip label="⚾ Bowl" selected={tossChoice === 'bowl'} onPress={() => setTossChoice('bowl')} />
            </View>
            <AppText variant="caption" color={colors.primary}>
              {tossText}
            </AppText>
          </Card>
        </View>

        <View>
          <SectionTitle>Rules</SectionTitle>
          <Card>
            {RULE_TOGGLES.map((r, i) => (
              <View key={r.key}>
                <ToggleRow
                  label={r.label}
                  help={r.help}
                  value={rules[r.key]}
                  onToggle={() => toggleRule(r.key)}
                />
                {i < RULE_TOGGLES.length - 1 ? <View style={styles.ruleDivider} /> : null}
              </View>
            ))}
          </Card>
        </View>

        <Button title="Start Match" icon="play" size="lg" onPress={onStart} />
        <Button title="Save as Template" icon="bookmark-outline" variant="ghost" onPress={onSaveTemplate} />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function defaultNames(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `Player ${i + 1}`);
}

function resize(prev: string[], n: number): string[] {
  if (prev.length === n) return prev;
  if (prev.length > n) return prev.slice(0, n);
  return [...prev, ...defaultNames(n).slice(prev.length)];
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(value - 1)} disabled={value <= min} style={styles.stepBtn}>
        <Ionicons name="remove" size={24} color={value <= min ? colors.textFaint : colors.text} />
      </Pressable>
      <View style={{ alignItems: 'center' }}>
        <AppText variant="h1">{value}</AppText>
        <AppText variant="caption">players</AppText>
      </View>
      <Pressable onPress={() => onChange(value + 1)} disabled={value >= max} style={styles.stepBtn}>
        <Ionicons name="add" size={24} color={value >= max ? colors.textFaint : colors.text} />
      </Pressable>
    </View>
  );
}

function PlayerNames({
  title,
  names,
  onChange,
}: {
  title: string;
  names: string[];
  onChange: (n: string[]) => void;
}) {
  return (
    <Card variant="surface2" style={{ gap: spacing.sm }}>
      <AppText variant="label" color={colors.primary} weight={fontWeight.bold}>
        {title}
      </AppText>
      {names.map((name, i) => (
        <Field
          key={i}
          value={name}
          onChangeText={(t) => {
            const next = [...names];
            next[i] = t;
            onChange(next);
          }}
          placeholder={`Player ${i + 1}`}
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xl },
  tourBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.primary },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  editToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleDivider: { height: 1, backgroundColor: colors.border, marginLeft: 0 },
});
