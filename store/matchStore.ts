/**
 * Live match state. The store is the single writer for an in-progress match:
 * it applies deliveries through the engine, keeps a 24-deep undo stack of full
 * match snapshots, drives the new-batsman / new-bowler / innings-break flow,
 * and persists offline after every change.
 */
import { create } from 'zustand';
import {
  Ball,
  ExtraType,
  Innings,
  Match,
  MatchFormat,
  MatchRules,
  MatchStatus,
  Team,
  Toss,
  WicketType,
} from '@/types/cricket';
import {
  applyDelivery,
  battingFirstTeam,
  computeResult,
  createBatsman,
  createInnings,
  createBowler,
  DeliveryInput,
  findBatsman,
  findBowler,
  generateShareCode,
  uid,
} from '@/utils/cricket';
import { saveLiveMatch, upsertMatch } from '@/utils/storage';
import { broadcastMatch, stopBroadcast } from '@/utils/realtime';
import { FormatPreset } from '@/constants/formats';

const UNDO_LIMIT = 24;

export interface StartMatchPayload {
  format: MatchFormat;
  totalOvers: number;
  playersPerSide: number;
  venue: string;
  team1: Team;
  team2: Team;
  toss: Toss;
  rules: MatchRules;
  team1ClubId?: string | null;
  team2ClubId?: string | null;
  tournamentId?: string | null;
}

export interface Celebration {
  kind: '4' | '6' | 'W';
  id: string;
}

interface MatchState {
  match: Match | null;
  undoStack: Match[];
  pendingExtra: ExtraType | null;
  inningsBreak: boolean;
  matchComplete: boolean;
  celebration: Celebration | null;
  hydrated: boolean;
  /** True when the last offline save failed (storage full, etc.). */
  persistError: boolean;

  // lifecycle
  startMatch: (payload: StartMatchPayload) => string;
  loadMatch: (match: Match) => void;
  hydrate: (match: Match | null) => void;
  abandonMatch: () => void;

  // setup of players for the current innings
  setOpeners: (strikerId: string, nonStrikerId: string) => void;
  setBowler: (bowlerId: string) => void;
  newBatsman: (playerId: string) => void;

  // scoring
  setPendingExtra: (extra: ExtraType | null) => void;
  commitRuns: (runs: number) => void; // routes through pendingExtra
  scoreRuns: (runs: number) => void;
  scoreWide: (extraRuns: number) => void;
  scoreNoBall: (batRuns: number) => void;
  scoreBye: (runs: number) => void;
  scoreLegBye: (runs: number) => void;
  scoreWicket: (input: {
    wicketType: WicketType;
    runs: number;
    dismissedBatterId: string | null;
    fielderId: string | null;
    fielderName: string | null;
    extraType: ExtraType | null;
  }) => void;
  swapStrike: () => void;
  /** Tag the most recent ball with a wagon-wheel shot direction (0–360°). */
  setLastBallShotDirection: (deg: number) => void;

  // flow
  undo: () => void;
  /** Undo multiple deliveries at once (used by the edit-over sheet). */
  undoSteps: (steps: number) => void;
  startSecondInnings: () => void;
  forceEndInnings: () => void;
  clearCelebration: () => void;
  /** Re-attempt the offline save after a persistence failure. */
  retryPersist: () => void;
}

function currentInnings(match: Match): Innings {
  return match.innings[match.currentInningsIndex];
}

function clone(match: Match): Match {
  return JSON.parse(JSON.stringify(match)) as Match;
}

/**
 * "Last man stands": when a batter is out and no eligible replacement remains,
 * move the lone survivor to the striker's end so scoring continues with a single
 * batter instead of stalling on an empty new-batsman prompt.
 */
