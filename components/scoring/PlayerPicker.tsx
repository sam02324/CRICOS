/**
 * Bottom-sheet style player picker used for openers, new batsmen and new bowlers.
 * Eligible players are tappable; ineligible ones show a reason and are disabled.
 */
import React from 'react';
import { Modal, Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { AppText, Ionicons } from '@/components/ui';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

export interface PickerOption {
  id: string;
  name: string;
  disabled?: boolean;
  note?: string;
}

interface PlayerPickerProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: PickerOption[];
  onSelect: (id: string) => void;
  onClose?: () => void;
  dismissable?: boolean;
}

export function PlayerPicker({
  visible,
  title,
  subtitle,
  options,
  onSelect,
  onClose,
  dismissable = false,
}: PlayerPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="h2">{title}</AppText>
              {subtitle ? <AppText variant="label">{subtitle}</AppText> : null}
            </View>
            {dismissable && onClose ? (
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
            {options.map((opt) => (
              <Pressable
                key={opt.id}
                disabled={opt.disabled}
                onPress={() => onSelect(opt.id)}
                style={({ pressed }) => [
                  styles.option,
                  { opacity: opt.disabled ? 0.4 : pressed ? 0.8 : 1 },
                ]}
              >
                <View style={styles.avatar}>
                  <AppText variant="title" color={colors.black}>
                    {opt.name.charAt(0).toUpperCase()}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="title" weight={fontWeight.semibold}>
                    {opt.name}
                  </AppText>
                  {opt.note ? <AppText variant="caption">{opt.note}</AppText> : null}
                </View>
                {!opt.disabled ? <Ionicons name="chevron-forward" size={20} color={colors.textFaint} /> : null}
              </Pressable>
            ))}
            {options.length === 0 ? (
              <AppText variant="label" center style={{ paddingVertical: spacing.lg }}>
                No eligible players.
              </AppText>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
