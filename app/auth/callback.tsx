/**
 * OAuth redirect target. Google/Supabase send the browser back to
 * `cricos://auth/callback?code=...` (or with a token fragment). This screen
 * hands the full URL to the auth store to establish the session, then routes
 * home. If it fails, it shows the actual error so it can be diagnosed.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { AppText, Button } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { colors, spacing } from '@/constants/theme';

export default function AuthCallback() {
  const router = useRouter();
  const url = Linking.useURL();
  const session = useAuthStore((s) => s.session);
  const [error, setError] = useState<string | null>(null);

  // Establish the session from the redirect URL.
  useEffect(() => {
    if (!url) return;
    let active = true;
    (async () => {
      const ok = await useAuthStore.getState().completeOAuthFromUrl(url);
      if (!active) return;
      if (ok) router.replace('/');
      else setError(useAuthStore.getState().error ?? 'Could not complete sign-in.');
    })();
    return () => {
      active = false;
    };
  }, [url, router]);

  // If the global listener established the session first, head home.
  useEffect(() => {
    if (session) router.replace('/');
  }, [session, router]);

  if (error) {
    return (
      <View style={styles.center}>
        <AppText style={{ fontSize: 40 }}>😕</AppText>
        <AppText variant="title" center style={{ marginTop: spacing.md }}>
          Sign-in didn&apos;t complete
        </AppText>
        <AppText variant="label" center color={colors.wicket} style={{ marginTop: spacing.sm }}>
          {error}
        </AppText>
        <Button title="Back to login" variant="ghost" style={{ marginTop: spacing.xl }} onPress={() => router.replace('/login')} />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      <AppText variant="label" center style={{ marginTop: spacing.lg }}>
        Signing you in…
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.xl },
});