function consolidateLastMan(match: Match) {
  if (!match.rules.lastManStands) return;
  const innings = currentInnings(match);
  if (innings.isComplete) return;
  if (innings.strikerId && innings.nonStrikerId) return; // both ends occupied
  const battingTeam = innings.battingTeam === 1 ? match.team1 : match.team2;
  const hasReplacement = battingTeam.players.some((p) => {
    if (p.id === innings.strikerId || p.id === innings.nonStrikerId) return false;
    const rec = innings.batsmen.find((b) => b.playerId === p.id);
    if (!rec) return true; // not yet batted
    if (rec.isOut) return false;
    return rec.isRetired; // retired may return
  });
  if (hasReplacement) return; // normal new-batsman flow applies
  if (innings.strikerId == null && innings.nonStrikerId != null) {
    innings.strikerId = innings.nonStrikerId;
    innings.nonStrikerId = null;
  }
}

export const useMatchStore = create<MatchState>((set, get) => {
  /** Persist the live match offline; archive to history once completed. */
  function persist(match: Match) {
    if (match.status === 'completed') {
      void upsertMatch(match);
      void saveLiveMatch(null);
      // final broadcast so spectators see the result, then close the channel
      broadcastMatch(match);
      stopBroadcast(match.shareCode);
    } else {
      saveLiveMatch(match)
        .then(() => {
          if (get().persistError) set({ persistError: false });
        })
        .catch(() => set({ persistError: true }));
      // live spectator sync (no-op when Supabase isn't configured)
      broadcastMatch(match);
    }
  }

  /** Push a snapshot for undo (capped at UNDO_LIMIT). */
  function snapshot(): Match[] {
    const m = get().match;
    if (!m) return get().undoStack;
    const next = [...get().undoStack, clone(m)];
    if (next.length > UNDO_LIMIT) next.shift();
    return next;
  }

  /** Shared post-delivery bookkeeping: innings end, persistence, celebration. */
  function afterDelivery(
    match: Match,
    flags: { inningsComplete: boolean; celebrated: '4' | '6' | 'W' | null },
  ) {
    match.updatedAt = Date.now();
    let inningsBreak = false;
    let matchComplete = false;

    if (flags.inningsComplete) {
      if (match.currentInningsIndex === 0) {
        inningsBreak = true;
      } else {
        match.result = computeResult(match);
        match.status = 'completed' as MatchStatus;
        matchComplete = true;
      }
    }

    persist(match);

    set({
      match: { ...match },
      inningsBreak,
      matchComplete,
      celebration: flags.celebrated ? { kind: flags.celebrated, id: uid('c_') } : null,
      pendingExtra: null,
    });
  }

  /** Run a delivery against the current innings with a fresh undo snapshot. */
  function runDelivery(input: DeliveryInput) {
    const state = get();
    const match = state.match;
    if (!match || match.status === 'completed' || state.inningsBreak) return;
    const innings = currentInnings(match);
    if (!innings.strikerId || !innings.currentBowlerId) return; // setup incomplete

    const stack = snapshot();
    const working = clone(match);
    const workingInnings = currentInnings(working);
    const flags = applyDelivery(workingInnings, input, working.rules);
    consolidateLastMan(working);

    set({ undoStack: stack });
    afterDelivery(working, flags);
  }

  return {
    match: null,
    undoStack: [],
    pendingExtra: null,
    inningsBreak: false,
    matchComplete: false,
    celebration: null,
    hydrated: false,
    persistError: false,

    startMatch: (payload) => {
      const id = uid('m_');
      const toss = payload.toss;
      const base: Match = {
        id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'live',
        format: payload.format,
        totalOvers: payload.totalOvers,
        playersPerSide: payload.playersPerSide,
        venue: payload.venue,
        team1: payload.team1,
        team2: payload.team2,
        toss,
        rules: payload.rules,
        innings: [],
        currentInningsIndex: 0,
        result: null,
        shareCode: generateShareCode(),
        team1ClubId: payload.team1ClubId ?? null,
        team2ClubId: payload.team2ClubId ?? null,
        tournamentId: payload.tournamentId ?? null,
      };
      const first = battingFirstTeam(toss);
      base.innings = [createInnings(base, first, null)];
      persist(base);
      set({
        match: base,
        undoStack: [],
        pendingExtra: null,
        inningsBreak: false,
        matchComplete: false,
        celebration: null,
        hydrated: true,
      });
      return id;
    },

    loadMatch: (match) =>
      set({
        match: clone(match),
        undoStack: [],
        pendingExtra: null,
        inningsBreak: false,
        matchComplete: match.status === 'completed',
        celebration: null,
        hydrated: true,
      }),

    hydrate: (match) =>
      set({
        match: match ? clone(match) : null,
        hydrated: true,
        inningsBreak: false,
        matchComplete: match?.status === 'completed',
      }),

    abandonMatch: () => {
      const m = get().match;
      if (m?.shareCode) stopBroadcast(m.shareCode);
      void saveLiveMatch(null);
      set({
        match: null,
        undoStack: [],
        pendingExtra: null,
        inningsBreak: false,
        matchComplete: false,
        celebration: null,
      });
    },

    setOpeners: (strikerId, nonStrikerId) => {
      const match = get().match;
      if (!match) return;
      const working = clone(match);
      const innings = currentInnings(working);
      const battingTeam = innings.battingTeam === 1 ? working.team1 : working.team2;
      const sp = battingTeam.players.find((p) => p.id === strikerId);
      const np = battingTeam.players.find((p) => p.id === nonStrikerId);
      if (!sp || !np) return;
      innings.batsmen = [createBatsman(sp, 1), createBatsman(np, 2)];
      innings.strikerId = strikerId;
      innings.nonStrikerId = nonStrikerId;
      persist(working);
      set({ match: working });
    },

    setBowler: (bowlerId) => {
      const match = get().match;
      if (!match) return;
      const working = clone(match);
      const innings = currentInnings(working);
      const bowlingTeam = innings.battingTeam === 1 ? working.team2 : working.team1;
      const bp = bowlingTeam.players.find((p) => p.id === bowlerId);
      if (!bp) return;
      if (!findBowler(innings, bowlerId)) {
        innings.bowlers.push(createBowler(bp));
      }
      innings.currentBowlerId = bowlerId;
      persist(working);
      set({ match: working });
    },

    newBatsman: (playerId) => {
      const match = get().match;
      if (!match) return;
      const working = clone(match);
      const innings = currentInnings(working);
      const battingTeam = innings.battingTeam === 1 ? working.team1 : working.team2;
      const player = battingTeam.players.find((p) => p.id === playerId);
      if (!player) return;

      // Returning retired batter resumes their innings instead of a new record.
      const existing = findBatsman(innings, playerId);
      if (existing && existing.isRetired) {
        existing.isRetired = false;
      } else if (!existing) {
        innings.batsmen.push(createBatsman(player, innings.batsmen.length + 1));
      }

      if (innings.strikerId == null) innings.strikerId = playerId;
      else if (innings.nonStrikerId == null) innings.nonStrikerId = playerId;
      persist(working);
      set({ match: working });
    },

    setPendingExtra: (extra) =>
      set((s) => ({ pendingExtra: s.pendingExtra === extra ? null : extra })),

    commitRuns: (runs) => {
      const pending = get().pendingExtra;
      switch (pending) {
        case 'wide':
          get().scoreWide(runs);
          break;
        case 'noBall':
          get().scoreNoBall(runs);
          break;
        case 'bye':
          get().scoreBye(runs);
          break;
        case 'legBye':
          get().scoreLegBye(runs);
          break;
        default:
          get().scoreRuns(runs);
      }
    },

    scoreRuns: (runs) =>
      runDelivery({
        batRuns: runs,
        extraType: null,
        extraRuns: 0,
        isWicket: false,
        wicketType: null,
        dismissedBatterId: null,
        fielderId: null,
        fielderName: null,
      }),

    scoreWide: (extraRuns) =>
      runDelivery({
        batRuns: 0,
        extraType: 'wide',
        extraRuns,
        isWicket: false,
        wicketType: null,
        dismissedBatterId: null,
        fielderId: null,
        fielderName: null,
      }),

    scoreNoBall: (batRuns) =>
      runDelivery({
        batRuns,
        extraType: 'noBall',
        extraRuns: 0,
        isWicket: false,
        wicketType: null,
        dismissedBatterId: null,
        fielderId: null,
        fielderName: null,
      }),

    scoreBye: (runs) =>
      runDelivery({
        batRuns: 0,
        extraType: 'bye',
        extraRuns: runs,
        isWicket: false,
        wicketType: null,
        dismissedBatterId: null,
        fielderId: null,
        fielderName: null,
      }),

    scoreLegBye: (runs) =>
      runDelivery({
        batRuns: 0,
        extraType: 'legBye',
        extraRuns: runs,
        isWicket: false,
        wicketType: null,
        dismissedBatterId: null,
        fielderId: null,
        fielderName: null,
      }),

    scoreWicket: (input) =>
      runDelivery({
        batRuns: input.extraType === 'noBall' ? input.runs : input.extraType === null ? input.runs : 0,
        extraType: input.extraType,
        extraRuns:
          input.extraType === 'bye' || input.extraType === 'legBye' || input.extraType === 'wide'
            ? input.runs
            : 0,
        isWicket: true,
        wicketType: input.wicketType,
        dismissedBatterId: input.dismissedBatterId,
        fielderId: input.fielderId,
        fielderName: input.fielderName,
      }),

    swapStrike: () => {
      const match = get().match;
      if (!match) return;
      const innings = currentInnings(match);
      // No-op when an end is empty (lone last-man batter) — swapping would leave
      // no striker and silently block scoring.
      if (!innings.strikerId || !innings.nonStrikerId) return;
      const stack = snapshot();
      const working = clone(match);
      const w = currentInnings(working);
      const t = w.strikerId;
      w.strikerId = w.nonStrikerId;
      w.nonStrikerId = t;
      persist(working);
      set({ match: working, undoStack: stack });
    },

    setLastBallShotDirection: (deg) => {
      const match = get().match;
      if (!match) return;
      const working = clone(match);
      const innings = currentInnings(working);
      const last = innings.balls[innings.balls.length - 1];
      if (!last) return;
      last.shotDirection = deg;
      persist(working);
      set({ match: working });
    },

    undo: () => {
      const stack = [...get().undoStack];
      const prev = stack.pop();
      if (!prev) return;
      persist(prev);
      set({
        match: prev,
        undoStack: stack,
        pendingExtra: null,
        inningsBreak: false,
        matchComplete: prev.status === 'completed',
        celebration: null,
      });
    },

    undoSteps: (steps) => {
      if (steps <= 0) return;
      const stack = [...get().undoStack];
      let prev: Match | undefined;
      for (let i = 0; i < steps && stack.length > 0; i++) {
        prev = stack.pop();
      }
      if (!prev) return;
      persist(prev);
      set({
        match: prev,
        undoStack: stack,
        pendingExtra: null,
        inningsBreak: false,
        matchComplete: prev.status === 'completed',
        celebration: null,
      });
    },

    startSecondInnings: () => {
      const match = get().match;
      if (!match) return;
      const working = clone(match);
      const first = working.innings[0];
      const secondBattingTeam: 1 | 2 = first.battingTeam === 1 ? 2 : 1;
      const target = first.totalRuns + 1;
      const second = createInnings(working, secondBattingTeam, target);
      working.innings = [first, second];
      working.currentInningsIndex = 1;
      persist(working);
      set({
        match: working,
        inningsBreak: false,
        undoStack: [],
        pendingExtra: null,
        celebration: null,
      });
    },

    forceEndInnings: () => {
      const match = get().match;
      if (!match || match.status === 'completed') return;
      const stack = snapshot();
      const working = clone(match);
      currentInnings(working).isComplete = true;
      set({ undoStack: stack });
      afterDelivery(working, { inningsComplete: true, celebrated: null });
    },

    clearCelebration: () => set({ celebration: null }),

    retryPersist: () => {
      const match = get().match;
      if (!match) return;
      persist(match);
    },
  };
});

/** Convenience selector for the live innings (or null). */
export function selectInnings(match: Match | null): Innings | null {
  if (!match) return null;
  return match.innings[match.currentInningsIndex] ?? null;
}

/** Apply a format preset's overs/player defaults (used by the setup screen). */
export function presetToDefaults(preset: FormatPreset) {
  return {
    overs: preset.overs,
    playersPerSide: preset.playersPerSide,
  };
}

export type { Ball };
