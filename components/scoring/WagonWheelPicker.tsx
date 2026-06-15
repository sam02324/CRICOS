/**
 * WagonWheelPicker — a non-blocking prompt shown after a bat-run delivery when
 * `rules.wagonWheel` is on. The field is split into 8 zones; tapping one records
 * the shot direction (zone centre, in degrees) for the last ball. A Skip button
 * dismisses without capturing. Pure View / borderRadius — no SVG.
 */
import React from 'react';
import { Modal, Pressable, View, StyleSheet } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

const FIELD = 240;
const R = FIELD / 2;

// 8 zones, each a 45° slice. Labels read from the batter's perspective (RHB).
const ZONES: { label: string; centerDeg: number }[] = [
  { label: 'Straight', centerDeg: 0 },
  { label: 'Cover', centerDeg: 45 },
  { label: 'Point', centerDeg: 90 },
  { label: 'Third man', centerDeg: 135 },
  { label: 'Fine leg', centerDeg: 180 },
  { label: 'Square leg', centerDeg: 225 },
  { label: 'Mid wkt', centerDeg: 270 },
  { label: 'Mid on', centerDeg: 315 },
];

function pointFor(deg: number, radius: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: R + radius * Math.cos(rad), y: R + radius * Math.sin(rad) };
}

interface Props {
  visible: boolean;
  runs: number;
  onPick: (deg: number) => void;
  onSkip: () => void;
}

export function WagonWheelPicker({ visible, runs, onPick, onSkip }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <AppText variant="overline">Wagon wheel</AppText>
          <AppText variant="title" weight={fontWeight.bold} style={{ marginBottom: spacing.md }}>
            Where did the {runs} go?
          </AppText>

          <View style={styles.field}>
            <View style={styles.batter} />
            {ZONES.map((z) => {
              const at = pointFor(z.centerDeg, R - 34);
              return (
                <Pressable
                  key={z.label}
                  onPress={() => onPick(z.centerDeg)}
                  style={({ pressed }) => [
                    styles.zoneBtn,
                    { left: at.x - 30, top: at.y - 18, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <AppText variant="caption" weight={fontWeight.semibold} center color={colors.text}>
                    {z.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <Button title="Skip" variant="ghost" onPress={onSkip} style={{ marginTop: spacing.lg }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  field: {
    width: FIELD,
    height: FIELD,
    borderRadius: R,
    backgroundColor: colors.primaryMuted,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    marginVertical: spacing.sm,
  },
  batter: {
    position: 'absolute',
    left: R - 5,
    top: R - 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.text,
  },
  zoneBtn: {
    position: 'absolute',
    width: 60,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
