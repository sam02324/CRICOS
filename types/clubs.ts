/**
 * Competition domain — Clubs, Tournaments, MVP and Hall-of-Fame records.
 * Layers on top of the core match model in `./cricket`.
 */
import { Player } from '@/types/cricket';

/* --------------------------------- Clubs --------------------------------- */

export interface Club {
  id: string;
  name: string;
  shortName: string; // 3-4 letter tag, e.g. MUM
  emoji: string; // stands in for a crest
  color: string; // accent hex
  homeGround: string;
  foundedYear: number | null;
  members: Player[]; // persistent roster
  createdAt: number;
}

export interface ClubStats {
  clubId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  winPct: number;
  runsScored: number;
  runsConceded: number;
  highestTotal: number;
  titles: number; // tournaments won
  topScorerName: string | null;
  topScorerRuns: number;
  topWicketName: string | null;
  topWickets: number;
}

/* ------------------------------ Tournaments ------------------------------ */

export type TournamentFormat = 'league' | 'knockout' | 'league-playoffs';

export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed';

/** A side competing in a tournament: a registered club or a plain name. */
export interface TournamentEntry {
  clubId: string | null;
  name: string;
}

export interface Tournament {
  id: string;
  name: string;
  emoji: string;
  format: TournamentFormat;
  overs: number;
  entries: TournamentEntry[];
  status: TournamentStatus;
  createdAt: number;
  championName: string | null;
  championClubId: string | null;
  mvpName: string | null;
}

export interface PointsRow {
  name: string;
  clubId: string | null;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  runsFor: number;
  oversFor: number;
  runsAgainst: number;
  oversAgainst: number;
  nrr: number;
}

/* ---------------------------------- MVP ---------------------------------- */

export interface PlayerPerformance {
  name: string;
  // batting
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  out: boolean;
  // bowling
  wickets: number;
  maidens: number;
  runsConceded: number;
  ballsBowled: number;
  // fielding
  catches: number;
  stumpings: number;
  runouts: number;
  // total
  points: number;
}

export interface MVPResult {
  name: string;
  points: number;
  summary: string; // e.g. "42 (28) & 2/19"
}

/* ------------------------------ Hall of Fame ----------------------------- */

export interface RecordHolder {
  name: string;
  value: number;
  detail: string;
}

export interface HallOfFame {
  mostRuns: RecordHolder[];
  mostWickets: RecordHolder[];
  highestScores: RecordHolder[];
  bestBowling: RecordHolder[];
  mostMVPs: RecordHolder[];
  mostSixes: RecordHolder[];
  mostMatches: RecordHolder[];
  highestTeamTotals: RecordHolder[];
  mostTitles: RecordHolder[];
}
