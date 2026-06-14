/**
 * Derived match maths: run rates, projections, partnerships, and aggregating
 * a player's career stats across a list of matches.
 */
import {
  Innings,
  Match,
  MatchFormat,
  PlayerCareerStats,
} from '@/types/cricket';
import { oversFloat } from '@/utils/cricket';
import { buildMatchPerformances } from '@/utils/mvp';

export function currentRunRate(innings: Innings): number {
  const overs = oversFloat(innings.legalBalls);
  if (overs === 0) return 0;
  return innings.totalRuns / overs;
}

/** Projected final score = current run rate × total overs. */
export function projectedScore(innings: Innings): number {
  const crr = currentRunRate(innings);
  return Math.round(crr * innings.totalOvers);
}

export interface ChaseInfo {
  target: number;
  runsNeeded: number;
  ballsRemaining: number;
  requiredRunRate: number;
}

export function chaseInfo(innings: Innings): ChaseInfo | null {
  if (innings.target == null) return null;
  const ballsRemaining = innings.totalOvers * 6 - innings.legalBalls;
  const runsNeeded = Math.max(0, innings.target - innings.totalRuns);
  const oversRemaining = ballsRemaining / 6;
  const requiredRunRate = oversRemaining > 0 ? runsNeeded / oversRemaining : 0;
  return {
    target: innings.target,
    runsNeeded,
    ballsRemaining,
    requiredRunRate,
  };
}

export interface Partnership {
  runs: number;
  balls: number;
  strikerName: string;
  nonStrikerName: string;
}

/**
 * The current (unbroken) partnership: runs added since the last wicket fell,
 * counting balls faced by either current batter.
 */
export function currentPartnership(innings: Innings): Partnership {
  const striker = innings.batsmen.find((b) => b.playerId === innings.strikerId);
  const nonStriker = innings.batsmen.find((b) => b.playerId === innings.nonStrikerId);

  // runs since last wicket
  const lastWicketScore =
    innings.fallOfWickets.length > 0
      ? innings.fallOfWickets[innings.fallOfWickets.length - 1].score
      : 0;
  const runs = innings.totalRuns - lastWicketScore;

  // balls since last wicket (legal balls faced by current pair contribution)
  let balls = 0;
  for (let i = innings.balls.length - 1; i >= 0; i--) {
    const b = innings.balls[i];
    if (b.isWicket && b.wicketType !== 'Retired') break;
    if (b.isLegal) balls += 1;
  }

  return {
    runs,
    balls,
    strikerName: striker?.name ?? '—',
    nonStrikerName: nonStriker?.name ?? '—',
  };
}

export function economyRate(legalBalls: number, runs: number): number {
  const overs = oversFloat(legalBalls);
  if (overs === 0) return 0;
  return runs / overs;
}

export function strikeRate(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return (runs / balls) * 100;
}

export function battingAverage(runs: number, dismissals: number): number {
  if (dismissals === 0) return runs;
  return runs / dismissals;
}

export function formatRate(rate: number): string {
  return rate.toFixed(2);
}

/* ------------------------- career stat aggregation ------------------------ */

function emptyCareer(name: string): PlayerCareerStats {
  return {
    playerName: name,
    matches: 0,
    battingInnings: 0,
    runs: 0,
    ballsFaced: 0,
    highestScore: 0,
    highestNotOut: false,
    notOuts: 0,
    fours: 0,
    sixes: 0,
    fifties: 0,
    hundreds: 0,
    average: 0,
    strikeRate: 0,
    bowlingInnings: 0,
    wickets: 0,
    runsConceded: 0,
    ballsBowled: 0,
    bestBowlingWickets: 0,
    bestBowlingRuns: 0,
    bowlingAverage: 0,
    economy: 0,
  };
}

/**
 * Aggregate one player's career across every completed match. Players are
 * matched by name (casual matches rarely keep stable ids across games).
 */
