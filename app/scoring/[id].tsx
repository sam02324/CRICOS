/**
 * Live Scoring — the core screen. Drives the whole delivery flow: openers,
 * quick scoring buttons + extras, the wicket modal, new batsman / bowler
 * pickers, the innings break, smart undo, haptics, voice commentary and the
 * boundary/wicket celebration overlay.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Ball, Innings, Match } from '@/types/cricket';
import {
  AppText,
  Button,
  Card,
  Ionicons,
  Screen,
} from '@/components/ui';
import { PlayerPicker, PickerOption } from '@/components/scoring/PlayerPicker';
import { WicketModal, WicketSubmit } from '@/components/scoring/WicketModal';
import { Celebration } from '@/components/scoring/Celebration';
import { useMatchStore } from '@/store/matchStore';
import { loadLiveMatch } from '@/utils/storage';
import { formatOvers } from '@/utils/cricket';
import {
  chaseInfo,
  currentPartnership,
  currentRunRate,
  economyRate,
  formatRate,
  projectedScore,
  strikeRate,
} from '@/utils/calculations';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

export default function ScoringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const match = useMatchStore((s) => s.match);
  const pendingExtra = useMatchStore((s) => s.pendingExtra);
  const inningsBreak = useMatchStore((s) => s.inningsBreak);
  const matchComplete = useMatchStore((s) => s.matchComplete);
  const celebration = useMatchStore((s) => s.celebration);
  const undoStack = useMatchStore((s) => s.undoStack);

  const store = useMatchStore.getState;
  const loadMatch = useMatchStore((s) => s.loadMatch);
  const clearCelebration = useMatchStore((s) => s.clearCelebration);

  const [voiceOn, setVoiceOn] = useState(false);

  // Resume a persisted live match if the store is cold (e.g. app relaunch).
  useEffect(() => {
    if (!match && id) {
      void loadLiveMatch().then((m) => {
        if (m && m.id === id) loadMatch(m);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const feedback = useCallback(() => {
    const st = store();
    const m = st.match;
    if (!m) return;
    const inn = m.innings[m.currentInningsIndex];
    const last = inn?.balls[inn.balls.length - 1];
    if (!last) return;
    if (last.isWicket) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else if (last.runs === 4 || last.runs === 6)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (voiceOn && last.commentary) Speech.speak(last.commentary, { rate: 1.05 });
  }, [store, voiceOn]);

  if (!match) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText variant="title">Loading match…</AppText>
          <Button title="Back to Home" variant="ghost" style={{ marginTop: spacing.lg }} onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  const innings = match.innings[match.currentInningsIndex];

  return (
    <Screen edges={['top', 'bottom']}>
      <Celebration data={celebration} onDone={clearCelebration} />

      <TopBar match={match} innings={innings} onMenu={() => openMenu(match, router)} />

      {matchComplete ? (
        <MatchCompleteView match={match} onScorecard={() => router.replace(`/scorecard/${match.id}`)} />
      ) : inningsBreak ? (
        <InningsBreakView match={match} />
      ) : (
        <LiveInnings match={match} innings={innings} pendingExtra={pendingExtra} feedback={feedback} undoDepth={undoStack.length} voiceOn={voiceOn} onToggleVoice={() => setVoiceOn((v) => !v)} />
      )}
    </Screen>
  );
}

function openMenu(match: Match, router: ReturnType<typeof useRouter>) {
  Alert.alert('Match menu', undefined, [
    { text: 'View scorecard', onPress: () => router.push(`/scorecard/${match.id}`) },
    {
      text: 'End innings now',
      onPress: () =>
        Alert.alert('End innings?', 'Force the current innings to end.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'End innings', style: 'destructive', onPress: () => useMatchStore.getState().forceEndInnings() },
        ]),
    },
    {
      text: 'Abandon match',
      style: 'destructive',
      onPress: () =>
        Alert.alert('Abandon match?', 'This live match will be discarded.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Abandon',
            style: 'destructive',
            onPress: () => {
              useMatchStore.getState().abandonMatch();
              router.replace('/');
            },
          },
        ]),
    },
    { text: 'Close', style: 'cancel' },
  ]);
}

/* ------------------------------- Top bar --------------------------------- */

