/**
 * CRICOS design tokens — a restrained, professional dark system.
 * Near-black canvas, layered greys for elevation, hairline borders, soft-white
 * text, a single green accent used sparingly, and gold reserved for wins/awards.
 * Import `theme` (or the named groups) everywhere instead of hard-coding values.
 */
import { TextStyle } from 'react-native';

export const colors = {
  // Canvas & elevation (dark → light as you raise a surface)
  bg: '#0A0B0D',
  bgElevated: '#101216',
  surface: '#141619',
  surface2: '#1B1E22',
  surface3: '#23272C',

  // Hairlines & dividers
  border: '#262A30',
  borderStrong: '#363B42',

  // Brand accent — used sparingly for emphasis, never as decoration
  primary: '#22C55E',
  primaryDark: '#16A34A',
  primaryGlow: 'rgba(34,197,94,0.14)',
  primaryMuted: 'rgba(34,197,94,0.10)',

  // Gold — wins, awards, leaderboards
  gold: '#EAB308',
  goldMuted: 'rgba(234,179,8,0.12)',

  // Text
  text: '#F4F5F6',
  textMuted: '#9AA1A9',
  textFaint: '#5F666E',

  // Semantic / scoring chips
  four: '#3B82F6',
  six: '#8B5CF6',
  wicket: '#F04438',
  wicketDark: '#5A1A16',
  warning: '#EAB308',
  extra: '#E08C3E',
  dot: '#5F666E',
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
  xl: 22,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 38,
  display: 52,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '800',
} as const satisfies Record<string, TextStyle['fontWeight']>;

/** Letter-spacing scale — tighter on large type, looser on small caps labels. */
export const tracking = {
  tight: -0.6,
  snug: -0.3,
  normal: 0,
  wide: 0.4,
  caps: 1.1,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
} as const;

export const theme = { colors, spacing, radius, fontSize, fontWeight, tracking, shadow };

export type Theme = typeof theme;
