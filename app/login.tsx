/**
 * Login / sign-in screen. Google sign-in gives every player their UID. Shown
 * whenever the backend is configured but no one is signed in.
 */
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, View, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { AppText, Ionicons, Screen } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

const FEATURES = [
  { icon: 'stats-chart' as const, text: 'Your stats, synced everywhere' },
  { icon: 'people' as const, text: "Follow other players' records" },
  { icon: 'trophy' as const, text: 'Clubs, tournaments & leaderboards' },
];

export default function LoginScreen() {
  const { signInWithGoogle, signingIn, error, configured } = useAuthStore();

  useEffect(() => {
    // nothing to do — gate logic lives in the root layout
  }, []);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.hero}>
          <View style={styles.logo}>
            <AppText style={{ fontSize: 56 }}>🏏</AppText>
          </View>
          <AppText variant="display" weight={fontWeight.black} center style={{ fontSize: 48 }}>
            CRICOS
          </AppText>
          <AppText variant="title" color={colors.textMuted} center>
            Score. Share. Compete.
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={18} color={colors.primary} />
              </View>
              <AppText variant="body" weight={fontWeight.semibold}>
                {f.text}
              </AppText>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.footer}>
          {error ? (
            <AppText variant="label" color={colors.wicket} center style={{ marginBottom: spacing.md }}>
              {error}
            </AppText>
          ) : null}

          <Pressable
            onPress={signInWithGoogle}
            disabled={signingIn || !configured}
            style={({ pressed }) => [styles.googleBtn, { opacity: !configured ? 0.5 : pressed ? 0.9 : 1 }]}
          >
            {signingIn ? (
              <ActivityIndicator color={colors.black} />
            ) : (
              <>
                <Ionicons name="logo-google" size={22} color="#EA4335" />
                <AppText variant="title" weight={fontWeight.bold} color={colors.black}>
                  Continue with Google
                </AppText>
              </>
            )}
          </Pressable>

          {!configured ? (
            <AppText variant="caption" center style={{ marginTop: spacing.md }}>
              Backend not configured yet — add your Supabase keys to enable login.
            </AppText>
          ) : (
            <AppText variant="caption" center style={{ marginTop: spacing.md }}>
              By continuing you agree to play fair 🤝
            </AppText>
          )}
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between', paddingVertical: spacing.xxxl },
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxl },
  logo: {
    width: 104,
    height: 104,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  features: { gap: spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { gap: spacing.xs },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    height: 58,
    borderRadius: radius.md,
  },
});
