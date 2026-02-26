import { Platform } from 'react-native';
import { Colors } from './Colors';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
  // Semantic aliases
  card: 16,
  heroCard: 20,
  button: 12,
  pill: 9999,
  input: 14,
  bottomSheet: 24,
  curvedHeader: 30,
  statTile: 14,
  messageBubble: 18,
  messageTail: 6,
} as const;

export const IconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

export const IconTile = {
  /** Standard list items, settings rows, medication rows */
  standard: 40,
  /** Hero cards, feature tiles, quick actions */
  large: 48,
} as const;

export const Shadows = {
  // Card shadow (default) — soft and diffused
  sm: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }),
  // Standard card
  md: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }),
  // Elevated card (hero CTA, modals)
  lg: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
    },
    android: {
      elevation: 6,
    },
    default: {},
  }),
  xl: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
    },
    android: {
      elevation: 10,
    },
    default: {},
  }),
  // Primary button — brand-tinted glow
  primaryButton: Platform.select({
    ios: {
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  // Tab bar — subtle upward shadow
  tabBar: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  // Elevated scan button in tab bar
  scanButton: Platform.select({
    ios: {
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
  // Bottom sheet
  bottomSheet: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
    },
    android: {
      elevation: 10,
    },
    default: {},
  }),
} as const;
