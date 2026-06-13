/**
 * Full-screen typographic burst for boundaries and wickets. Pops + fades using
 * Reanimated, then calls onDone so the store can clear the celebration. No
 * emoji — a bold word and a colour do the work.
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

const CONFIG: Record<CelebrationData['kind'], { text: string; color: string }> = {
  '4': { text: 'FOUR', color: colors.four },
  '6': { text: 'SIX', color: colors.six },
  W: { text: 'OUT', color: colors.wicket },
};

interface CelebrationProps {
  data: CelebrationData | null;
  onDone: () => void;
}

export function Celebration({ data, onDone }: CelebrationProps) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!data) return;
    scale.value = 0.6;
    opacity.value = 0;
    opacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(1, { duration: 520 }),
      withTiming(0, { duration: 260 }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
    scale.value = withSequence(
      withTiming(1.1, { duration: 200, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 160 }),
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
        <AppText variant="display" color={cfg.color} weight={fontWeight.black} style={styles.word}>
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
    paddingVertical: 18,
    paddingHorizontal: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(10,11,13,0.9)',
    borderWidth: 1.5,
  },
  word: { fontSize: 64, letterSpacing: 2 },
});
