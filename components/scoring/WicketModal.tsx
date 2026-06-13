/**
 * Wicket entry. Dismissal options are filtered by the active rule-set; run-outs
 * collect which batter is out and how many were completed; fielder dismissals
 * collect the fielder. Confirm hands a structured wicket to the store.
 */
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { ExtraType, MatchRules, WicketType } from '@/types/cricket';
import { AppText, Button, Ionicons } from '@/components/ui';
import { ALL_WICKET_TYPES, FIELDER_WICKETS } from '@/constants/formats';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

interface Fielder {
  id: string;
  name: string;
}

export interface WicketSubmit {
  wicketType: WicketType;
  runs: number;
  dismissedBatterId: string | null;
  fielderId: string | null;
  fielderName: string | null;
  extraType: ExtraType | null;
}

interface WicketModalProps {
  visible: boolean;
  rules: MatchRules;
  strikerId: string | null;
  strikerName: string;
  nonStrikerId: string | null;
  nonStrikerName: string;
  fielders: Fielder[];
  onConfirm: (input: WicketSubmit) => void;
  onClose: () => void;
}

const RUN_OUT_TYPES: WicketType[] = ['Run Out', 'Tip and Run Run Out'];

export function WicketModal({
  visible,
  rules,
  strikerId,
  strikerName,
  nonStrikerId,
  nonStrikerName,
  fielders,
  onConfirm,
  onClose,
}: WicketModalProps) {
  const [type, setType] = useState<WicketType | null>(null);
  const [outEnd, setOutEnd] = useState<'striker' | 'nonStriker'>('striker');
  const [runs, setRuns] = useState(0);
  const [fielderId, setFielderId] = useState<string | null>(null);

  const available = useMemo(
    () =>
      ALL_WICKET_TYPES.filter((w) => {
        if (w === 'LBW') return rules.lbw;
        if (w === 'One Hand Catch') return rules.ohob;
        if (w === 'Boundary on Full') return rules.boundaryOnFull;
        if (w === 'Tip and Run Run Out') return rules.tipAndRun;
        return true;
      }),
    [rules],
  );

  const isRunOut = type ? RUN_OUT_TYPES.includes(type) : false;
  const needsFielder = type ? FIELDER_WICKETS.includes(type) : false;

  const reset = () => {
    setType(null);
    setOutEnd('striker');
    setRuns(0);
    setFielderId(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const confirm = () => {
    if (!type) return;
    const dismissedBatterId = isRunOut
      ? outEnd === 'striker'
        ? strikerId
        : nonStrikerId
      : strikerId;
    const fielder = fielders.find((f) => f.id === fielderId) ?? null;
    onConfirm({
      wicketType: type,
      runs: isRunOut ? runs : 0,
      dismissedBatterId,
      fielderId: needsFielder ? fielderId : null,
      fielderName: needsFielder ? (fielder?.name ?? null) : null,
      extraType: null,
    });
    reset();
  };

  const canConfirm = !!type && (!needsFielder || !!fielderId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <AppText variant="h2" color={colors.wicket}>
              Wicket! 🎯
            </AppText>
            <Pressable onPress={close} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }} showsVerticalScrollIndicator={false}>
            <AppText variant="label">How out?</AppText>
            <View style={styles.wrap}>
              {available.map((w) => (
                <Pressable
                  key={w}
                  onPress={() => {
                    setType(w);
                    setFielderId(null);
                  }}
                  style={[styles.typeChip, type === w && styles.typeChipOn]}
                >
                  <AppText
                    variant="body"
                    weight={fontWeight.semibold}
                    color={type === w ? colors.black : colors.text}
                  >
                    {w}
                  </AppText>
                </Pressable>
              ))}
            </View>

            {isRunOut ? (
              <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                <AppText variant="label">Who is out?</AppText>
                <View style={styles.wrap}>
                  <SelectPill
                    label={strikerName}
                    active={outEnd === 'striker'}
                    onPress={() => setOutEnd('striker')}
                  />
                  <SelectPill
                    label={nonStrikerName}
                    active={outEnd === 'nonStriker'}
                    onPress={() => setOutEnd('nonStriker')}
                  />
                </View>
                <AppText variant="label" style={{ marginTop: spacing.sm }}>
                  Runs completed
                </AppText>
                <View style={styles.wrap}>
                  {[0, 1, 2, 3].map((r) => (
                    <SelectPill key={r} label={`${r}`} active={runs === r} onPress={() => setRuns(r)} />
                  ))}
                </View>
              </View>
            ) : null}

            {needsFielder ? (
              <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                <AppText variant="label">Fielder</AppText>
                <View style={styles.wrap}>
                  {fielders.map((f) => (
                    <SelectPill
                      key={f.id}
                      label={f.name}
                      active={fielderId === f.id}
                      onPress={() => setFielderId(f.id)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ height: spacing.lg }} />
            <Button title="Confirm Wicket" variant="danger" icon="close-circle" disabled={!canConfirm} onPress={confirm} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SelectPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillOn]}>
      <AppText variant="body" weight={fontWeight.semibold} color={active ? colors.black : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  typeChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipOn: { backgroundColor: colors.wicket, borderColor: colors.wicket },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
