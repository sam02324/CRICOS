/**
 * WhatsApp / Instagram share helpers. Builds a clean text summary and captures
 * the on-screen scorecard card into an image via react-native-view-shot, then
 * hands it to the native share sheet via expo-sharing.
 */
import { Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Match } from '@/types/cricket';
import { bestBowler, formatOvers, topScorer } from '@/utils/cricket';

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━';

/** The shareable text block (mirrors the on-image layout for plain-text shares). */
export function buildShareText(match: Match): string {
  const [first, second] = match.innings;
  const lines: string[] = [];
  lines.push(DIVIDER);
  lines.push('🏏 Match Result');
  lines.push(`${match.team1.name} vs ${match.team2.name}`);
  lines.push(DIVIDER);

  if (first) {
    lines.push(
      `${first.battingTeamName}: ${first.totalRuns}/${first.totalWickets} (${formatOvers(first.legalBalls)} ov)`,
    );
  }
  if (second) {
    lines.push(
      `${second.battingTeamName}: ${second.totalRuns}/${second.totalWickets} (${formatOvers(second.legalBalls)} ov)`,
    );
  }
  lines.push('');

  if (match.result) {
    lines.push(`Result: ${match.result.text} 🎉`);
    lines.push('');
  }

  // Highlights pulled from whichever innings holds the standout performances.
  const allInnings = match.innings.filter(Boolean);
  let topBat = topScorer(allInnings[0] ?? first);
  for (const inn of allInnings) {
    const t = topScorer(inn);
    if (t && (!topBat || t.runs > topBat.runs)) topBat = t;
  }
  let topBowl = bestBowler(allInnings[0] ?? first);
  for (const inn of allInnings) {
    const b = bestBowler(inn);
    if (b && (!topBowl || b.wickets > topBowl.wickets)) topBowl = b;
  }

  if (topBat && topBat.balls > 0) {
    lines.push(`Top Scorer: ${topBat.name} - ${topBat.runs}(${topBat.balls}) 💥`);
  }
  if (topBowl && topBowl.legalBalls > 0) {
    lines.push(
      `Best Bowler: ${topBowl.name} - ${topBowl.wickets}/${topBowl.runs} 🎯`,
    );
  }

  lines.push(DIVIDER);
  lines.push('Scored with CRICOS 🏏');
  return lines.join('\n');
}

/** Capture a view ref to a PNG file URI. */
export async function captureCard(ref: React.RefObject<unknown>): Promise<string> {
  return captureRef(ref as never, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
  });
}

/** Share the captured scorecard image through the OS share sheet. */
export async function shareMatchImage(ref: React.RefObject<unknown>): Promise<boolean> {
  try {
    const available = await Sharing.isAvailableAsync();
    const uri = await captureCard(ref);
    if (available) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share match result',
        UTI: 'public.png',
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Whether native sharing is usable on this device. */
export async function canShare(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return Sharing.isAvailableAsync();
}
