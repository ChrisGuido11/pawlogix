export const Colors = {
  // Primary — Sky Blue (friendly, clean, trustworthy)
  primary: '#5BC5F2',
  primaryDark: '#3BA8D8',
  primaryLight: '#E8F6FC',

  // Secondary — Warm Amber (star ratings, achievements, attention)
  secondary: '#FFBE3D',

  // Accent — Soft Coral (hearts, urgent flags, love/care accents)
  accentCoral: '#FF6B8A',

  // Surfaces & Backgrounds
  background: '#F5F5F5',
  surface: '#FFFFFF',

  // Header gradient
  headerGradientStart: '#5BC5F2',
  headerGradientEnd: '#4AB8E8',

  // Text
  textHeading: '#1E1E2D',
  textBody: '#3D3D4E',
  textMuted: '#9E9EB0',
  textOnPrimary: '#FFFFFF',

  // Semantic
  success: '#34C759',
  successLight: '#EAFBF0',
  warning: '#FFAA33',
  warningLight: '#FFF8E1',
  error: '#E53E3E',
  errorLight: '#FFF0EF',

  // Borders & States
  border: '#EAEAEA',
  disabled: '#D0D0D8',
  tabInactive: '#B0B0C0',
  // Switch track off-state
  switchTrackOff: '#D0D0D8',

  // Overlay & transparency
  modalScrim: 'rgba(0,0,0,0.5)',
  headerButtonBg: 'rgba(255,255,255,0.2)',
  headerSubtitle: 'rgba(255,255,255,0.8)',
  tabBarBorder: 'rgba(0,0,0,0.06)',
  cameraBackground: '#000000',
} as const;

export const Gradients = {
  primaryHeader: ['#5BC5F2', '#4AB8E8'] as const,
  primaryCta: ['#5BC5F2', '#3BA8D8'] as const,
  warmBackground: ['#F5F5F5', '#FAFAFA'] as const,
  surfaceSubtle: ['#FFFFFF', '#F5F5F5'] as const,
} as const;

export type ColorToken = keyof typeof Colors;

// Tab bar colors for Expo Router
export default {
  light: {
    text: Colors.textHeading,
    background: Colors.background,
    tint: Colors.primary,
    tabIconDefault: Colors.tabInactive,
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
