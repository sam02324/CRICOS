/**
 * Player identity registry (L4). Casual matches type a player's name freehand,
 * so "Rishabh", "rishabh r" and "Rishabh R." become separate stat lines. This
 * registry maps alias name-keys → a canonical name-key, letting the stats engine
 * fold them into one identity.
 *
 * Storage: a flat alias→canonical map under `cricos:playerRegistry`. A synchronous
 * in-memory cache backs `resolveNameKey`, since `buildMatchPerformances` is sync.
 * Call `loadRegistry()` once at startup (or after a merge) to warm the cache.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'cricos:playerRegistry';

/** aliasKey -> canonicalKey (both already name-keyed). */
type AliasMap = Record<string, string>;

let cache: AliasMap = {};
let loaded = false;

export function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Warm the in-memory cache from storage. Safe to call repeatedly. */
export async function loadRegistry(): Promise<AliasMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as AliasMap) : {};
  } catch {
    cache = {};
  }
  loaded = true;
  return cache;
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // best-effort
  }
}

/** Resolve a name to its canonical name-key (sync, uses the warmed cache). */
export function resolveNameKey(name: string): string {
  const key = nameKey(name);
  return cache[key] ?? key;
}

/** Has the cache been warmed at least once? */
export function isRegistryLoaded(): boolean {
  return loaded;
}

/** The current alias map (read-only snapshot). */
export function getAliasMap(): AliasMap {
  return { ...cache };
}

/**
 * Merge two identities: every alias of `aliasName` (and itself) now points at
 * `canonicalName`'s key. Persists and updates the cache.
 */
export async function mergePlayers(canonicalName: string, aliasName: string): Promise<void> {
  if (!loaded) await loadRegistry();
  const canonical = resolveNameKey(canonicalName);
  const aliasK = nameKey(aliasName);
  if (canonical === aliasK) return;
  // point the alias and anything currently pointing at the alias to canonical
  cache[aliasK] = canonical;
  for (const k of Object.keys(cache)) {
    if (cache[k] === aliasK) cache[k] = canonical;
  }
  await persist();
}

/** Undo a merge for a single alias key (point it back at itself). */
export async function unmergePlayer(aliasName: string): Promise<void> {
  if (!loaded) await loadRegistry();
  const aliasK = nameKey(aliasName);
  if (aliasK in cache) {
    delete cache[aliasK];
    await persist();
  }
}

/* --------------------------- fuzzy suggestions --------------------------- */

/** Levenshtein distance (small strings only). */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

/** True when two names look like the same person (prefix or small edit). */
export function looksLikeSame(a: string, b: string): boolean {
  const x = nameKey(a);
  const y = nameKey(b);
  if (x === y) return false; // identical isn't a "merge" candidate
  if (x.startsWith(y) || y.startsWith(x)) return true;
  const longer = Math.max(x.length, y.length);
  if (longer <= 3) return false;
  return editDistance(x, y) <= (longer >= 8 ? 2 : 1);
}

export interface MergeSuggestion {
  a: string;
  b: string;
}

/** Pairwise candidate merges across a list of distinct display names. */
export function suggestMerges(names: string[]): MergeSuggestion[] {
  const out: MergeSuggestion[] = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (resolveNameKey(names[i]) === resolveNameKey(names[j])) continue; // already merged
      if (looksLikeSame(names[i], names[j])) out.push({ a: names[i], b: names[j] });
    }
  }
  return out;
}
