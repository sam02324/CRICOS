/**
 * Practice Mode — solo batting drills against a self-set target. Tracks runs,
 * balls, strike rate, dot% and boundary%, and saves sessions for review.
 */
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
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
import { Header } from '@/components/Header';
import { practiceStats, usePracticeStore } from '@/store/practiceStore';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

export default function PracticeScreen() {
  const { active, sessions, refresh } = usePracticeStore();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <Screen>
      <Header title="Practice Mode" subtitle="Solo batting drills" showBack={!active} />
      {active ? <ActiveSession /> : <PracticeSetup sessions={sessions} />}
    </Screen>
  );
}

/* ------------------------------- setup ----------------------------------- */

function PracticeSetup({ sessions }: { sessions: ReturnType<typeof usePracticeStore.getState>['sessions'] }) {
  const start = usePracticeStore((s) => s.start);
  const deleteSession = usePracticeStore((s) => s.deleteSession);
  const [targetRuns, setTargetRuns] = useState(30);
  const [targetBalls, setTargetBalls] = useState(20);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Card style={{ gap: spacing.lg }}>
        <AppText variant="title" center>
          Set your challenge
        </AppText>
        <NumberRow label="Target runs" value={targetRuns} step={5} min={5} onChange={setTargetRuns} />
        <NumberRow label="In balls" value={targetBalls} step={6} min={6} onChange={setTargetBalls} />
        <AppText variant="label" center color={colors.primary}>
          Score {targetRuns} off {targetBalls} balls • required SR{' '}
          {((targetRuns / targetBalls) * 100).toFixed(0)}
        </AppText>
        <Button title="Start Session" icon="play" size="lg" onPress={() => start(targetRuns, targetBalls)} />
      </Card>

      <SectionTitle>Past sessions</SectionTitle>
      {sessions.length === 0 ? (
        <EmptyState icon="fitness-outline" title="No sessions yet" subtitle="Your saved drills appear here" />
      ) : (
        sessions.map((s) => (
          <Pressable
            key={s.id}
            onLongPress={() =>
              Alert.alert('Delete session?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => void deleteSession(s.id) },
              ])
            }
          >
            <Card style={{ marginBottom: spacing.sm }}>
              <View style={styles.sessionTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <AppText variant="title" weight={fontWeight.bold} color={s.achieved ? colors.primary : colors.text}>
                    {s.runsScored}/{s.targetRuns}
                  </AppText>
                  {s.achieved ? <Ionicons name="checkmark-circle" size={16} color={colors.primary} /> : null}
                </View>
                <AppText variant="caption">{format(new Date(s.createdAt), 'dd MMM, HH:mm')}</AppText>
              </View>
              <AppText variant="label" color={colors.textMuted}>
                {s.ballsFaced} balls • SR {((s.runsScored / Math.max(1, s.ballsFaced)) * 100).toFixed(0)} • {s.fours}×4 {s.sixes}×6 • {s.wickets} out
              </AppText>
            </Card>
          </Pressable>
        ))
      )}
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

/* ------------------------------- active ---------------------------------- */

function ActiveSession() {
  const { balls, targetRuns, targetBalls } = usePracticeStore();
  const addBall = usePracticeStore((s) => s.addBall);
  const undo = usePracticeStore((s) => s.undo);
  const finishAndSave = usePracticeStore((s) => s.finishAndSave);
  const reset = usePracticeStore((s) => s.reset);

  const stats = practiceStats(balls);
  const ballsLeft = Math.max(0, targetBalls - stats.ballsFaced);
  const runsLeft = Math.max(0, targetRuns - stats.runs);
  const done = stats.ballsFaced >= targetBalls || stats.runs >= targetRuns;

  const tap = (runs: number, isWicket: boolean) => {
    if (isWicket) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else if (runs >= 4) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addBall(runs, isWicket);
  };

  const confirmFinish = () => {
    Alert.alert('Finish session?', 'Save this drill to your history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => reset() },
      { text: 'Save', onPress: () => void finishAndSave() },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Card style={{ alignItems: 'center' }}>
        <AppText variant="label">SCORE</AppText>
        <AppText variant="display" weight={fontWeight.black} color={colors.primary}>
          {stats.runs}
        </AppText>
        <AppText variant="title" color={colors.textMuted}>
          off {stats.ballsFaced} balls
        </AppText>
        {done ? (
          <View style={[styles.targetBadge, { backgroundColor: stats.runs >= targetRuns ? colors.primary : colors.wicket }]}>
            <AppText variant="title" color={colors.black} weight={fontWeight.bold}>
              {stats.runs >= targetRuns ? 'Target smashed' : 'Out of balls'}
            </AppText>
          </View>
        ) : (
          <AppText variant="label" color={colors.primary} style={{ marginTop: spacing.sm }}>
            Need {runsLeft} off {ballsLeft}
          </AppText>
        )}
      </Card>

      <View style={styles.statsGrid}>
        <StatBox label="Strike Rate" value={stats.strikeRate.toFixed(0)} accent={colors.six} />
        <StatBox label="Dot %" value={`${stats.dotPct.toFixed(0)}%`} accent={colors.warning} />
        <StatBox label="Boundary %" value={`${stats.boundaryPct.toFixed(0)}%`} accent={colors.four} />
      </View>

      {/* Ball-by-ball strip */}
      <Card>
        <AppText variant="label" style={{ marginBottom: spacing.sm }}>
          Balls
        </AppText>
        <View style={styles.ballStrip}>
          {balls.length === 0 ? (
            <AppText variant="caption" color={colors.textFaint}>
              No balls yet — start hitting
            </AppText>
          ) : (
            balls.map((b, i) => (
              <View
                key={i}
                style={[
                  styles.ballDot,
                  {
                    backgroundColor: b.isWicket
                      ? colors.wicket
                      : b.runs === 6
                        ? colors.six
                        : b.runs === 4
                          ? colors.four
                          : b.runs === 0
                            ? colors.surface3
                            : colors.surface2,
                  },
                ]}
              >
                <AppText variant="caption" weight={fontWeight.bold} color={b.isWicket || b.runs >= 4 ? colors.white : colors.text}>
                  {b.isWicket ? 'W' : b.runs === 0 ? '•' : b.runs}
                </AppText>
              </View>
            ))
          )}
        </View>
      </Card>

      {/* Buttons */}
      <View style={styles.pad}>
        <View style={styles.runRow}>
          {[0, 1, 2, 3].map((n) => (
            <PracticeButton key={n} label={`${n}`} onPress={() => tap(n, false)} />
          ))}
        </View>
        <View style={styles.runRow}>
          <PracticeButton label="4" color={colors.four} onPress={() => tap(4, false)} />
          <PracticeButton label="6" color={colors.six} onPress={() => tap(6, false)} />
          <PracticeButton label="W" color={colors.wicket} onPress={() => tap(0, true)} />
        </View>
        <View style={styles.runRow}>
          <Button title="Undo" icon="arrow-undo" variant="secondary" disabled={balls.length === 0} onPress={undo} style={{ flex: 1 }} />
          <Button title="Finish" icon="flag" disabled={balls.length === 0} onPress={confirmFinish} style={{ flex: 1 }} />
        </View>
      </View>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

/* ------------------------------- pieces ---------------------------------- */

function NumberRow({
  label,
  value,
  step,
  min,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.numberRow}>
      <AppText variant="title" weight={fontWeight.semibold}>
        {label}
      </AppText>
      <View style={styles.numberControls}>
        <Pressable onPress={() => onChange(Math.max(min, value - step))} style={styles.numBtn}>
          <Ionicons name="remove" size={22} color={colors.text} />
        </Pressable>
        <AppText variant="h2" style={{ width: 56, textAlign: 'center' }}>
          {value}
        </AppText>
        <Pressable onPress={() => onChange(value + step)} style={styles.numBtn}>
          <Ionicons name="add" size={22} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function PracticeButton({ label, onPress, color }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.practiceBtn, { backgroundColor: color ?? colors.surface2, opacity: pressed ? 0.8 : 1 }]}
    >
      <AppText variant="h1" weight={fontWeight.black} color={color ? colors.black : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  targetBadge: { marginTop: spacing.md, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  statsGrid: { flexDirection: 'row', gap: spacing.md },
  ballStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  ballDot: { minWidth: 30, height: 30, borderRadius: 15, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  pad: { gap: spacing.sm },
  runRow: { flexDirection: 'row', gap: spacing.sm },
  numberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  numberControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  numBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  practiceBtn: { flex: 1, height: 72, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
