/**
 * Post-match AI report. Collects every ball's commentary plus the headline
 * numbers and asks a configured AI endpoint for a short (~150-word) paragraph.
 * Gated on `isAiReportConfigured` — with no endpoint set it returns null so the
 * UI simply omits the report card. Never throws.
 */
import { Match } from '@/types/cricket';
import { AI_REPORT_URL, isAiReportConfigured } from '@/lib/env';
import { formatOvers } from '@/utils/cricket';

/** Build the prompt from the match's commentary log + key figures. */
export function buildReportPrompt(match: Match): string {
  const lines: string[] = [];
  lines.push(`Match: ${match.team1.name} vs ${match.team2.name} (${match.format}, ${match.totalOvers} overs).`);
  if (match.venue) lines.push(`Venue: ${match.venue}.`);
  if (match.result?.text) lines.push(`Result: ${match.result.text}.`);
  match.innings.forEach((inn, i) => {
    lines.push(
      `Innings ${i + 1}: ${inn.battingTeamName} ${inn.totalRuns}/${inn.totalWickets} in ${formatOvers(inn.legalBalls)} overs.`,
    );
  });
  // a trimmed commentary feed keeps the prompt compact
  const commentary = match.innings
    .flatMap((inn) => inn.balls.map((b) => b.commentary).filter(Boolean))
    .filter((c) => /four|six|out|wicket|fifty|century|won|maiden/i.test(c))
    .slice(0, 40);
  if (commentary.length) {
    lines.push('Key moments:');
    lines.push(...commentary);
  }
  lines.push(
    'Write a lively ~150-word match report paragraph summarising the game, the turning points and the standout performers. No bullet points.',
  );
  return lines.join('\n');
}

/**
 * Generate a report. Returns the text, or null when no endpoint is configured
 * or the request fails. The caller is responsible for storing it on the match.
 */
export async function generateMatchReport(match: Match): Promise<string | null> {
  if (!isAiReportConfigured) return null;
  try {
    const res = await fetch(AI_REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: buildReportPrompt(match) }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string; report?: string };
    const text = (data.text ?? data.report ?? '').trim();
    return text.length ? text : null;
  } catch {
    return null;
  }
}
