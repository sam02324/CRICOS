/**
 * Login / sign-in. Google sign-in gives every player their UID. Shown whenever
 * the backend is configured but no one is signed in.
 */
import { ActivityIndicator, Pressable, View, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AppText, Ionicons, Screen } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }[] = [
  { icon: 'stats-chart-outline', title: 'Your stats, everywhere', sub: 'Synced to your account in the cloud' },
  { icon: 'people-outline', title: 'Follow other players', sub: 'See their records and recent form' },
  { icon: 'trophy-outline', title: 'Clubs & tournaments', sub: 'Tables, leaderboards and honours' },
];

export default function LoginScreen() {
  const { signInWithGoogle, signingIn, error, configured } = useAuthStore();

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Animated.View entering={FadeIn.duration(450)} style={styles.hero}>
          <View style={styles.mark}>
            <AppText variant="display" weight={fontWeight.black} color={colors.primary} style={{ fontSize: 40 }}>
              C
            </AppText>
          </View>
          <AppText variant="display" weight={fontWeight.black} style={{ fontSize: 44, marginTop: spacing.lg }}>
            CRICOS
          </AppText>
          <AppText variant="label" style={{ marginTop: 2 }}>
            Score · Share · Compete
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(450)} style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={19} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight={fontWeight.semibold}>
                  {f.title}
                </AppText>
                <AppText variant="caption" style={{ marginTop: 1 }}>
                  {f.sub}
                </AppText>
              </View>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(450)} style={styles.footer}>
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
                <Ionicons name="logo-google" size={20} color="#1A1A1A" />
                <AppText variant="title" weight={fontWeight.bold} color={colors.black}>
                  Continue with Google
                </AppText>
              </>
            )}
          </Pressable>

          <AppText variant="caption" center style={{ marginTop: spacing.lg }}>
            {!configured
              ? 'Backend not configured yet — add your Supabase keys to enable login.'
              : 'By continuing you agree to play fair.'}
          </AppText>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between', paddingVertical: spacing.xxxl },
  hero: { alignItems: 'center', marginTop: spacing.xxl },
  mark: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  features: { gap: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {},
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    height: 56,
    borderRadius: radius.md,
  },
});
