/**
 * Root layout. Wires global providers (gesture handler + safe area), forces the
 * dark theme, initializes auth, and gates the app behind Google login — but
 * only when a backend is configured, so the app still runs locally otherwise.
 */
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/constants/theme';

function useAuthGate() {
  const initializing = useAuthStore((s) => s.initializing);
  const configured = useAuthStore((s) => s.configured);
  const session = useAuthStore((s) => s.session);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing || !configured) return;
    const onLogin = segments[0] === 'login';
    if (!session && !onLogin) router.replace('/login');
    else if (session && onLogin) router.replace('/');
  }, [initializing, configured, session, segments, router]);
}

export default function RootLayout() {
  const init = useAuthStore((s) => s.init);
  const initializing = useAuthStore((s) => s.initializing);
  const configured = useAuthStore((s) => s.configured);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => undefined);
    void init();
  }, [init]);

  useAuthGate();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {configured && initializing ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="login" options={{ animation: 'fade' }} />
            <Stack.Screen name="index" />
            <Stack.Screen name="new-match" />
            <Stack.Screen name="scoring/[id]" options={{ gestureEnabled: false }} />
            <Stack.Screen name="scorecard/[id]" />
            <Stack.Screen name="history" />
            <Stack.Screen name="practice" />
            <Stack.Screen name="player/[id]" />
            <Stack.Screen name="clubs" />
            <Stack.Screen name="club/[id]" />
            <Stack.Screen name="tournaments" />
            <Stack.Screen name="tournament/[id]" />
            <Stack.Screen name="hall-of-fame" />
          </Stack>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
