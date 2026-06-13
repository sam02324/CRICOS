/**
 * Solo practice mode. Track runs, balls, strike rate, dot% and boundary%
 * against a self-set target, and save sessions for later review.
 */
import { create } from 'zustand';
import { PracticeBall, PracticeSession } from '@/types/cricket';
import { loadPractice, savePractice } from '@/utils/storage';
import { uid } from '@/utils/cricket';

interface PracticeState {
  // active session
  active: boolean;
  targetRuns: number;
  targetBalls: number;
  balls: PracticeBall[];
  undoStack: PracticeBall[][];
  // saved
  sessions: PracticeSession[];
  loaded: boolean;

  start: (targetRuns: number, targetBalls: number) => void;
  addBall: (runs: number, isWicket: boolean) => void;
  undo: () => void;
  reset: () => void;
  finishAndSave: () => Promise<void>;
  refresh: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

export const usePracticeStore = create<PracticeState>((set, get) => ({
  active: false,
  targetRuns: 30,
  targetBalls: 20,
  balls: [],
  undoStack: [],
  sessions: [],
  loaded: false,

  start: (targetRuns, targetBalls) =>
    set({ active: true, targetRuns, targetBalls, balls: [], undoStack: [] }),

  addBall: (runs, isWicket) => {
    const { balls, undoStack } = get();
    const ball: PracticeBall = {
      runs,
      isDot: runs === 0 && !isWicket,
      isBoundary: runs === 4 || runs === 6,
      isWicket,
    };
    const nextUndo = [...undoStack, balls];
    if (nextUndo.length > 12) nextUndo.shift();
    set({ balls: [...balls, ball], undoStack: nextUndo });
  },

  undo: () => {
    const stack = [...get().undoStack];
    const prev = stack.pop();
    if (!prev) return;
    set({ balls: prev, undoStack: stack });
  },

  reset: () => set({ active: false, balls: [], undoStack: [] }),

  finishAndSave: async () => {
    const { balls, targetRuns, targetBalls, sessions } = get();
    if (balls.length === 0) {
      set({ active: false });
      return;
    }
    const runsScored = balls.reduce((s, b) => s + b.runs, 0);
    const session: PracticeSession = {
      id: uid('p_'),
      createdAt: Date.now(),
      targetRuns,
      targetBalls,
      ballsFaced: balls.length,
      runsScored,
      dots: balls.filter((b) => b.isDot).length,
      boundaries: balls.filter((b) => b.isBoundary).length,
      fours: balls.filter((b) => b.runs === 4).length,
      sixes: balls.filter((b) => b.runs === 6).length,
      wickets: balls.filter((b) => b.isWicket).length,
      balls,
      achieved: runsScored >= targetRuns && balls.length <= targetBalls,
    };
    const next = [session, ...sessions];
    await savePractice(next);
    set({ sessions: next, active: false, balls: [], undoStack: [] });
  },

  refresh: async () => {
    const sessions = await loadPractice();
    set({ sessions: sessions.sort((a, b) => b.createdAt - a.createdAt), loaded: true });
  },

  deleteSession: async (id) => {
    const sessions = get().sessions.filter((s) => s.id !== id);
    await savePractice(sessions);
    set({ sessions });
  },
}));

/** Live stats for the active practice session. */
export function practiceStats(balls: PracticeBall[]) {
  const ballsFaced = balls.length;
  const runs = balls.reduce((s, b) => s + b.runs, 0);
  const dots = balls.filter((b) => b.isDot).length;
  const boundaries = balls.filter((b) => b.isBoundary).length;
  const wickets = balls.filter((b) => b.isWicket).length;
  const strikeRate = ballsFaced === 0 ? 0 : (runs / ballsFaced) * 100;
  const dotPct = ballsFaced === 0 ? 0 : (dots / ballsFaced) * 100;
  const boundaryPct = ballsFaced === 0 ? 0 : (boundaries / ballsFaced) * 100;
  return { ballsFaced, runs, dots, boundaries, wickets, strikeRate, dotPct, boundaryPct };
}
