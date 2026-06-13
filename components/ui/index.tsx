/**
 * CRICOS UI kit — themed primitives used across every screen. Centralising
 * these keeps the dark theme, large tap targets and rounded surfaces consistent.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

/* --------------------------------- Text ---------------------------------- */

type TextVariant = 'display' | 'h1' | 'h2' | 'title' | 'body' | 'label' | 'caption' | 'mono';

const TEXT_VARIANTS: Record<TextVariant, TextStyle> = {
  display: { fontSize: fontSize.display, fontWeight: fontWeight.black, color: colors.text },
  h1: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.text },
  h2: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  body: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMuted },
  caption: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textFaint },
  mono: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, fontVariant: ['tabular-nums'] },
};

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
  weight?: TextStyle['fontWeight'];
}

export function AppText({ variant = 'body', color, center, weight, style, ...rest }: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        TEXT_VARIANTS[variant],
        color ? { color } : null,
        center ? { textAlign: 'center' } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    />
  );
}

/* -------------------------------- Screen --------------------------------- */

interface ScreenProps extends ViewProps {
  edges?: Edge[];
  padded?: boolean;
}

export function Screen({ children, style, edges = ['top'], padded = false, ...rest }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={styles.screen}>
      <View style={[{ flex: 1 }, padded && { padding: spacing.lg }, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

/* --------------------------------- Card ---------------------------------- */

interface CardProps extends ViewProps {
  variant?: 'surface' | 'surface2' | 'outline';
  padded?: boolean;
}

export function Card({ children, style, variant = 'surface', padded = true, ...rest }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === 'surface' && { backgroundColor: colors.surface },
        variant === 'surface2' && { backgroundColor: colors.surface2 },
        variant === 'outline' && { backgroundColor: colors.transparent, borderWidth: 1, borderColor: colors.border },
        padded && { padding: spacing.lg },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

/* -------------------------------- Button --------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  loading,
  fullWidth = true,
  style,
}: ButtonProps) {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.surface2
        : variant === 'danger'
          ? colors.wicket
          : colors.transparent;
  const fg = variant === 'primary' || variant === 'danger' ? colors.black : colors.text;
  const height = size === 'lg' ? 60 : size === 'sm' ? 40 : 52;
  const textVariant: TextVariant = size === 'lg' ? 'title' : 'body';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          height,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.border,
        },
        fullWidth && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={18} color={fg} style={{ marginRight: 8 }} /> : null}
          <AppText variant={textVariant} weight={fontWeight.bold} color={fg}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

/* ---------------------------------- Chip --------------------------------- */

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  emoji?: string;
  style?: StyleProp<ViewStyle>;
  accent?: string;
}

export function Chip({ label, selected, onPress, emoji, style, accent = colors.primary }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? accent : colors.surface2,
          borderColor: selected ? accent : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <AppText
        variant="body"
        weight={fontWeight.semibold}
        color={selected ? colors.black : colors.text}
      >
        {emoji ? `${emoji} ` : ''}
        {label}
      </AppText>
    </Pressable>
  );
}

/* --------------------------------- Field --------------------------------- */

interface FieldProps extends TextInputProps {
  label?: string;
}

export function Field({ label, style, ...rest }: FieldProps) {
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.field, style]}
        {...rest}
      />
    </View>
  );
}

/* -------------------------------- Toggle --------------------------------- */

interface ToggleRowProps {
  label: string;
  help?: string;
  value: boolean;
  onToggle: () => void;
}

export function ToggleRow({ label, help, value, onToggle }: ToggleRowProps) {
  return (
    <Pressable onPress={onToggle} style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <AppText variant="body" weight={fontWeight.semibold}>
          {label}
        </AppText>
        {help ? (
          <AppText variant="caption" style={{ marginTop: 2 }}>
            {help}
          </AppText>
        ) : null}
      </View>
      <View
        style={[
          styles.switchTrack,
          { backgroundColor: value ? colors.primary : colors.surface3 },
        ]}
      >
        <View style={[styles.switchThumb, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
      </View>
    </Pressable>
  );
}

/* ------------------------------- StatBox --------------------------------- */

interface StatBoxProps {
  label: string;
  value: string | number;
  accent?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatBox({ label, value, accent = colors.text, style }: StatBoxProps) {
  return (
    <View style={[styles.statBox, style]}>
      <AppText variant="h2" color={accent}>
        {value}
      </AppText>
      <AppText variant="caption" style={{ marginTop: 2 }}>
        {label}
      </AppText>
    </View>
  );
}

/* ------------------------------ EmptyState ------------------------------- */

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'list-outline', title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={36} color={colors.textFaint} />
      </View>
      <AppText variant="title" center>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="label" center style={{ marginTop: spacing.xs }}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

/* ------------------------------ SectionTitle ----------------------------- */

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <AppText variant="label" style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {children}
      </AppText>
      {right}
    </View>
  );
}

/* --------------------------------- Divider ------------------------------- */

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export { Ionicons };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { borderRadius: radius.lg, overflow: 'hidden' },
  button: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  field: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  switchTrack: {
    width: 52,
    height: 30,
    borderRadius: radius.pill,
    padding: 3,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  divider: { height: 1, backgroundColor: colors.border },
});
