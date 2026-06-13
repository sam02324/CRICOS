/**
 * Offline persistence layer (AsyncStorage). Everything CRICOS knows lives on the
 * device — no network required. Keys are namespaced under `cricos:`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Match, MatchTemplate, PracticeSession } from '@/types/cricket';
import { Club, Tournament } from '@/types/clubs';

const KEYS = {
  matches: 'cricos:matches',
  liveMatch: 'cricos:liveMatch',
  templates: 'cricos:templates',
  practice: 'cricos:practice',
  clubs: 'cricos:clubs',
  tournaments: 'cricos:tournaments',
} as const;

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort; offline storage failures should never crash scoring
  }
}

/* ------------------------------- matches -------------------------------- */

export async function loadMatches(): Promise<Match[]> {
  return readJSON<Match[]>(KEYS.matches, []);
}

export async function saveMatches(matches: Match[]): Promise<void> {
  await writeJSON(KEYS.matches, matches);
}

export async function upsertMatch(match: Match): Promise<Match[]> {
  const matches = await loadMatches();
  const idx = matches.findIndex((m) => m.id === match.id);
  if (idx >= 0) matches[idx] = match;
  else matches.unshift(match);
  await saveMatches(matches);
  return matches;
}

export async function deleteMatch(id: string): Promise<Match[]> {
  const matches = (await loadMatches()).filter((m) => m.id !== id);
  await saveMatches(matches);
  return matches;
}

/* ----------------------------- live (resume) ---------------------------- */

export async function saveLiveMatch(match: Match | null): Promise<void> {
  if (!match) {
    await AsyncStorage.removeItem(KEYS.liveMatch);
    return;
  }
  await writeJSON(KEYS.liveMatch, match);
}

export async function loadLiveMatch(): Promise<Match | null> {
  return readJSON<Match | null>(KEYS.liveMatch, null);
}

/* ------------------------------ templates ------------------------------- */

export async function loadTemplates(): Promise<MatchTemplate[]> {
  return readJSON<MatchTemplate[]>(KEYS.templates, []);
}

export async function saveTemplates(templates: MatchTemplate[]): Promise<void> {
  await writeJSON(KEYS.templates, templates);
}

/* ------------------------------- practice ------------------------------- */

export async function loadPractice(): Promise<PracticeSession[]> {
  return readJSON<PracticeSession[]>(KEYS.practice, []);
}

export async function savePractice(sessions: PracticeSession[]): Promise<void> {
  await writeJSON(KEYS.practice, sessions);
}

/* -------------------------------- clubs --------------------------------- */

export async function loadClubs(): Promise<Club[]> {
  return readJSON<Club[]>(KEYS.clubs, []);
}

export async function saveClubs(clubs: Club[]): Promise<void> {
  await writeJSON(KEYS.clubs, clubs);
}

/* ----------------------------- tournaments ------------------------------ */

export async function loadTournaments(): Promise<Tournament[]> {
  return readJSON<Tournament[]>(KEYS.tournaments, []);
}

export async function saveTournaments(tournaments: Tournament[]): Promise<void> {
  await writeJSON(KEYS.tournaments, tournaments);
}
