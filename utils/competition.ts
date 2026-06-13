/**
 * Competition maths — club career stats, tournament points tables (with proper
 * Net Run Rate), and the app-wide Hall of Fame records board.
 */
import { Innings, Match } from '@/types/cricket';
import {
  Club,
  ClubStats,
  HallOfFame,
  PointsRow,
  RecordHolder,
  Tournament,
  TournamentEntry,
} from '@/types/clubs';
import { aggregateMVP } from '@/utils/mvp';

const lc = (s: string) => s.trim().toLowerCase();

/** Which side (1 or 2) a club is in a match, or null if not involved. */
export function clubSide(match: Match, clubId: string): 1 | 2 | null {
  if (match.team1ClubId === clubId) return 1;
  if (match.team2ClubId === clubId) return 2;
  return null;
}

/** Which side a tournament entry is in a match (by club id, else by team name). */
function entrySide(match: Match, entry: TournamentEntry): 1 | 2 | null {
  if (entry.clubId) return clubSide(match, entry.clubId);
  if (lc(match.team1.name) === lc(entry.name)) return 1;
  if (lc(match.team2.name) === lc(entry.name)) return 2;
  return null;
}

function inningsForSide(match: Match, side: 1 | 2): Innings | undefined {
  return match.innings.find((i) => i.battingTeam === side);
}

/** Overs to use for NRR — a side bowled out counts its full quota. */
function nrrOvers(innings: Innings | undefined, totalOvers: number): number {
  if (!innings) return 0;
  const allOut = innings.totalWickets >= innings.maxWickets;
  return allOut ? totalOvers : innings.legalBalls / 6;
}

/* ------------------------------ club stats ------------------------------- */

export function computeClubStats(club: Club, matches: Match[], tournaments: Tournament[]): ClubStats {
  const stats: ClubStats = {
    clubId: club.id,
    name: club.name,
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    noResult: 0,
    winPct: 0,
    runsScored: 0,
    runsConceded: 0,
    highestTotal: 0,
    titles: tournaments.filter((t) => t.championClubId === club.id).length,
    topScorerName: null,
    topScorerRuns: 0,
    topWicketName: null,
    topWickets: 0,
  };

  const memberKeys = new Set(club.members.map((m) => lc(m.name)));
  const runsByMember = new Map<string, { name: string; runs: number }>();
  const wktsByMember = new Map<string, { name: string; wickets: number }>();

  for (const match of matches) {
    if (match.status !== 'completed') continue;
    const side = clubSide(match, club.id);
    if (!side) continue;
    stats.played += 1;

    const ours = inningsForSide(match, side);
    const theirs = inningsForSide(match, side === 1 ? 2 : 1);
    if (ours) {
      stats.runsScored += ours.totalRuns;
      stats.highestTotal = Math.max(stats.highestTotal, ours.totalRuns);
    }
    if (theirs) stats.runsConceded += theirs.totalRuns;

    if (match.result) {
      if (match.result.marginType === 'noresult') stats.noResult += 1;
      else if (match.result.marginType === 'tie') stats.tied += 1;
      else if (match.result.winnerTeam === side) stats.won += 1;
      else stats.lost += 1;
    }

    for (const innings of match.innings) {
      for (const bat of innings.batsmen) {
        if (!memberKeys.has(lc(bat.name))) continue;
        const cur = runsByMember.get(lc(bat.name)) ?? { name: bat.name, runs: 0 };
        cur.runs += bat.runs;
        runsByMember.set(lc(bat.name), cur);
      }
      for (const bowl of innings.bowlers) {
        if (!memberKeys.has(lc(bowl.name))) continue;
        const cur = wktsByMember.get(lc(bowl.name)) ?? { name: bowl.name, wickets: 0 };
        cur.wickets += bowl.wickets;
        wktsByMember.set(lc(bowl.name), cur);
      }
    }
  }

  for (const r of runsByMember.values()) {
    if (r.runs > stats.topScorerRuns) {
      stats.topScorerRuns = r.runs;
      stats.topScorerName = r.name;
    }
  }
  for (const w of wktsByMember.values()) {
    if (w.wickets > stats.topWickets) {
      stats.topWickets = w.wickets;
      stats.topWicketName = w.name;
    }
  }

  stats.winPct = stats.played ? (stats.won / stats.played) * 100 : 0;
  return stats;
}

/* --------------------------- tournament tables --------------------------- */

