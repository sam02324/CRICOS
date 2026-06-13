/**
 * CRICOS — Core cricket domain types.
 * Single source of truth for every match, innings, ball and stat in the app.
 */

export type MatchFormat = 'T20' | 'ODI' | 'Test' | 'Custom' | 'Box' | 'Pairs';

export type BallType = 'leather' | 'tennis' | 'tape';

export type TossChoice = 'bat' | 'bowl';

/** The kind of extra a single delivery produced (null = no extra). */
export type ExtraType = 'wide' | 'noBall' | 'bye' | 'legBye' | 'penalty';

export type WicketType =
  | 'Bowled'
  | 'Caught'
  | 'LBW'
  | 'Run Out'
  | 'Stumped'
  | 'Hit Wicket'
  | 'Retired'
  | 'One Hand Catch'
  | 'Boundary on Full'
  | 'Tip and Run Run Out';

export interface Player {
  id: string;
  name: string;
}

export interface Team {
  name: string;
  players: Player[];
}

/** Casual / box-cricket rule toggles. Defaults favour quick street matches. */
export interface MatchRules {
  lbw: boolean;
  ohob: boolean; // one hand one bounce allowed as a catch
  tipAndRun: boolean; // any contact = must run
  boundaryOnFull: boolean; // hitting a boundary on the full = out
  unlimitedOvers: boolean; // a bowler may bowl unlimited overs
  noWideLeg: boolean; // deliveries down leg are not called wide
  lastManStands: boolean; // last batter may bat alone
  wagonWheel: boolean; // capture shot direction (optional, off by default)
  ballType: BallType;
}

export interface Toss {
  winnerTeam: 1 | 2;
  choice: TossChoice;
}

export interface BallExtra {
  type: ExtraType | null;
  /** Total extra runs the delivery yielded (penalty + any physically run). */
  runs: number;
}

/** An immutable record of a single delivery. The innings ball list is the event log. */
export interface Ball {
  id: string;
  overNumber: number; // 0-based over index this ball belongs to
  legalBallInOver: number; // 1-6 for legal balls, the count after this ball; 0 for illegal
  batterId: string;
  nonStrikerId: string;
  bowlerId: string;
  runs: number; // runs off the bat
  extra: BallExtra;
  isWicket: boolean;
  wicketType: WicketType | null;
  dismissedBatterId: string | null;
  fielderId: string | null;
  isLegal: boolean; // true when the delivery counts towards the over
  swappedStrike: boolean;
  commentary: string;
}

export interface BatsmanInnings {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  isRetired: boolean;
  dismissal: WicketType | null;
  bowlerName: string | null;
  fielderName: string | null;
  battingPosition: number;
  hasBatted: boolean;
}

export interface BowlerInnings {
  playerId: string;
  name: string;
  legalBalls: number;
  maidens: number;
  runs: number; // runs charged to the bowler
  wickets: number;
  wides: number; // wide runs conceded
  noBalls: number; // no-ball penalties conceded
}

export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  overs: string; // e.g. "4.3"
  batterName: string;
}

export interface ExtrasTotal {
  wide: number;
  noBall: number;
  legBye: number;
  bye: number;
  penalty: number;
}

export interface Innings {
  battingTeam: 1 | 2;
  battingTeamName: string;
  bowlingTeamName: string;
  balls: Ball[];
  batsmen: BatsmanInnings[];
  bowlers: BowlerInnings[];
  extras: ExtrasTotal;
  totalRuns: number;
  totalWickets: number;
  legalBalls: number; // total legal deliveries bowled in the innings
  fallOfWickets: FallOfWicket[];
  strikerId: string | null;
  nonStrikerId: string | null;
  currentBowlerId: string | null;
  previousBowlerId: string | null; // last over's bowler (cannot bowl two in a row)
  isComplete: boolean;
  target: number | null; // runs required to win (second innings only)
  maxWickets: number; // wickets that end the innings (depends on players + lastManStands)
  totalOvers: number; // overs allotted for this innings
}

export type MarginType = 'runs' | 'wickets' | 'tie' | 'noresult';

export interface MatchResult {
  winnerTeam: 1 | 2 | null;
  winnerName: string | null;
  marginType: MarginType;
  margin: number;
  text: string;
}

export type MatchStatus = 'setup' | 'live' | 'completed';

export interface Match {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: MatchStatus;
  format: MatchFormat;
  totalOvers: number;
  playersPerSide: number;
  venue: string;
  team1: Team;
  team2: Team;
  toss: Toss;
  rules: MatchRules;
  innings: Innings[];
  currentInningsIndex: number;
  result: MatchResult | null;
  shareCode: string; // 6-digit co-scoring code
  // Competition links (all optional — a casual match needs none of these).
  team1ClubId?: string | null;
  team2ClubId?: string | null;
  tournamentId?: string | null;
}

/** A saved rule-set the user can re-apply in one tap. */
export interface MatchTemplate {
  id: string;
  name: string;
  format: MatchFormat;
  totalOvers: number;
  playersPerSide: number;
  rules: MatchRules;
}

/* ----------------------------- Practice mode ----------------------------- */

export interface PracticeBall {
  runs: number;
  isDot: boolean;
  isBoundary: boolean;
  isWicket: boolean;
}

export interface PracticeSession {
  id: string;
  createdAt: number;
  targetRuns: number;
  targetBalls: number;
  ballsFaced: number;
  runsScored: number;
  dots: number;
  boundaries: number;
  fours: number;
  sixes: number;
  wickets: number;
  balls: PracticeBall[];
  achieved: boolean;
}

/* --------------------------- Aggregated stats ---------------------------- */

export interface PlayerCareerStats {
  playerName: string;
  matches: number;
  // batting
  battingInnings: number;
  runs: number;
  ballsFaced: number;
  highestScore: number;
  highestNotOut: boolean;
  notOuts: number;
  fours: number;
  sixes: number;
  fifties: number;
  hundreds: number;
  average: number;
  strikeRate: number;
  // bowling
  bowlingInnings: number;
  wickets: number;
  runsConceded: number;
  ballsBowled: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
  bowlingAverage: number;
  economy: number;
}
