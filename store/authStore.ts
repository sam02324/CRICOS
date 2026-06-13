/**
 * Auth store. Owns the Supabase session, the signed-in user and their profile
 * (their UID). Google sign-in uses the Supabase OAuth + PKCE flow, opening a
 * secure in-app browser and exchanging the returned code for a session.
 */
import { create } from 'zustand';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/env';

// Ensures the auth browser tab closes itself after redirecting back.
WebBrowser.maybeCompleteAuthSession();

export interface Profile {
  id: string; // == auth UID
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface AuthState {
  configured: boolean;
  initializing: boolean;
  signingIn: boolean;
  error: string | null;
  session: Session | null;
  user: User | null;
  profile: Profile | null;

  init: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, 'username' | 'display_name' | 'bio'>>) => Promise<void>;
}

const redirectTo = makeRedirectUri({ scheme: 'cricos', path: 'auth/callback' });

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio')
    .eq('id', userId)
    .single();
  return (data as Profile) ?? null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  configured: isSupabaseConfigured,
  initializing: true,
  signingIn: false,
  error: null,
  session: null,
  user: null,
  profile: null,

  init: async () => {
    if (!isSupabaseConfigured) {
      set({ configured: false, initializing: false });
      return;
    }
    const { data } = await supabase.auth.getSession();
    const session = data.session ?? null;
    set({ session, user: session?.user ?? null });
    if (session?.user) {
      const profile = await loadProfile(session.user.id);
      set({ profile });
    }
    set({ initializing: false });

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      set({ session: newSession, user: newSession?.user ?? null });
      if (newSession?.user) {
        const profile = await loadProfile(newSession.user.id);
        set({ profile });
      } else {
        set({ profile: null });
      }
    });
  },

  signInWithGoogle: async () => {
    if (!isSupabaseConfigured) {
      set({ error: 'Backend not configured yet.' });
      return;
    }
    set({ signingIn: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('Could not start Google sign-in.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) {
        set({ signingIn: false });
        return; // user cancelled
      }

      const qp = Linking.parse(result.url).queryParams ?? {};
      const errorCode = qp.error_code ?? qp.error;
      if (errorCode) throw new Error(String(errorCode));

      const code = typeof qp.code === 'string' ? qp.code : undefined;
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }
      // onAuthStateChange will populate session + profile.
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Sign-in failed.' });
    } finally {
      set({ signingIn: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) return;
    set({ profile: await loadProfile(user.id) });
  },

  updateProfile: async (patch) => {
    const user = get().user;
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (!error) await get().refreshProfile();
  },
}));
