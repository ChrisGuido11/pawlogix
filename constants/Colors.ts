export const Colors = {
  primary: '#0D7377',
  secondary: '#F5A623',
  background: '#FAF9F6',
  surface: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#64748B',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#EF5350',
  info: '#2196F3',
  border: '#E5E7EB',
  disabled: '#D1D5DB',
} as const;

export type ColorToken = keyof typeof Colors;

// Tab bar colors for Expo Router
export default {
  light: {
    text: Colors.textPrimary,
    background: Colors.background,
    tint: Colors.primary,
    tabIconDefault: Colors.textSecondary,
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
