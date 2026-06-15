/**
 * EditOverSheet — a bottom sheet listing every ball in the current over so the
 * scorer can remove a mistaken delivery. Because the store keeps a full snapshot
 * undo stack (one entry per delivery), "removing" ball N means undoing back to
 * just before it: that's `(ballsAfter + 1)` undo steps. We surface that cost and
 * replay nothing — the snapshots already hold the exact prior states.
 */
import React from 'react';
import { Alert, Modal, Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { Ball, Innings } from '@/types/cricket';
import { AppText, Button, Ionicons } from '@/components/ui';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

interface Props {
  visible: boolean;
  innings: Innings;
  undoDepth: number;
  onClose: () => void;
  /** Undo `steps` deliveries (pops the undo stack that many times). */
  onUndoSteps: (steps: number) => void;
}

function thisOverBalls(innings: Innings): Ball[] {
  if (innings.balls.length === 0) return [];
  const lastOver = innings.balls[innings.balls.length - 1].overNumber;
  return innings.balls.filter((b) => b.overNumber === lastOver);
}

function ballLabel(b: Ball): string {
  if (b.isWicket && b.wicketType !== 'Retired') return `W${b.runs ? ` + ${b.runs}` : ''}`;
  const t = b.extra.type;
  if (t === 'wide') return `Wide${b.extra.runs > 1 ? ` +${b.extra.runs - 1}` : ''}`;
  if (t === 'noBall') return `No ball${b.runs ? ` +${b.runs}` : ''}`;
  if (t === 'bye') return `${b.extra.runs} bye`;
  if (t === 'legBye') return `${b.extra.runs} leg bye`;
  return `${b.runs} run${b.runs === 1 ? '' : 's'}`;
}

export function EditOverSheet({ visible, innings, undoDepth, onClose, onUndoSteps }: Props) {
  const overBalls = thisOverBalls(innings);
  // Map each over-ball to its index from the end of the full innings ball list.
  const total = innings.balls.length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <AppText variant="overline">Edit current over</AppText>
          <AppText variant="title" weight={fontWeight.bold} style={{ marginBottom: spacing.sm }}>
            Tap a ball to remove it
          </AppText>
          <AppText variant="caption" color={colors.textFaint} style={{ marginBottom: spacing.md }}>
            Removing a ball rewinds the over back to just before it. Any deliveries after it are also removed.
          </AppText>

          <ScrollView style={{ maxHeight: 320 }}>
            {overBalls.length === 0 ? (
              <AppText variant="body" color={colors.textMuted}>
                No balls bowled in this over yet.
              </AppText>
            ) : (
              overBalls.map((b) => {
                const globalIdx = innings.balls.indexOf(b);
                const stepsToRemove = total - globalIdx; // undos needed to drop this + later balls
                const canRemove = stepsToRemove <= undoDepth;
                return (
                  <Pressable
                    key={b.id}
                    disabled={!canRemove}
                    onPress={() =>
                      Alert.alert(
                        'Remove this ball?',
                        stepsToRemove > 1
                          ? `This rewinds ${stepsToRemove} deliveries (this ball and ${stepsToRemove - 1} after it).`
                          : 'This removes the last ball.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: () => {
                              onUndoSteps(stepsToRemove);
                              onClose();
                            },
                          },
                        ],
                      )
                    }
                    style={({ pressed }) => [styles.ballRow, { opacity: canRemove ? (pressed ? 0.7 : 1) : 0.35 }]}
                  >
                    <View style={styles.ballDot}>
                      <AppText variant="caption" weight={fontWeight.bold}>
                        {b.legalBallInOver || '+'}
                      </AppText>
                    </View>
                    <AppText variant="body" weight={fontWeight.semibold} style={{ flex: 1 }}>
                      {ballLabel(b)}
                    </AppText>
                    {canRemove ? (
                      <Ionicons name="trash-outline" size={18} color={colors.wicket} />
                    ) : (
                      <AppText variant="caption" color={colors.textFaint}>
                        too far back
                      </AppText>
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <Button title="Done" variant="secondary" onPress={onClose} style={{ marginTop: spacing.lg }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: spacing.md },
  ballRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ballDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