export function tournamentMatches(tournament: Tournament, matches: Match[]): Match[] {
  return matches
    .filter((m) => m.tournamentId === tournament.id)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function computeStandings(tournament: Tournament, matches: Match[]): PointsRow[] {
  const completed = tournamentMatches(tournament, matches).filter((m) => m.status === 'completed');

  const rows: PointsRow[] = tournament.entries.map((entry) => ({
    name: entry.name,
    clubId: entry.clubId,
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    noResult: 0,
    points: 0,
    runsFor: 0,
    oversFor: 0,
    runsAgainst: 0,
    oversAgainst: 0,
    nrr: 0,
  }));

  rows.forEach((row, i) => {
    const entry = tournament.entries[i];
    for (const match of completed) {
      const side = entrySide(match, entry);
      if (!side) continue;
      row.played += 1;
      const ours = inningsForSide(match, side);
      const theirs = inningsForSide(match, side === 1 ? 2 : 1);
      row.runsFor += ours?.totalRuns ?? 0;
      row.oversFor += nrrOvers(ours, match.totalOvers);
      row.runsAgainst += theirs?.totalRuns ?? 0;
      row.oversAgainst += nrrOvers(theirs, match.totalOvers);

      if (match.result) {
        if (match.result.marginType === 'noresult') {
          row.noResult += 1;
          row.points += 1;
        } else if (match.result.marginType === 'tie') {
          row.tied += 1;
          row.points += 1;
        } else if (match.result.winnerTeam === side) {
          row.won += 1;
          row.points += 2;
        } else {
          row.lost += 1;
        }
      }
    }
    const forRate = row.oversFor > 0 ? row.runsFor / row.oversFor : 0;
    const againstRate = row.oversAgainst > 0 ? row.runsAgainst / row.oversAgainst : 0;
    row.nrr = forRate - againstRate;
  });

  return rows.sort((a, b) => b.points - a.points || b.nrr - a.nrr || b.won - a.won);
}

/* ------------------------------ hall of fame ----------------------------- */

function topN<T>(items: T[], n: number, value: (t: T) => number): T[] {
  return [...items].sort((a, b) => value(b) - value(a)).slice(0, n);
}

export function computeHallOfFame(matches: Match[], tournaments: Tournament[]): HallOfFame {
  const completed = matches.filter((m) => m.status === 'completed');

  const runs = new Map<string, RecordHolder>();
  const wkts = new Map<string, RecordHolder>();
  const sixes = new Map<string, RecordHolder>();
  const appearances = new Map<string, RecordHolder>();
  const highScores: RecordHolder[] = [];
  const bestFigures: { holder: RecordHolder; wickets: number; conceded: number }[] = [];
  const teamTotals: RecordHolder[] = [];

  for (const match of completed) {
    const vs = `${match.team1.name} v ${match.team2.name}`;
    const counted = new Set<string>();
    for (const p of [...match.team1.players, ...match.team2.players]) {
      const k = lc(p.name);
      if (counted.has(k)) continue;
      counted.add(k);
      const a = appearances.get(k) ?? { name: p.name, value: 0, detail: 'matches' };
      a.value += 1;
      appearances.set(k, a);
    }

    for (const innings of match.innings) {
      teamTotals.push({
        name: innings.battingTeamName,
        value: innings.totalRuns,
        detail: `${innings.totalRuns}/${innings.totalWickets} vs ${innings.bowlingTeamName}`,
      });
      for (const bat of innings.batsmen) {
        if (!bat.hasBatted) continue;
        const k = lc(bat.name);
        const r = runs.get(k) ?? { name: bat.name, value: 0, detail: 'runs' };
        r.value += bat.runs;
        runs.set(k, r);
        const s = sixes.get(k) ?? { name: bat.name, value: 0, detail: 'sixes' };
        s.value += bat.sixes;
        sixes.set(k, s);
        if (bat.runs > 0) {
          highScores.push({
            name: bat.name,
            value: bat.runs,
            detail: `${bat.runs}${bat.isOut ? '' : '*'} (${bat.balls}) • ${vs}`,
          });
        }
      }
      for (const bowl of innings.bowlers) {
        if (bowl.legalBalls === 0 && bowl.wickets === 0) continue;
        const k = lc(bowl.name);
        const w = wkts.get(k) ?? { name: bowl.name, value: 0, detail: 'wickets' };
        w.value += bowl.wickets;
        wkts.set(k, w);
        if (bowl.wickets > 0) {
          bestFigures.push({
            holder: { name: bowl.name, value: bowl.wickets, detail: `${bowl.wickets}/${bowl.runs} • ${vs}` },
            wickets: bowl.wickets,
            conceded: bowl.runs,
          });
        }
      }
    }
  }

  const mvp = aggregateMVP(completed)
    .filter((m) => m.mvpAwards > 0)
    .map<RecordHolder>((m) => ({ name: m.name, value: m.mvpAwards, detail: `${m.mvpAwards} MVP • ${m.points} pts` }));

  const titleMap = new Map<string, RecordHolder>();
  for (const t of tournaments) {
    if (t.status !== 'completed' || !t.championName) continue;
    const k = lc(t.championName);
    const cur = titleMap.get(k) ?? { name: t.championName, value: 0, detail: 'titles' };
    cur.value += 1;
    titleMap.set(k, cur);
  }

  return {
    mostRuns: topN(Array.from(runs.values()), 5, (r) => r.value),
    mostWickets: topN(Array.from(wkts.values()), 5, (r) => r.value),
    highestScores: topN(highScores, 5, (r) => r.value),
    bestBowling: [...bestFigures]
      .sort((a, b) => b.wickets - a.wickets || a.conceded - b.conceded)
      .slice(0, 5)
      .map((b) => b.holder),
    mostMVPs: topN(mvp, 5, (r) => r.value),
    mostSixes: topN(Array.from(sixes.values()).filter((s) => s.value > 0), 5, (r) => r.value),
    mostMatches: topN(Array.from(appearances.values()), 5, (r) => r.value),
    highestTeamTotals: topN(teamTotals, 5, (r) => r.value),
    mostTitles: topN(Array.from(titleMap.values()), 5, (r) => r.value),
  };
}
