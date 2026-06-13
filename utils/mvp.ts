/**
 * MVP engine. Builds a per-player performance line for a match (batting +
 * bowling + fielding) and scores it with a transparent points index, then
 * picks the match MVP. Also aggregates across a set of matches for a
 * tournament MVP leaderboard.
 */
import { Match } from '@/types/cricket';
import { MVPResult, PlayerPerformance } from '@/types/clubs';

function blank(name: string): PlayerPerformance {
  return {
    name,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    out: false,
    wickets: 0,
    maidens: 0,
    runsConceded: 0,
    ballsBowled: 0,
    catches: 0,
    stumpings: 0,
    runouts: 0,
    points: 0,
  };
}

/** Transparent scoring: rewards runs, boundaries, milestones, wickets, fielding. */
export function performancePoints(p: PlayerPerformance): number {
  let pts = 0;
  // batting
  pts += p.runs;
  pts += p.fours * 1 + p.sixes * 2;
  if (p.runs >= 30) pts += 5;
  if (p.runs >= 50) pts += 10;
  if (p.runs >= 100) pts += 25;
  // bowling
  pts += p.wickets * 25;
  pts += p.maidens * 8;
  if (p.wickets >= 3) pts += 10;
  if (p.wickets >= 5) pts += 25;
  if (p.ballsBowled >= 12) {
    const econ = p.runsConceded / (p.ballsBowled / 6);
    if (econ < 6) pts += 8;
  }
  // fielding
  pts += p.catches * 8 + p.stumpings * 10 + p.runouts * 8;
  return pts;
}

/** Per-player performance map for a single match, keyed by lower-cased name. */
export function buildMatchPerformances(match: Match): Map<string, PlayerPerformance> {
  const map = new Map<string, PlayerPerformance>();
  const idToName = new Map<string, string>();
  for (const p of [...match.team1.players, ...match.team2.players]) idToName.set(p.id, p.name);

  const get = (name: string): PlayerPerformance => {
    const key = name.trim().toLowerCase();
    let perf = map.get(key);
    if (!perf) {
      perf = blank(name);
      map.set(key, perf);
    }
    return perf;
  };

  for (const innings of match.innings) {
    for (const bat of innings.batsmen) {
      if (!bat.hasBatted) continue;
      const p = get(bat.name);
      p.runs += bat.runs;
      p.ballsFaced += bat.balls;
      p.fours += bat.fours;
      p.sixes += bat.sixes;
      if (bat.isOut) p.out = true;
    }
    for (const bowl of innings.bowlers) {
      if (bowl.legalBalls === 0 && bowl.wickets === 0) continue;
      const p = get(bowl.name);
      p.wickets += bowl.wickets;
      p.maidens += bowl.maidens;
      p.runsConceded += bowl.runs;
      p.ballsBowled += bowl.legalBalls;
    }
    for (const ball of innings.balls) {
      if (!ball.isWicket || !ball.fielderId) continue;
      const fielderName = idToName.get(ball.fielderId);
      if (!fielderName) continue;
      const p = get(fielderName);
      if (ball.wicketType === 'Caught' || ball.wicketType === 'One Hand Catch') p.catches += 1;
      else if (ball.wicketType === 'Stumped') p.stumpings += 1;
      else if (ball.wicketType === 'Run Out' || ball.wicketType === 'Tip and Run Run Out') p.runouts += 1;
    }
  }

  for (const perf of map.values()) perf.points = performancePoints(perf);
  return map;
}

export function performanceSummary(p: PlayerPerformance): string {
  const parts: string[] = [];
  if (p.ballsFaced > 0 || p.runs > 0) parts.push(`${p.runs}${p.out ? '' : '*'} (${p.ballsFaced})`);
  if (p.ballsBowled > 0) parts.push(`${p.wickets}/${p.runsConceded}`);
  const field = p.catches + p.stumpings + p.runouts;
  if (field > 0 && parts.length < 2) parts.push(`${field} fld`);
  return parts.join(' & ') || '—';
}

/** The single best performer in a completed match. */
export function computeMatchMVP(match: Match): MVPResult | null {
  const perfs = Array.from(buildMatchPerformances(match).values());
  let best: PlayerPerformance | null = null;
  for (const p of perfs) {
    if (p.points <= 0) continue;
    if (!best || p.points > best.points) best = p;
  }
  if (!best) return null;
  return { name: best.name, points: best.points, summary: performanceSummary(best) };
}

/** Aggregate MVP points across many matches → leaderboard (desc). */
export function aggregateMVP(matches: Match[]): { name: string; points: number; mvpAwards: number }[] {
  const totals = new Map<string, { name: string; points: number; mvpAwards: number }>();
  for (const match of matches) {
    const perfs = buildMatchPerformances(match);
    let mvpKey: string | null = null;
    let mvpPts = 0;
    for (const [key, perf] of perfs) {
      const cur = totals.get(key) ?? { name: perf.name, points: 0, mvpAwards: 0 };
      cur.points += perf.points;
      totals.set(key, cur);
      if (perf.points > mvpPts) {
        mvpPts = perf.points;
        mvpKey = key;
      }
    }
    if (mvpKey && mvpPts > 0) {
      const cur = totals.get(mvpKey)!;
      cur.mvpAwards += 1;
    }
  }
  return Array.from(totals.values()).sort((a, b) => b.points - a.points);
}