function TopBar({ match, innings, onMenu }: { match: Match; innings: Innings; onMenu: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.topBar}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10} style={styles.topIcon}>
        <Ionicons name="home" size={20} color={colors.text} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <AppText variant="title" numberOfLines={1}>
          {match.team1.name} vs {match.team2.name}
        </AppText>
        <AppText variant="caption">
          {match.format} • {match.totalOvers} ov • Code {match.shareCode}
        </AppText>
      </View>
      <Pressable onPress={onMenu} hitSlop={10} style={styles.topIcon}>
        <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

/* --------------------------- Match complete ------------------------------ */

function MatchCompleteView({ match, onScorecard }: { match: Match; onScorecard: () => void }) {
  return (
    <View style={styles.center}>
      <AppText style={{ fontSize: 64 }}>🏆</AppText>
      <AppText variant="h1" center style={{ marginTop: spacing.md }}>
        {match.result?.text ?? 'Match complete'}
      </AppText>
      <Button title="View Scorecard & Share" icon="share-social" size="lg" style={{ marginTop: spacing.xl }} onPress={onScorecard} />
    </View>
  );
}

/* ---------------------------- Innings break ------------------------------ */

function InningsBreakView({ match }: { match: Match }) {
  const first = match.innings[0];
  const startSecond = useMatchStore((s) => s.startSecondInnings);
  const target = first.totalRuns + 1;
  return (
    <View style={styles.center}>
      <AppText style={{ fontSize: 56 }}>🍵</AppText>
      <AppText variant="h1" center style={{ marginTop: spacing.sm }}>
        Innings Break
      </AppText>
      <Card style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}>
        <AppText variant="title" center>
          {first.battingTeamName}
        </AppText>
        <AppText variant="display" center color={colors.primary}>
          {first.totalRuns}/{first.totalWickets}
        </AppText>
        <AppText variant="label" center>
          {formatOvers(first.legalBalls)} overs
        </AppText>
      </Card>
      <AppText variant="title" center style={{ marginTop: spacing.xl }}>
        {first.bowlingTeamName} need {target} to win
      </AppText>
      <Button title="Start 2nd Innings" icon="play" size="lg" style={{ marginTop: spacing.xl, alignSelf: 'stretch' }} onPress={startSecond} />
    </View>
  );
}

/* ----------------------------- Live innings ------------------------------ */

interface LiveInningsProps {
  match: Match;
  innings: Innings;
  pendingExtra: ReturnType<typeof useMatchStore.getState>['pendingExtra'];
  feedback: () => void;
  undoDepth: number;
  voiceOn: boolean;
  onToggleVoice: () => void;
}

