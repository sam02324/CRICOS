/**
 * Auth store. Owns the Supabase session, the signed-in user and their profile
 * (their UID). Google sign-in uses the Supabase OAuth + PKCE flow.
 *
 * The session is established with `completeOAuthFromUrl`, which follows
 * Supabase's official Expo pattern: it parses the redirect URL with
 * expo-auth-session's QueryParams (handles BOTH `?code=` query params and
 * `#access_token=` fragments), then sets the session. A global Linking listener
 * catches deep-link redirects even on a cold start.
 */
import { create } from 'zustand';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/env';

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
  completeOAuthFromUrl: (url: string) => Promise<boolean>;
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

let linkingBound = false;

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
    if (session?.user) set({ profile: await loadProfile(session.user.id) });
    set({ initializing: false });

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      set({ session: newSession, user: newSession?.user ?? null });
      set({ profile: newSession?.user ? await loadProfile(newSession.user.id) : null });
    });

    // Catch OAuth deep-link redirects globally (covers cold-start too).
    if (!linkingBound) {
      linkingBound = true;
      const maybeHandle = (url: string | null) => {
        if (url && (url.includes('code=') || url.includes('access_token'))) {
          void get().completeOAuthFromUrl(url);
        }
      };
      Linking.addEventListener('url', (e) => maybeHandle(e.url));
      maybeHandle(await Linking.getInitialURL());
    }
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
      if (result.type === 'success' && result.url) {
        await get().completeOAuthFromUrl(result.url);
      }
      // If the redirect deep-linked instead, the global listener / callback route handles it.
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Sign-in failed.' });
    } finally {
      set({ signingIn: false });
    }
  },

  completeOAuthFromUrl: async (url) => {
    try {
      const { params, errorCode } = QueryParams.getQueryParams(url);
      if (errorCode) throw new Error(errorCode);
      const { access_token, refresh_token, code } = params;

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) throw error;
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          // May already be exchanged by a parallel handler — only fail if no session.
          const { data: s } = await supabase.auth.getSession();
          if (!s.session) throw error;
        }
      } else {
        return false;
      }

      const { data } = await supabase.auth.getSession();
      set({ session: data.session ?? null, user: data.session?.user ?? null, error: null });
      if (data.session?.user) set({ profile: await loadProfile(data.session.user.id) });
      return !!data.session;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Sign-in failed.' });
      return false;
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
