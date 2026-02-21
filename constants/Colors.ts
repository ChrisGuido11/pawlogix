export const Colors = {
  // Primary — Bold coral-orange (high energy, friendly, action-oriented)
  primary: '#FF6B42',
  primary50: '#FFF5F0',
  primary100: '#FFE0D4',
  primary200: '#FF9A7A',
  primary300: '#FF8560',
  primary400: '#FF7851',
  primary500: '#FF6B42',
  primary600: '#E55E3A',
  primary700: '#D94E2A',
  primary800: '#B8401F',
  primary900: '#8C3018',
  primaryLight: '#FFF5F0',

  // Secondary — Deep teal (trust, health, calm complement to coral)
  secondary: '#2BBBC3',
  secondary50: '#F0FAFB',
  secondary100: '#D4F1F3',
  secondary200: '#7DD8DC',
  secondary300: '#50CDD3',
  secondary400: '#38C4CB',
  secondary500: '#2BBBC3',
  secondary600: '#1A8A91',

  // Tertiary — Warm gold (achievements, streaks, gamification)
  tertiary: '#FFB830',
  tertiary50: '#FFFBF0',
  tertiaryLight: '#FFDA80',
  tertiaryDark: '#CC9320',

  // Surfaces & Backgrounds — warm-toned
  background: '#FAFAF9',
  backgroundWarm: '#F5F5F4',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F5F4',

  // Text — warm neutrals (not blue-grays)
  textPrimary: '#1C1917',
  textSecondary: '#78716C',
  textTertiary: '#A8A29E',

  // Semantic — Success / Warning / Error / Info
  success: '#34C759',
  successLight: '#F0FFF4',
  successDark: '#248A3D',
  warning: '#FF9500',
  warningLight: '#FFF8E1',
  warningDark: '#CC7700',
  error: '#FF3B30',
  errorLight: '#FFF0EF',
  errorDark: '#CC2F26',
  info: '#5856D6',

  // Borders — warm-toned
  border: '#D6D3D1',
  borderLight: '#E7E5E4',

  // States
  disabled: '#A8A29E',

  // Pet accent colors
  petDog: '#8B6914',
  petCat: '#6366F1',
} as const;

export const Gradients = {
  primaryHeader: ['#FF6B42', '#D94E2A'] as const,
  primaryCta: ['#FF6B42', '#E55E3A'] as const,
  warmBackground: ['#FAFAF9', '#F5F5F4'] as const,
  secondaryCta: ['#2BBBC3', '#1A8A91'] as const,
  tertiaryCta: ['#FFB830', '#CC9320'] as const,
  surfaceSubtle: ['#FFFFFF', '#F5F5F4'] as const,
  destructive: ['#FF3B30', '#CC2F26'] as const,
};

export type ColorToken = keyof typeof Colors;

// Tab bar colors for Expo Router
export default {
  light: {
    text: Colors.textPrimary,
    background: Colors.background,
    tint: Colors.primary,
    tabIconDefault: Colors.textTertiary,
    tabIconSelected: Colors.primary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: Colors.primary,
    tabIconDefault: '#9BA1A6',
    tabIconSelected: Colors.primary,
  },
};