function LiveInnings({ match, innings, pendingExtra, feedback, undoDepth, voiceOn, onToggleVoice }: LiveInningsProps) {
  const setOpeners = useMatchStore((s) => s.setOpeners);
  const setBowler = useMatchStore((s) => s.setBowler);
  const newBatsman = useMatchStore((s) => s.newBatsman);
  const commitRuns = useMatchStore((s) => s.commitRuns);
  const scoreWicket = useMatchStore((s) => s.scoreWicket);
  const setPendingExtra = useMatchStore((s) => s.setPendingExtra);
  const swapStrike = useMatchStore((s) => s.swapStrike);
  const undo = useMatchStore((s) => s.undo);

  const [showWicket, setShowWicket] = useState(false);
  // opener setup local selection
  const [openStriker, setOpenStriker] = useState<string | null>(null);
  const [openNonStriker, setOpenNonStriker] = useState<string | null>(null);
  const [openBowler, setOpenBowler] = useState<string | null>(null);
  const [openerStage, setOpenerStage] = useState<'striker' | 'nonStriker' | 'bowler' | null>(null);

  const battingTeam = innings.battingTeam === 1 ? match.team1 : match.team2;
  const bowlingTeam = innings.battingTeam === 1 ? match.team2 : match.team1;

  const needOpeners = innings.batsmen.length === 0;

  const striker = innings.batsmen.find((b) => b.playerId === innings.strikerId);
  const nonStriker = innings.batsmen.find((b) => b.playerId === innings.nonStrikerId);
  const bowler = innings.bowlers.find((b) => b.playerId === innings.currentBowlerId);

  const maxOversPerBowler = match.rules.unlimitedOvers ? Infinity : Math.max(1, Math.ceil(match.totalOvers / 5));

  const eligibleNewBatsmen: PickerOption[] = useMemo(
    () =>
      battingTeam.players
        .filter((p) => {
          const rec = innings.batsmen.find((b) => b.playerId === p.id);
          if (p.id === innings.strikerId || p.id === innings.nonStrikerId) return false;
          if (!rec) return true;
          if (rec.isOut) return false;
          return rec.isRetired; // retired can return; active stays out of list
        })
        .map((p) => {
          const rec = innings.batsmen.find((b) => b.playerId === p.id);
          return { id: p.id, name: p.name, note: rec?.isRetired ? 'Returning (retired)' : undefined };
        }),
    [battingTeam.players, innings.batsmen, innings.strikerId, innings.nonStrikerId],
  );

  const aSlotEmpty = innings.strikerId == null || innings.nonStrikerId == null;
  // Only prompt for a new batter when one is actually available. With "last man
  // stands" and nobody left, the store keeps the lone survivor batting instead.
  const needNewBatsman = !needOpeners && aSlotEmpty && eligibleNewBatsmen.length > 0;
  const needNewBowler = !needOpeners && !needNewBatsman && innings.currentBowlerId == null;

  const eligibleBowlers: PickerOption[] = useMemo(() => {
    const list: PickerOption[] = bowlingTeam.players.map((p) => {
      const rec = innings.bowlers.find((b) => b.playerId === p.id);
      const oversBowled = rec ? Math.floor(rec.legalBalls / 6) : 0;
      const isPrev = p.id === innings.previousBowlerId;
      const atCap = oversBowled >= maxOversPerBowler;
      return {
        id: p.id,
        name: p.name,
        disabled: isPrev || atCap,
        note: isPrev ? 'Bowled last over' : atCap ? 'Over limit reached' : rec ? `${formatOvers(rec.legalBalls)} ov • ${rec.wickets}/${rec.runs}` : undefined,
      };
    });
    // Safety: never disable everyone. If the over-cap would leave no choice, relax
    // it and keep only the no-consecutive-overs rule.
    if (list.length > 0 && list.every((o) => o.disabled)) {
      return list.map((o) => ({ ...o, disabled: o.id === innings.previousBowlerId }));
    }
    return list;
  }, [bowlingTeam.players, innings.bowlers, innings.previousBowlerId, maxOversPerBowler]);

  const openerOptions = (exclude: string | null): PickerOption[] =>
    battingTeam.players.filter((p) => p.id !== exclude).map((p) => ({ id: p.id, name: p.name }));

  /* ----- opener setup card ----- */
  if (needOpeners) {
    const canStart = openStriker && openNonStriker && openBowler && openStriker !== openNonStriker;
    const nameOf = (id: string | null, team: typeof battingTeam) => team.players.find((p) => p.id === id)?.name ?? 'Select';
    return (
      <>
        <ScrollView contentContainerStyle={styles.setupContent}>
          <AppText style={{ fontSize: 44, textAlign: 'center' }}>🏏</AppText>
          <AppText variant="h1" center>
            {innings.battingTeamName} batting
          </AppText>
          <AppText variant="label" center style={{ marginBottom: spacing.lg }}>
            Pick your openers and the first bowler
          </AppText>

          <SetupSlot label="Striker" name={nameOf(openStriker, battingTeam)} chosen={!!openStriker} onPress={() => setOpenerStage('striker')} />
          <SetupSlot label="Non-striker" name={nameOf(openNonStriker, battingTeam)} chosen={!!openNonStriker} onPress={() => setOpenerStage('nonStriker')} />
          <SetupSlot label="Opening bowler" name={bowlingTeam.players.find((p) => p.id === openBowler)?.name ?? 'Select'} chosen={!!openBowler} onPress={() => setOpenerStage('bowler')} />

          <Button
            title="Start Innings"
            icon="play"
            size="lg"
            disabled={!canStart}
            style={{ marginTop: spacing.xl }}
            onPress={() => {
              if (!canStart) return;
              setOpeners(openStriker!, openNonStriker!);
              setBowler(openBowler!);
            }}
          />
        </ScrollView>

        <PlayerPicker
          visible={openerStage === 'striker'}
          title="Select striker"
          options={openerOptions(openNonStriker)}
          dismissable
          onClose={() => setOpenerStage(null)}
          onSelect={(pid) => {
            setOpenStriker(pid);
            setOpenerStage(null);
          }}
        />
        <PlayerPicker
          visible={openerStage === 'nonStriker'}
          title="Select non-striker"
          options={openerOptions(openStriker)}
          dismissable
          onClose={() => setOpenerStage(null)}
          onSelect={(pid) => {
            setOpenNonStriker(pid);
            setOpenerStage(null);
          }}
        />
        <PlayerPicker
          visible={openerStage === 'bowler'}
          title="Select opening bowler"
          options={bowlingTeam.players.map((p) => ({ id: p.id, name: p.name }))}
          dismissable
          onClose={() => setOpenerStage(null)}
          onSelect={(pid) => {
            setOpenBowler(pid);
            setOpenerStage(null);
          }}
        />
      </>
    );
  }

  /* ----- normal live scoring ----- */
  const crr = currentRunRate(innings);
  const chase = chaseInfo(innings);
  const partnership = currentPartnership(innings);
  const overBalls = displayOverBalls(innings);

  const onRun = (n: number) => {
    commitRuns(n);
    feedback();
  };
  const onExtraTap = (extra: 'wide' | 'noBall' | 'bye' | 'legBye') => {
    setPendingExtra(extra);
  };
  const onWicket = (submit: WicketSubmit) => {
    setShowWicket(false);
    scoreWicket(submit);
    feedback();
  };

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.md }} showsVerticalScrollIndicator={false}>
        {/* Scoreboard */}
        <Card style={styles.scoreboard}>
          <View style={styles.scoreRow}>
            <View>
              <AppText variant="label">{innings.battingTeamName}</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <AppText variant="display" weight={fontWeight.black}>
                  {innings.totalRuns}/{innings.totalWickets}
                </AppText>
                <AppText variant="title" color={colors.textMuted} style={{ marginBottom: 10, marginLeft: 6 }}>
                  ({formatOvers(innings.legalBalls)})
                </AppText>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption">CRR</AppText>
              <AppText variant="title" color={colors.primary}>
                {formatRate(crr)}
              </AppText>
              {chase ? null : (
                <>
                  <AppText variant="caption" style={{ marginTop: 4 }}>
                    PROJ
                  </AppText>
                  <AppText variant="body" color={colors.textMuted}>
                    {projectedScore(innings)}
                  </AppText>
                </>
              )}
            </View>
          </View>

          {chase ? (
            <View style={styles.chaseBar}>
              <AppText variant="label" color={colors.black} weight={fontWeight.bold}>
                {chase.runsNeeded > 0
                  ? `Need ${chase.runsNeeded} off ${chase.ballsRemaining} • RRR ${formatRate(chase.requiredRunRate)}`
                  : 'Target reached!'}
              </AppText>
            </View>
          ) : null}
        </Card>

        {/* Batsmen */}
        <Card style={{ marginTop: spacing.md }}>
          <BatsmanRow b={striker} striker label="batting" />
          <View style={styles.thinDivider} />
          <BatsmanRow b={nonStriker} striker={false} label="batting" />
          <View style={styles.partnership}>
            <AppText variant="caption">
              Partnership: {partnership.runs} ({partnership.balls})
            </AppText>
            <Pressable onPress={swapStrike} style={styles.swapBtn} hitSlop={8}>
              <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
              <AppText variant="caption" color={colors.primary}>
                Swap
              </AppText>
            </Pressable>
          </View>
        </Card>

        {/* Bowler + this over */}
        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.bowlerRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="title" weight={fontWeight.semibold} numberOfLines={1}>
                {bowler?.name ?? '—'}
              </AppText>
              <AppText variant="caption">
                {bowler ? `${formatOvers(bowler.legalBalls)}-${bowler.maidens}-${bowler.runs}-${bowler.wickets}` : ''}
              </AppText>
            </View>
            <AppText variant="label" color={colors.textMuted}>
              Econ {bowler ? formatRate(economyRate(bowler.legalBalls, bowler.runs)) : '0.00'}
            </AppText>
          </View>
          <View style={styles.overRow}>
            <AppText variant="caption" style={{ marginRight: spacing.sm }}>
              This over
            </AppText>
            {overBalls.length === 0 ? (
              <AppText variant="caption" color={colors.textFaint}>
                —
              </AppText>
            ) : (
              overBalls.map((b, i) => <BallChip key={b.id ?? i} ball={b} />)
            )}
          </View>
        </Card>

        {/* Pending extra banner */}
        {pendingExtra ? (
          <Pressable onPress={() => setPendingExtra(null)} style={styles.pendingBanner}>
            <Ionicons name="information-circle" size={18} color={colors.black} />
            <AppText variant="label" color={colors.black} weight={fontWeight.bold} style={{ flex: 1 }}>
              {pendingLabel(pendingExtra)} — tap runs to add (0 = just the extra). Tap to cancel.
            </AppText>
          </Pressable>
        ) : null}

        {/* Run buttons */}
        <View style={styles.pad}>
          <View style={styles.runRow}>
            {[0, 1, 2, 3].map((n) => (
              <ScoreButton key={n} label={`${n}`} onPress={() => onRun(n)} flex />
            ))}
          </View>
          <View style={styles.runRow}>
            <ScoreButton label="4" onPress={() => onRun(4)} color={colors.four} big />
            <ScoreButton label="6" onPress={() => onRun(6)} color={colors.six} big />
            <ScoreButton
              label="OUT"
              icon="close-circle"
              onPress={() => {
                Haptics.selectionAsync();
                setShowWicket(true);
              }}
              color={colors.wicket}
              big
            />
          </View>
          <View style={styles.runRow}>
            <ExtraButton label="Wd" active={pendingExtra === 'wide'} onPress={() => onExtraTap('wide')} />
            <ExtraButton label="NB" active={pendingExtra === 'noBall'} onPress={() => onExtraTap('noBall')} />
            <ExtraButton label="B" active={pendingExtra === 'bye'} onPress={() => onExtraTap('bye')} />
            <ExtraButton label="LB" active={pendingExtra === 'legBye'} onPress={() => onExtraTap('legBye')} />
          </View>

          {/* Controls */}
          <View style={styles.controlRow}>
            <ControlButton icon="arrow-undo" label={`Undo${undoDepth > 0 ? ` (${undoDepth})` : ''}`} disabled={undoDepth === 0} onPress={() => { undo(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
            <ControlButton icon="swap-horizontal" label="Swap" onPress={swapStrike} />
            <ControlButton icon={voiceOn ? 'volume-high' : 'volume-mute'} label="Voice" active={voiceOn} onPress={onToggleVoice} />
          </View>
        </View>
      </ScrollView>

      {/* Wicket modal */}
      <WicketModal
        visible={showWicket}
        rules={match.rules}
        strikerId={innings.strikerId}
        strikerName={striker?.name ?? 'Striker'}
        nonStrikerId={innings.nonStrikerId}
        nonStrikerName={nonStriker?.name ?? 'Non-striker'}
        fielders={bowlingTeam.players.map((p) => ({ id: p.id, name: p.name }))}
        onConfirm={onWicket}
        onClose={() => setShowWicket(false)}
      />

      {/* New batsman picker */}
      <PlayerPicker
        visible={needNewBatsman}
        title="New batsman"
        subtitle={`Wicket ${innings.totalWickets} down`}
        options={eligibleNewBatsmen}
        onSelect={(pid) => newBatsman(pid)}
      />

      {/* New bowler picker */}
      <PlayerPicker
        visible={needNewBowler}
        title="New over — pick bowler"
        subtitle="Same bowler can't bowl consecutive overs"
        options={eligibleBowlers}
        onSelect={(pid) => setBowler(pid)}
      />
    </>
  );
}

/* ------------------------------ small parts ------------------------------ */

function SetupSlot({ label, name, chosen, onPress }: { label: string; name: string; chosen: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.setupSlot, chosen && { borderColor: colors.primary }]}>
      <View>
        <AppText variant="caption">{label}</AppText>
        <AppText variant="title" weight={fontWeight.semibold} color={chosen ? colors.text : colors.textFaint}>
          {name}
        </AppText>
      </View>
      <Ionicons name={chosen ? 'checkmark-circle' : 'chevron-forward'} size={22} color={chosen ? colors.primary : colors.textFaint} />
    </Pressable>
  );
}

