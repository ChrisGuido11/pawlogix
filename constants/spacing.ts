import { Platform } from 'react-native';

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
  '6xl': 64,
} as const;

// Rounded everywhere — Duolingo style
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
  // Semantic aliases
  card: 16,
  button: 12,
  pill: 9999,
  input: 12,
} as const;

export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#1C1917',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#1C1917',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#1C1917',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 6,
    },
    default: {},
  }),
  xl: Platform.select({
    ios: {
      shadowColor: '#1C1917',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 24,
    },
    android: {
      elevation: 10,
    },
    default: {},
  }),
  // Duolingo-style "pressed" bottom border effect for buttons
  button: Platform.select({
    ios: {
      shadowColor: '#D94E2A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  // Coral glow for primary CTA elements
  glow: Platform.select({
    ios: {
      shadowColor: '#FF6B42',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
    },
    android: {
      elevation: 6,
    },
    default: {},
  }),
  // Gold glow for achievements/gamification
  warmGlow: Platform.select({
    ios: {
      shadowColor: '#FFB830',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
    },
    android: {
      elevation: 5,
    },
    default: {},
  }),
  // Teal glow for health/trust elements
  coolGlow: Platform.select({
    ios: {
      shadowColor: '#2BBBC3',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
} as const;