export function aggregatePlayerStats(playerName: string, matches: Match[]): PlayerCareerStats {
  const stats = emptyCareer(playerName);
  const key = playerName.trim().toLowerCase();
  let dismissals = 0;

  for (const match of matches) {
    let appearedInMatch = false;

    for (const innings of match.innings) {
      // batting
      for (const bat of innings.batsmen) {
        if (bat.name.trim().toLowerCase() !== key) continue;
        if (!bat.hasBatted) continue;
        appearedInMatch = true;
        stats.battingInnings += 1;
        stats.runs += bat.runs;
        stats.ballsFaced += bat.balls;
        stats.fours += bat.fours;
        stats.sixes += bat.sixes;
        if (bat.runs >= 100) stats.hundreds += 1;
        else if (bat.runs >= 50) stats.fifties += 1;
        if (bat.runs > stats.highestScore) {
          stats.highestScore = bat.runs;
          stats.highestNotOut = !bat.isOut;
        }
        if (!bat.isOut) stats.notOuts += 1;
        else dismissals += 1;
      }

      // bowling
      for (const bowl of innings.bowlers) {
        if (bowl.name.trim().toLowerCase() !== key) continue;
        if (bowl.legalBalls === 0 && bowl.wickets === 0) continue;
        appearedInMatch = true;
        stats.bowlingInnings += 1;
        stats.wickets += bowl.wickets;
        stats.runsConceded += bowl.runs;
        stats.ballsBowled += bowl.legalBalls;
        const better =
          bowl.wickets > stats.bestBowlingWickets ||
          (bowl.wickets === stats.bestBowlingWickets && bowl.runs < stats.bestBowlingRuns);
        if (stats.bowlingInnings === 1 || better) {
          stats.bestBowlingWickets = bowl.wickets;
          stats.bestBowlingRuns = bowl.runs;
        }
      }
    }

    if (appearedInMatch) stats.matches += 1;
  }

  stats.average = dismissals === 0 ? stats.runs : stats.runs / dismissals;
  stats.strikeRate = strikeRate(stats.runs, stats.ballsFaced);
  stats.bowlingAverage = stats.wickets === 0 ? 0 : stats.runsConceded / stats.wickets;
  stats.economy = economyRate(stats.ballsBowled, stats.runsConceded);
  return stats;
}

/** All distinct player names seen across saved matches (for the stats list). */
export function allPlayerNames(matches: Match[]): string[] {
  const set = new Set<string>();
  for (const match of matches) {
    for (const p of match.team1.players) set.add(p.name);
    for (const p of match.team2.players) set.add(p.name);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/* --------------------------- player profile extras ----------------------- */

const nameKey = (s: string) => s.trim().toLowerCase();

/** A stable, human-friendly profile id derived from the player's name. */
export function profileId(name: string): string {
  const alpha = name.toLowerCase().replace(/[^a-z]/g, '');
  const tail = (alpha.slice(-4) || 'plyr').padStart(4, 'x');
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `${tail}${(h % 10000).toString().padStart(4, '0')}`;
}

export interface FormInnings {
  runs: number;
  balls: number;
  notOut: boolean;
}

/** Most-recent-first batting innings for the recent-form strip. */
export function recentForm(name: string, matches: Match[], limit = 8): FormInnings[] {
  const key = nameKey(name);
  const out: FormInnings[] = [];
  for (const m of matches) {
    for (const inn of m.innings) {
      const bat = inn.batsmen.find((b) => nameKey(b.name) === key && b.hasBatted);
      if (bat) out.push({ runs: bat.runs, balls: bat.balls, notOut: !bat.isOut });
    }
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}

/** Career fielding totals (catches / stumpings / run-outs) for a player. */
export function aggregateFielding(name: string, matches: Match[]) {
  const key = nameKey(name);
  let catches = 0;
  let stumpings = 0;
  let runouts = 0;
  for (const m of matches) {
    const perf = buildMatchPerformances(m).get(key);
    if (perf) {
      catches += perf.catches;
      stumpings += perf.stumpings;
      runouts += perf.runouts;
    }
  }
  return { catches, stumpings, runouts };
}

export interface FormatStats {
  format: MatchFormat;
  stats: PlayerCareerStats;
}

/** Per-format career breakdown (only formats the player has appeared in). */
export function statsByFormat(name: string, matches: Match[]): FormatStats[] {
  const formats = Array.from(new Set(matches.map((m) => m.format)));
  return formats
    .map((f) => ({ format: f, stats: aggregatePlayerStats(name, matches.filter((m) => m.format === f)) }))
    .filter((row) => row.stats.matches > 0)
    .sort((a, b) => b.stats.runs - a.stats.runs);
}
