import { Platform } from 'react-native';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const BorderRadius = {
  card: 16,
  button: 12,
  pill: 24,
  input: 12,
  full: 9999,
} as const;

export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
    },
    android: {
      elevation: 6,
    },
    default: {},
  }),
  xl: Platform.select({
    ios: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 28,
    },
    android: {
      elevation: 10,
    },
    default: {},
  }),
  glow: Platform.select({
    ios: {
      shadowColor: '#0D7377',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  warmGlow: Platform.select({
    ios: {
      shadowColor: '#F5A623',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
} as const;