function BatsmanRow({ b, striker, label }: { b?: { name: string; runs: number; balls: number; fours: number; sixes: number }; striker: boolean; label: string }) {
  if (!b) {
    return (
      <View style={styles.batRow}>
        <AppText variant="title" color={colors.textFaint}>
          —
        </AppText>
      </View>
    );
  }
  return (
    <View style={styles.batRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {striker ? <View style={styles.strikeDot} /> : <View style={{ width: 8 + spacing.sm }} />}
        <AppText variant="title" weight={fontWeight.semibold} numberOfLines={1}>
          {b.name}
        </AppText>
      </View>
      <AppText variant="mono" style={{ width: 64, textAlign: 'right' }}>
        {b.runs} ({b.balls})
      </AppText>
      <AppText variant="caption" style={{ width: 56, textAlign: 'right' }}>
        {b.fours}×4 {b.sixes}×6
      </AppText>
      <AppText variant="caption" style={{ width: 52, textAlign: 'right' }}>
        SR {b.balls ? strikeRate(b.runs, b.balls).toFixed(0) : '0'}
      </AppText>
    </View>
  );
}

function BallChip({ ball }: { ball: Ball }) {
  const { label, bg, fg } = ballChipStyle(ball);
  return (
    <View style={[styles.ballChip, { backgroundColor: bg }]}>
      <AppText variant="caption" weight={fontWeight.bold} color={fg}>
        {label}
      </AppText>
    </View>
  );
}

function ScoreButton({ label, onPress, color, big, flex, icon }: { label: string; onPress: () => void; color?: string; big?: boolean; flex?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.scoreBtn,
        { backgroundColor: color ?? colors.surface2, height: big ? 76 : 64, opacity: pressed ? 0.8 : 1 },
        flex ? { flex: 1 } : { flex: 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={20} color={color ? colors.black : colors.text} /> : null}
      <AppText variant={big ? 'h1' : 'h2'} weight={fontWeight.black} color={color ? colors.black : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

function ExtraButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.extraBtn,
        { backgroundColor: active ? colors.extra : colors.surface, borderColor: active ? colors.extra : colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <AppText variant="title" weight={fontWeight.bold} color={active ? colors.black : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

function ControlButton({ icon, label, onPress, disabled, active }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.controlBtn, { opacity: disabled ? 0.4 : pressed ? 0.8 : 1, borderColor: active ? colors.primary : colors.border }]}>
      <Ionicons name={icon} size={20} color={active ? colors.primary : colors.text} />
      <AppText variant="caption" color={active ? colors.primary : colors.textMuted} style={{ marginTop: 2 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/* ------------------------------- helpers --------------------------------- */

function displayOverBalls(innings: Innings): Ball[] {
  if (innings.balls.length === 0) return [];
  const lastOver = innings.balls[innings.balls.length - 1].overNumber;
  return innings.balls.filter((b) => b.overNumber === lastOver);
}

function ballChipStyle(ball: Ball): { label: string; bg: string; fg: string } {
  if (ball.isWicket && ball.wicketType !== 'Retired') return { label: 'W', bg: colors.wicket, fg: colors.white };
  const t = ball.extra.type;
  if (t === 'wide') return { label: `Wd${ball.extra.runs > 1 ? ball.extra.runs : ''}`, bg: colors.extra, fg: colors.black };
  if (t === 'noBall') return { label: `Nb${ball.runs > 0 ? ball.runs : ''}`, bg: colors.extra, fg: colors.black };
  if (t === 'bye') return { label: `B${ball.extra.runs}`, bg: colors.surface3, fg: colors.text };
  if (t === 'legBye') return { label: `Lb${ball.extra.runs}`, bg: colors.surface3, fg: colors.text };
  if (ball.runs === 4) return { label: '4', bg: colors.four, fg: colors.white };
  if (ball.runs === 6) return { label: '6', bg: colors.six, fg: colors.white };
  if (ball.runs === 0) return { label: '•', bg: colors.surface3, fg: colors.textMuted };
  return { label: `${ball.runs}`, bg: colors.surface2, fg: colors.text };
}

function pendingLabel(extra: string): string {
  switch (extra) {
    case 'wide':
      return 'WIDE';
    case 'noBall':
      return 'NO BALL';
    case 'bye':
      return 'BYES';
    case 'legBye':
      return 'LEG BYES';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  topIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  setupContent: { padding: spacing.lg, gap: spacing.md },
  setupSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreboard: { marginHorizontal: spacing.lg, marginTop: spacing.xs },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chaseBar: { marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, alignItems: 'center' },
  batRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  strikeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginRight: spacing.sm },
  thinDivider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  partnership: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  swapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreboardCard: {},
  bowlerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  ballChip: { minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.extra, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md },
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  runRow: { flexDirection: 'row', gap: spacing.sm },
  scoreBtn: { flex: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 2 },
  extraBtn: { flex: 1, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  controlRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  controlBtn: { flex: 1, height: 56, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
