/**
 * Wagon wheel — a circular field with a dot + radial line for each scoring shot
 * that captured a `shotDirection`. Rendered with absolutely-positioned Views
 * (no SVG). 0° points straight down the ground (toward the bowler, i.e. up).
 */
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ball, Match } from '@/types/cricket';
import { AppText, Card, SectionTitle } from '@/components/ui';
import { colors, fontWeight, spacing } from '@/constants/theme';

const FIELD = 220;
const R = FIELD / 2;

function dotColor(runs: number): string {
  if (runs === 6) return colors.six;
  if (runs === 4) return colors.four;
  if (runs >= 2) return colors.primary;
  return colors.textMuted;
}

/** Convert a 0–360° shot direction to an (x,y) on the field edge. 0° = up. */
function edgePoint(deg: number, radius: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180; // -90 so 0° points up
  return { x: R + radius * Math.cos(rad), y: R + radius * Math.sin(rad) };
}

function Wheel({ shots }: { shots: { dir: number; runs: number }[] }) {
  return (
    <View style={styles.field}>
      {/* pitch in the middle */}
      <View style={styles.pitch} />
      {/* batter at center */}
      <View style={styles.batter} />
      {shots.map((s, i) => {
        const len = R - 8;
        const end = edgePoint(s.dir, len);
        const dx = end.x - R;
        const dy = end.y - R;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const color = dotColor(s.runs);
        return (
          <React.Fragment key={i}>
            <View
              style={{
                position: 'absolute',
                left: R,
                top: R - 1,
                width: len,
                height: 2,
                backgroundColor: color,
                opacity: 0.7,
                transform: [{ rotateZ: `${angle}deg` }],
                transformOrigin: 'left center',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: end.x - 4,
                top: end.y - 4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: color,
              }}
            />
          </React.Fragment>
        );
      })}
    </View>
  );
}

export function WagonWheelView({ match }: { match: Match }) {
  const shots = useMemo(() => {
    const out: { dir: number; runs: number }[] = [];
    for (const inn of match.innings) {
      for (const b of inn.balls) {
        if (typeof b.shotDirection === 'number' && b.runs > 0) {
          out.push({ dir: b.shotDirection, runs: b.runs });
        }
      }
    }
    return out;
  }, [match]);

  if (shots.length === 0) return null;

  return (
    <Card>
      <SectionTitle>Wagon wheel</SectionTitle>
      <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
        <Wheel shots={shots} />
        <AppText variant="caption" color={colors.textFaint} style={{ marginTop: spacing.sm }}>
          {shots.length} scoring shots captured
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  field: {
    width: FIELD,
    height: FIELD,
    borderRadius: R,
    backgroundColor: colors.primaryMuted,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    overflow: 'hidden',
  },
  pitch: {
    position: 'absolute',
    left: R - 10,
    top: R - 40,
    width: 20,
    height: 80,
    backgroundColor: colors.surface3,
    borderRadius: 3,
  },
  batter: {
    position: 'absolute',
    left: R - 4,
    top: R - 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text,
  },
});
