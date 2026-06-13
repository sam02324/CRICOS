/**
 * Root layout. Wires the global providers (gesture handler + safe area),
 * forces the dark theme + dark status bar, and defines the stack of routes.
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { colors } from '@/constants/theme';

export default function RootLayout() {
  useEffect(() => {
    // Match the OS root background to our dark theme to avoid white flashes.
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        >
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
