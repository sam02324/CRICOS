/**
 * Full-screen emoji burst for boundaries and wickets. Pops + fades using
 * Reanimated, then calls onDone so the store can clear the celebration.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '@/components/ui';
import { Celebration as CelebrationData } from '@/store/matchStore';
import { colors, fontWeight } from '@/constants/theme';

const CONFIG: Record<CelebrationData['kind'], { emoji: string; text: string; color: string }> = {
  '4': { emoji: '🏏', text: 'FOUR!', color: colors.four },
  '6': { emoji: '🔥', text: 'SIX!', color: colors.six },
  W: { emoji: '💥', text: 'OUT!', color: colors.wicket },
};

interface CelebrationProps {
  data: CelebrationData | null;
  onDone: () => void;
}

export function Celebration({ data, onDone }: CelebrationProps) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!data) return;
    scale.value = 0.4;
    opacity.value = 0;
    opacity.value = withSequence(
      withTiming(1, { duration: 140 }),
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 280 }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
    scale.value = withSequence(
      withTiming(1.25, { duration: 200, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 150 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!data) return null;
  const cfg = CONFIG[data.kind];

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View style={[styles.badge, animStyle, { borderColor: cfg.color }]}>
        <AppText style={styles.emoji}>{cfg.emoji}</AppText>
        <AppText variant="display" color={cfg.color} weight={fontWeight.black}>
          {cfg.text}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 48,
    borderRadius: 28,
    backgroundColor: 'rgba(10,10,10,0.82)',
    borderWidth: 2,
  },
  emoji: { fontSize: 72, marginBottom: 4 },
});
