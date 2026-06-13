/**
 * Format presets and rule defaults. Picking a format pre-fills overs, player
 * count and sensible rules so a casual match can start in seconds.
 */
import { BallType, MatchFormat, MatchRules, WicketType } from '@/types/cricket';

export const DEFAULT_RULES: MatchRules = {
  lbw: false, // OFF by default per spec — casual matches rarely call LBW
  ohob: false,
  tipAndRun: false,
  boundaryOnFull: false,
  unlimitedOvers: false,
  noWideLeg: false,
  lastManStands: false,
  wagonWheel: false,
  ballType: 'tennis',
};

export interface FormatPreset {
  format: MatchFormat;
  label: string;
  emoji: string;
  overs: number;
  playersPerSide: number;
  rules: Partial<MatchRules>;
  description: string;
}

export const FORMAT_PRESETS: FormatPreset[] = [
  {
    format: 'T20',
    label: 'T20',
    emoji: '⚡',
    overs: 20,
    playersPerSide: 11,
    rules: { ballType: 'leather', lbw: true },
    description: '20 overs a side',
  },
  {
    format: 'ODI',
    label: 'ODI',
    emoji: '🏟️',
    overs: 50,
    playersPerSide: 11,
    rules: { ballType: 'leather', lbw: true },
    description: '50 overs a side',
  },
  {
    format: 'Test',
    label: 'Test',
    emoji: '🎩',
    overs: 90,
    playersPerSide: 11,
    rules: { ballType: 'leather', lbw: true, unlimitedOvers: true },
    description: 'Long format',
  },
  {
    format: 'Box',
    label: 'Box Cricket',
    emoji: '📦',
    overs: 6,
    playersPerSide: 7,
    rules: {
      ballType: 'tennis',
      ohob: true,
      boundaryOnFull: true,
      lastManStands: true,
      unlimitedOvers: true,
    },
    description: 'Indoor / turf rules',
  },
  {
    format: 'Pairs',
    label: 'Pairs',
    emoji: '👥',
    overs: 8,
    playersPerSide: 8,
    rules: { ballType: 'tennis', lastManStands: true },
    description: 'Bat in pairs',
  },
  {
    format: 'Custom',
    label: 'Custom',
    emoji: '🛠️',
    overs: 10,
    playersPerSide: 8,
    rules: { ballType: 'tennis' },
    description: 'Your rules',
  },
];

export const BALL_TYPES: { value: BallType; label: string; emoji: string }[] = [
  { value: 'tennis', label: 'Tennis', emoji: '🎾' },
  { value: 'tape', label: 'Tape', emoji: '🩹' },
  { value: 'leather', label: 'Leather', emoji: '🏏' },
];

export interface RuleMeta {
  key: keyof Omit<MatchRules, 'ballType'>;
  label: string;
  help: string;
}

export const RULE_TOGGLES: RuleMeta[] = [
  { key: 'lbw', label: 'LBW', help: 'Allow leg-before-wicket dismissals' },
  { key: 'ohob', label: 'One Hand One Bounce', help: 'One-hand catch after a bounce is out' },
  { key: 'tipAndRun', label: 'Tip and Run', help: 'Any bat contact means batters must run' },
  { key: 'boundaryOnFull', label: 'Boundary on Full = Out', help: 'Clearing the boundary on the full is out' },
  { key: 'unlimitedOvers', label: 'Unlimited Overs / Bowler', help: 'A bowler can bowl any number of overs' },
  { key: 'noWideLeg', label: 'No Wide Down Leg', help: 'Leg-side deliveries are never wides' },
  { key: 'lastManStands', label: 'Last Man Stands', help: 'Final batter can bat alone' },
  { key: 'wagonWheel', label: 'Wagon Wheel', help: 'Capture shot direction (optional)' },
];

/** Dismissals available in the wicket modal, gated by the active rule-set. */
export const ALL_WICKET_TYPES: WicketType[] = [
  'Bowled',
  'Caught',
  'LBW',
  'Run Out',
  'Stumped',
  'Hit Wicket',
  'Retired',
  'One Hand Catch',
  'Boundary on Full',
  'Tip and Run Run Out',
];

/** Dismissals that credit the bowler with a wicket. */
export const BOWLER_CREDITED_WICKETS: WicketType[] = [
  'Bowled',
  'Caught',
  'LBW',
  'Stumped',
  'Hit Wicket',
  'One Hand Catch',
  'Boundary on Full',
];

/** Dismissals that need a fielder to be named. */
export const FIELDER_WICKETS: WicketType[] = [
  'Caught',
  'Run Out',
  'Stumped',
  'One Hand Catch',
  'Tip and Run Run Out',
];

export const OVERS_OPTIONS = [2, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];
