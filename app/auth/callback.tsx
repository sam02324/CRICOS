/**
 * OAuth redirect target. Google/Supabase send the browser back to
 * `cricos://auth/callback?code=...`; this screen catches that deep link,
 * exchanges the code for a session (if it wasn't already), then sends the user
 * home. Tolerant of double-exchange (the in-app auth session may have handled
 * it first) — it just checks for a session and moves on.
 */
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          const code = typeof params.code === 'string' ? params.code : undefined;
          if (code) await supabase.auth.exchangeCodeForSession(code);
        }
      } catch {
        // ignore — onAuthStateChange / the gate will route appropriately
      }
      if (active) router.replace('/');
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
