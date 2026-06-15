/**
 * Spectate — follow a live match in real time via its 6-digit share code.
 * Subscribes to the Supabase Realtime channel `match:<code>` and renders a
 * read-only scoreboard that updates on every delivery the scorer makes.
 */
import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Match } from '@/types/cricket';
import { AppText, Button, Card, Field, Ionicons, Screen } from '@/components/ui';
import { Header } from '@/components/Header';
import { InningsTable } from '@/components/scorecard/InningsTable';
import { subscribeMatch } from '@/utils/realtime';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatOvers } from '@/utils/cricket';
import { chaseInfo, currentRunRate, formatRate } from '@/utils/calculations';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

export default function SpectateScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const initial = (params.code ?? '').toString().toUpperCase();
  const [code, setCode] = useState(initial === 'NEW' ? '' : initial);
  const [active, setActive] = useState(initial && initial !== 'NEW' ? initial : '');
  const [match, setMatch] = useState<Match | null>(null);
  const [status, setStatus] = useState<string>('idle');

  useEffect(() => {
    if (!active) return;
    setStatus('connecting');
    const unsub = subscribeMatch(active, setMatch, setStatus);
    return unsub;
  }, [active]);

  const connect = () => {
    const c = code.trim().toUpperCase();
    if (c.length >= 4) {
      setMatch(null);
      setActive(c);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <Screen>
        <Header title="Watch Live" onBack={() => router.back()} />
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textFaint} />
          <AppText variant="title" center style={{ marginTop: spacing.md }}>
            Live spectating needs Supabase
          </AppText>
          <AppText variant="label" center style={{ marginTop: spacing.xs }}>
            Configure EXPO_PUBLIC_SUPABASE_URL / ANON_KEY to enable real-time follow.
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Watch Live" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <Field
            label="Enter 6-digit match code"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            placeholder="e.g. 4K8Q2P"
          />
          <Button title={active ? 'Reconnect' : 'Watch'} icon="radio-outline" onPress={connect} style={{ marginTop: spacing.md }} />
        </Card>

        {active ? (
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: match ? colors.primary : status === 'SUBSCRIBED' || status === 'connecting' ? colors.warning : colors.wicket },
              ]}
            />
            <AppText variant="caption" color={colors.textMuted}>
              {match ? `Live · code ${active}` : `Waiting for scorer · ${status}`}
            </AppText>
          </View>
        ) : null}

        {match ? <SpectatorBoard match={match} /> : null}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function SpectatorBoard({ match }: { match: Match }) {
  const innings = match.innings[match.currentInningsIndex];
  if (!innings) {
    return (
      <Card style={{ alignItems: 'center' }}>
        <AppText variant="title">Match starting…</AppText>
      </Card>
    );
  }
  const crr = currentRunRate(innings);
  const chase = chaseInfo(innings);
  const striker = innings.batsmen.find((b) => b.playerId === innings.strikerId);
  const nonStriker = innings.batsmen.find((b) => b.playerId === innings.nonStrikerId);
  const bowler = innings.bowlers.find((b) => b.playerId === innings.currentBowlerId);

  return (
    <View style={{ gap: spacing.lg }}>
      {match.result ? (
        <Card style={{ alignItems: 'center', borderColor: colors.gold, borderWidth: 1 }}>
          <Ionicons name="trophy" size={24} color={colors.gold} />
          <AppText variant="h2" center weight={fontWeight.black} style={{ marginTop: spacing.xs }}>
            {match.result.text}
          </AppText>
        </Card>
      ) : null}

      <Card>
        <AppText variant="label">{innings.battingTeamName}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <AppText variant="display" weight={fontWeight.black}>
            {innings.totalRuns}/{innings.totalWickets}
          </AppText>
          <AppText variant="title" color={colors.textMuted} style={{ marginBottom: 10, marginLeft: 6 }}>
            ({formatOvers(innings.legalBalls)})
          </AppText>
        </View>
        <AppText variant="label" color={colors.primary}>
          CRR {formatRate(crr)}
        </AppText>
        {chase && chase.runsNeeded > 0 ? (
          <View style={styles.chaseBar}>
            <AppText variant="label" color={colors.black} weight={fontWeight.bold}>
              Need {chase.runsNeeded} off {chase.ballsRemaining} • RRR {formatRate(chase.requiredRunRate)}
            </AppText>
          </View>
        ) : null}

        <View style={styles.liveRow}>
          <AppText variant="body" weight={fontWeight.semibold}>
            {striker?.name ?? '—'}*
          </AppText>
          <AppText variant="mono">{striker ? `${striker.runs} (${striker.balls})` : ''}</AppText>
        </View>
        <View style={styles.liveRow}>
          <AppText variant="body" color={colors.textMuted}>
            {nonStriker?.name ?? '—'}
          </AppText>
          <AppText variant="mono" color={colors.textMuted}>
            {nonStriker ? `${nonStriker.runs} (${nonStriker.balls})` : ''}
          </AppText>
        </View>
        <View style={[styles.liveRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs }]}>
          <AppText variant="body" weight={fontWeight.semibold}>
            {bowler?.name ?? '—'}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {bowler ? `${formatOvers(bowler.legalBalls)}-${bowler.maidens}-${bowler.runs}-${bowler.wickets}` : ''}
          </AppText>
        </View>
      </Card>

      {match.innings.map((inn, i) => (
        <InningsTable key={i} innings={inn} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  chaseBar: { marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, alignItems: 'center' },
  liveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
});
