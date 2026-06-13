/**
 * CRICOS scoring engine.
 *
 * Pure-ish helpers + delivery mutators. The Zustand store deep-clones a match
 * into its undo stack BEFORE calling `applyDelivery`, so these functions mutate
 * the live innings draft in place — that keeps the logic readable while undo
 * stays bullet-proof (just restore the previous clone).
 */
import {
  Ball,
  BatsmanInnings,
  BowlerInnings,
  ExtraType,
  Innings,
  Match,
  MatchResult,
  MatchRules,
  Team,
  Toss,
  WicketType,
} from '@/types/cricket';
import { BOWLER_CREDITED_WICKETS } from '@/constants/formats';

/* ------------------------------- ids / time ------------------------------ */

export function uid(prefix = ''): string {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

export function generateShareCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ------------------------------ over helpers ----------------------------- */

/** Legal balls -> "overs.balls" display, e.g. 27 -> "4.3". */
export function formatOvers(legalBalls: number): string {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return `${overs}.${balls}`;
}

/** Legal balls -> true decimal overs for rate maths, e.g. 27 -> 4.5. */
export function oversFloat(legalBalls: number): number {
  return legalBalls / 6;
}

/** Runs charged to the bowler for a single delivery. */
export function bowlerChargedRuns(ball: Ball): number {
  const t = ball.extra.type;
  if (t === 'wide') return ball.extra.runs; // all wide runs
  if (t === 'noBall') return 1 + ball.runs; // penalty + runs off the bat
  if (t === 'bye' || t === 'legBye') return 0; // not the bowler's fault
  return ball.runs; // normal legal delivery
}

/** Total runs a delivery adds to the team score. */
export function deliveryTotalRuns(
  batRuns: number,
  extraType: ExtraType | null,
  extraRuns: number,
): number {
  switch (extraType) {
    case 'wide':
      return 1 + extraRuns;
    case 'noBall':
      return 1 + batRuns;
    case 'bye':
    case 'legBye':
      return extraRuns;
    default:
      return batRuns;
  }
}

/* ------------------------------- factories ------------------------------- */

export function createBatsman(
  player: { id: string; name: string },
  battingPosition: number,
): BatsmanInnings {
  return {
    playerId: player.id,
    name: player.name,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    isOut: false,
    isRetired: false,
    dismissal: null,
    bowlerName: null,
    fielderName: null,
    battingPosition,
    hasBatted: false,
  };
}

export function createBowler(player: { id: string; name: string }): BowlerInnings {
  return {
    playerId: player.id,
    name: player.name,
    legalBalls: 0,
    maidens: 0,
    runs: 0,
    wickets: 0,
    wides: 0,
    noBalls: 0,
  };
}

export function battingFirstTeam(toss: Toss): 1 | 2 {
  const other: 1 | 2 = toss.winnerTeam === 1 ? 2 : 1;
  return toss.choice === 'bat' ? toss.winnerTeam : other;
}

export function createInnings(
  match: Match,
  battingTeam: 1 | 2,
  target: number | null,
): Innings {
  const batting: Team = battingTeam === 1 ? match.team1 : match.team2;
  const bowling: Team = battingTeam === 1 ? match.team2 : match.team1;
  const maxWickets = match.rules.lastManStands
    ? batting.players.length
    : Math.max(1, batting.players.length - 1);

  return {
    battingTeam,
    battingTeamName: batting.name,
    bowlingTeamName: bowling.name,
    balls: [],
    batsmen: [],
    bowlers: [],
    extras: { wide: 0, noBall: 0, legBye: 0, bye: 0, penalty: 0 },
    totalRuns: 0,
    totalWickets: 0,
    legalBalls: 0,
    fallOfWickets: [],
    strikerId: null,
    nonStrikerId: null,
    currentBowlerId: null,
    previousBowlerId: null,
    isComplete: false,
    target,
    maxWickets,
    totalOvers: match.totalOvers,
  };
}

/* ------------------------------ lookups --------------------------------- */

export function findBatsman(innings: Innings, id: string | null): BatsmanInnings | undefined {
  if (!id) return undefined;
  return innings.batsmen.find((b) => b.playerId === id);
}

export function findBowler(innings: Innings, id: string | null): BowlerInnings | undefined {
  if (!id) return undefined;
  return innings.bowlers.find((b) => b.playerId === id);
}

/* --------------------------- the scoring core ---------------------------- */

export interface DeliveryInput {
  batRuns: number; // runs off the bat (also used for runs off a no-ball)
  extraType: ExtraType | null;
  extraRuns: number; // ran extras for wide/bye/legBye (excludes the 1-run penalty)
  isWicket: boolean;
  wicketType: WicketType | null;
  dismissedBatterId: string | null; // defaults to striker; may be non-striker on a run out
  fielderId: string | null;
  fielderName: string | null;
}

export interface DeliveryResult {
  overComplete: boolean;
  wicketFell: boolean;
  inningsComplete: boolean;
  vacatedSlot: 'striker' | 'nonStriker' | null;
  boundary: 4 | 6 | null;
  celebrated: '4' | '6' | 'W' | null;
}

const RETIRED: WicketType = 'Retired';

/**
 * Apply one delivery to the innings draft. Mutates `innings` in place and
 * returns flags the store/UI react to (over end, wicket, innings end).
 */
export function applyDelivery(
  innings: Innings,
  input: DeliveryInput,
  rules: MatchRules,
): DeliveryResult {
  const result: DeliveryResult = {
    overComplete: false,
    wicketFell: false,
    inningsComplete: false,
    vacatedSlot: null,
    boundary: null,
    celebrated: null,
  };

  const isLegal = input.extraType !== 'wide' && input.extraType !== 'noBall';
  const striker = findBatsman(innings, innings.strikerId);
  const bowler = findBowler(innings, innings.currentBowlerId);
  if (!striker || !bowler) return result; // guarded by the store, defensive here

  const overIndexForBall = Math.floor(innings.legalBalls / 6);

  // --- batter accounting ---
  striker.hasBatted = true;
  const facesBall = input.extraType !== 'wide';
  if (facesBall) striker.balls += 1;

  const isOffBat = input.extraType === null || input.extraType === 'noBall';
  if (isOffBat) {
    striker.runs += input.batRuns;
    if (input.batRuns === 4) {
      striker.fours += 1;
      result.boundary = 4;
    } else if (input.batRuns === 6) {
      striker.sixes += 1;
      result.boundary = 6;
    }
  }

  // --- bowler accounting ---
  if (isLegal) bowler.legalBalls += 1;
  if (input.extraType === 'wide') bowler.wides += 1 + input.extraRuns;
  if (input.extraType === 'noBall') bowler.noBalls += 1;

  // --- team totals / extras ---
  const total = deliveryTotalRuns(input.batRuns, input.extraType, input.extraRuns);
  innings.totalRuns += total;
  // bowler.runs is charged further below once the Ball record is synthesized.

  switch (input.extraType) {
    case 'wide':
      innings.extras.wide += 1 + input.extraRuns;
      break;
    case 'noBall':
      innings.extras.noBall += 1;
      break;
    case 'bye':
      innings.extras.bye += input.extraRuns;
      break;
    case 'legBye':
      innings.extras.legBye += input.extraRuns;
      break;
    default:
      break;
  }

  if (isLegal) innings.legalBalls += 1;

  const legalBallInOver = isLegal ? (innings.legalBalls % 6 === 0 ? 6 : innings.legalBalls % 6) : 0;

  // --- wicket ---
  if (input.isWicket && input.wicketType) {
    const dismissedId = input.dismissedBatterId ?? innings.strikerId;
    const victim = findBatsman(innings, dismissedId);
    if (victim) {
      if (input.wicketType === RETIRED) {
        victim.isRetired = true;
        victim.isOut = false;
        victim.dismissal = RETIRED;
      } else {
        victim.isOut = true;
        victim.dismissal = input.wicketType;
        victim.fielderName = input.fielderName;
        const credited = BOWLER_CREDITED_WICKETS.includes(input.wicketType);
        victim.bowlerName = credited ? bowler.name : null;
        if (credited) bowler.wickets += 1;
        innings.totalWickets += 1;
        innings.fallOfWickets.push({
          wicketNumber: innings.totalWickets,
          score: innings.totalRuns,
          overs: formatOvers(innings.legalBalls),
          batterName: victim.name,
        });
      }
      result.wicketFell = true;
      result.celebrated = 'W';
      if (dismissedId === innings.strikerId) result.vacatedSlot = 'striker';
      else if (dismissedId === innings.nonStrikerId) result.vacatedSlot = 'nonStriker';
    }
  }

  if (result.boundary && !result.celebrated) {
    result.celebrated = result.boundary === 6 ? '6' : '4';
  }

  // --- bowler runs charged (recompute from a synthesized ball for accuracy) ---
  const ball: Ball = {
    id: uid('b_'),
    overNumber: overIndexForBall,
    legalBallInOver,
    batterId: striker.playerId,
    nonStrikerId: innings.nonStrikerId ?? '',
    bowlerId: bowler.playerId,
    runs: isOffBat ? input.batRuns : 0,
    extra: {
      type: input.extraType,
      runs:
        input.extraType === 'wide'
          ? 1 + input.extraRuns
          : input.extraType === 'noBall'
            ? 1
            : input.extraType
              ? input.extraRuns
              : 0,
    },
    isWicket: input.isWicket,
    wicketType: input.wicketType,
    dismissedBatterId: input.isWicket ? (input.dismissedBatterId ?? innings.strikerId) : null,
    fielderId: input.fielderId,
    isLegal,
    swappedStrike: false,
    commentary: '',
  };
  bowler.runs += bowlerChargedRuns(ball);

  // --- strike rotation (parity of runs physically run) ---
  let crossing = 0;
  if (input.extraType === null || input.extraType === 'noBall') crossing = input.batRuns;
  else crossing = input.extraRuns; // wide / bye / legBye ran runs
  let swapped = false;
  // Only rotate when both ends are occupied (a lone "last man" never swaps).
  if (crossing % 2 === 1 && innings.strikerId && innings.nonStrikerId) {
    const tmp = innings.strikerId;
    innings.strikerId = innings.nonStrikerId;
    innings.nonStrikerId = tmp;
    swapped = true;
  }

  // Vacate the dismissed slot AFTER parity swap so the survivor keeps their end.
  if (result.vacatedSlot) {
    const dismissedId = input.dismissedBatterId ?? striker.playerId;
    if (innings.strikerId === dismissedId) innings.strikerId = null;
    else if (innings.nonStrikerId === dismissedId) innings.nonStrikerId = null;
  }

  ball.commentary = buildCommentary(input, result);
  ball.swappedStrike = swapped;
  innings.balls.push(ball);

  // --- over completion ---
  if (isLegal && innings.legalBalls % 6 === 0) {
    result.overComplete = true;
    // maiden? sum bowler-charged runs across this over's deliveries
    const overRuns = innings.balls
      .filter((b) => b.overNumber === overIndexForBall && b.bowlerId === bowler.playerId)
      .reduce((s, b) => s + bowlerChargedRuns(b), 0);
    if (overRuns === 0) bowler.maidens += 1;

    // end-of-over strike swap (only when both ends are occupied)
    if (innings.strikerId && innings.nonStrikerId) {
      const t = innings.strikerId;
      innings.strikerId = innings.nonStrikerId;
      innings.nonStrikerId = t;
    }

    innings.previousBowlerId = innings.currentBowlerId;
    innings.currentBowlerId = null;
  }

  // --- innings completion ---
  const allOut = innings.totalWickets >= innings.maxWickets;
  const oversDone = innings.legalBalls >= innings.totalOvers * 6;
  const chaseWon = innings.target != null && innings.totalRuns >= innings.target;
  if (allOut || oversDone || chaseWon) {
    innings.isComplete = true;
    result.inningsComplete = true;
    result.overComplete = false; // innings end supersedes the bowler prompt
  }

  return result;
}

function buildCommentary(input: DeliveryInput, result: DeliveryResult): string {
  if (input.isWicket && input.wicketType) {
    if (input.wicketType === RETIRED) return 'Retired — not out';
    return `OUT! ${input.wicketType}`;
  }
  switch (input.extraType) {
    case 'wide':
      return input.extraRuns > 0 ? `Wide + ${input.extraRuns}` : 'Wide';
    case 'noBall':
      return input.batRuns > 0 ? `No ball + ${input.batRuns}` : 'No ball';
    case 'bye':
      return `${input.extraRuns} bye${input.extraRuns === 1 ? '' : 's'}`;
    case 'legBye':
      return `${input.extraRuns} leg bye${input.extraRuns === 1 ? '' : 's'}`;
    default:
      if (input.batRuns === 0) return 'Dot ball';
      if (input.batRuns === 4) return 'FOUR!';
      if (input.batRuns === 6) return 'SIX!';
      return `${input.batRuns} run${input.batRuns === 1 ? '' : 's'}`;
  }
}

/* ------------------------------- results --------------------------------- */

export function computeResult(match: Match): MatchResult {
  const [first, second] = match.innings;
  if (!first || !second) {
    return { winnerTeam: null, winnerName: null, marginType: 'noresult', margin: 0, text: 'No result' };
  }

  const firstTeam = first.battingTeam;
  const secondTeam = second.battingTeam;
  const firstName = first.battingTeamName;
  const secondName = second.battingTeamName;

  if (second.totalRuns > first.totalRuns) {
    // chasing side won — margin in wickets remaining
    const wicketsLeft = second.maxWickets - second.totalWickets;
    return {
      winnerTeam: secondTeam,
      winnerName: secondName,
      marginType: 'wickets',
      margin: wicketsLeft,
      text: `${secondName} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? '' : 's'}`,
    };
  }

  if (first.totalRuns > second.totalRuns) {
    const margin = first.totalRuns - second.totalRuns;
    return {
      winnerTeam: firstTeam,
      winnerName: firstName,
      marginType: 'runs',
      margin,
      text: `${firstName} won by ${margin} run${margin === 1 ? '' : 's'}`,
    };
  }

  return { winnerTeam: null, winnerName: null, marginType: 'tie', margin: 0, text: 'Match Tied' };
}

/* ----------------------------- top performers ---------------------------- */

export function topScorer(innings: Innings): BatsmanInnings | null {
  let best: BatsmanInnings | null = null;
  for (const b of innings.batsmen) {
    if (!b.hasBatted) continue;
    if (!best || b.runs > best.runs) best = b;
  }
  return best;
}

export function bestBowler(innings: Innings): BowlerInnings | null {
  let best: BowlerInnings | null = null;
  for (const b of innings.bowlers) {
    if (b.legalBalls === 0 && b.wickets === 0) continue;
    if (!best) {
      best = b;
      continue;
    }
    if (b.wickets > best.wickets || (b.wickets === best.wickets && b.runs < best.runs)) {
      best = b;
    }
  }
  return best;
}
