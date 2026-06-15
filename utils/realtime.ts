/**
 * Supabase Realtime — live spectator sync. The scorer broadcasts the full match
 * snapshot on `match:<shareCode>` after every delivery; spectators subscribe to
 * the same channel and render a read-only board. All no-ops gracefully when
 * Supabase isn't configured, so offline scoring is never affected.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Match } from '@/types/cricket';

const EVENT = 'match_state';

export function channelName(shareCode: string): string {
  return `match:${shareCode}`;
}

// One broadcast channel per share code is reused across deliveries.
const broadcasters = new Map<string, RealtimeChannel>();

/** Push the latest match snapshot to spectators. Best-effort, never throws. */
export function broadcastMatch(match: Match): void {
  if (!isSupabaseConfigured || !match.shareCode) return;
  try {
    const name = channelName(match.shareCode);
    let ch = broadcasters.get(name);
    if (!ch) {
      ch = supabase.channel(name, { config: { broadcast: { self: false } } });
      ch.subscribe();
      broadcasters.set(name, ch);
    }
    void ch.send({ type: 'broadcast', event: EVENT, payload: { match } });
  } catch {
    // ignore — spectator sync is non-essential
  }
}

/** Tear down a broadcaster (e.g. when a match completes / is abandoned). */
export function stopBroadcast(shareCode: string): void {
  const name = channelName(shareCode);
  const ch = broadcasters.get(name);
  if (ch) {
    void supabase.removeChannel(ch);
    broadcasters.delete(name);
  }
}

/**
 * Subscribe as a spectator. Returns an unsubscribe function. The callback fires
 * with each broadcast match snapshot.
 */
export function subscribeMatch(
  shareCode: string,
  onState: (match: Match) => void,
  onStatus?: (status: string) => void,
): () => void {
  if (!isSupabaseConfigured) {
    onStatus?.('unconfigured');
    return () => {};
  }
  const ch = supabase.channel(channelName(shareCode));
  ch.on('broadcast', { event: EVENT }, (msg) => {
    const payload = msg.payload as { match?: Match } | undefined;
    if (payload?.match) onState(payload.match);
  }).subscribe((status) => onStatus?.(status));
  return () => {
    void supabase.removeChannel(ch);
  };
}

export const REALTIME_EVENT = EVENT;
