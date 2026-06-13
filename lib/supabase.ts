/**
 * Supabase client for React Native. Sessions persist in AsyncStorage and
 * auto-refresh. Placeholder credentials are used when the app isn't configured
 * yet so the bundle never crashes on import — real calls are gated on
 * `isSupabaseConfigured`.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/env';

const url = SUPABASE_URL || 'https://placeholder.supabase.co';
const anonKey = SUPABASE_ANON_KEY || 'public-anon-placeholder';

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // we handle the OAuth redirect manually in native
  },
});

export { isSupabaseConfigured };
