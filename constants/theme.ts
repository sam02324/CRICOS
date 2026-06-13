/**
 * CRICOS design tokens. Dark-first, high-contrast, large tap targets for
 * outdoor / sunlight use. Import `theme` everywhere instead of hard-coding values.
 */
import { TextStyle } from 'react-native';

export const colors = {
  // Surfaces
  bg: '#0A0A0A',
  surface: '#1A1A1A',
  surface2: '#242424',
  surface3: '#2E2E2E',
  border: '#333333',

  // Brand
  primary: '#22C55E',
  primaryDark: '#16A34A',
  primaryGlow: 'rgba(34,197,94,0.18)',

  // Text
  text: '#FFFFFF',
  textMuted: '#A3A3A3',
  textFaint: '#6B7280',

  // Semantic
  four: '#3B82F6',
  six: '#A855F7',
  wicket: '#EF4444',
  wicketDark: '#7F1D1D',
  warning: '#F59E0B',
  extra: '#F59E0B',
  dot: '#6B7280',
  info: '#38BDF8',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 40,
  display: 56,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '800',
} as const satisfies Record<string, TextStyle['fontWeight']>;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
} as const;

export const theme = { colors, spacing, radius, fontSize, fontWeight, shadow };

export type Theme = typeof theme;
