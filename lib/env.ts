/**
 * Public runtime config, read from EXPO_PUBLIC_* env vars (inlined at build
 * time from `.env`). The Supabase anon key is safe to ship — Row Level Security
 * on the server is what actually protects data.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True once both Supabase keys are present — gates the online/login features. */
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
