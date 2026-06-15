/**
 * Cloud sync for match history (L3). Mirrors locally-saved matches to a Supabase
 * `matches` table and merges the cloud copy back into local history on demand.
 *
 * Table shape (create server-side with RLS on user_id):
 *   matches(id text primary key, user_id uuid, data jsonb,
 *           created_at timestamptz, updated_at timestamptz)
 *
 * Everything here is best-effort and no-ops when Supabase isn't configured or
 * the user isn't signed in — offline-first behaviour is never compromised.
 */
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/env';
import { Match } from '@/types/cricket';
import { loadMatches, saveMatches } from '@/utils/storage';

async function currentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Upsert one match to the cloud for the signed-in user. Best-effort. */
export async function pushMatchToCloud(match: Match): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await supabase.from('matches').upsert(
      {
        id: match.id,
        user_id: userId,
        data: match,
        created_at: new Date(match.createdAt).toISOString(),
        updated_at: new Date(match.updatedAt).toISOString(),
      },
      { onConflict: 'id' },
    );
  } catch {
    // ignore — local copy is the source of truth
  }
}

/**
 * Pull the user's cloud matches and merge with local history (union by id,
 * keeping whichever copy has the newer `updatedAt`). Returns the merged list,
 * or the existing local list if sync is unavailable.
 */
export async function syncMatchesFromCloud(): Promise<Match[]> {
  const local = await loadMatches();
  const userId = await currentUserId();
  if (!userId) return local;

  try {
    const { data, error } = await supabase
      .from('matches')
      .select('data')
      .eq('user_id', userId);
    if (error || !data) return local;

    const cloud = (data as { data: Match }[]).map((r) => r.data).filter(Boolean);
    const byId = new Map<string, Match>();
    for (const m of local) byId.set(m.id, m);
    for (const m of cloud) {
      const existing = byId.get(m.id);
      if (!existing || (m.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
        byId.set(m.id, m);
      }
    }
    const merged = Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
    await saveMatches(merged);

    // push any purely-local matches up so the cloud is complete too
    const cloudIds = new Set(cloud.map((m) => m.id));
    for (const m of merged) {
      if (!cloudIds.has(m.id)) void pushMatchToCloud(m);
    }
    return merged;
  } catch {
    return local;
  }
}
