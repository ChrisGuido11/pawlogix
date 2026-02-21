import { TextStyle } from 'react-native';

/**
 * Font family names — these map to the loaded Nunito weights.
 * Usage: { fontFamily: Fonts.bold }
 */
export const Fonts = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semiBold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

/**
 * Typography presets — ready-to-spread into Text style props.
 * Usage: <Text style={Typography.h1}>Hello</Text>
 */
export const Typography: Record<string, TextStyle> = {
  // Display — Splash, hero, onboarding
  displayLg: {
    fontFamily: Fonts.extraBold,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  displayMd: {
    fontFamily: Fonts.extraBold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },

  // Headings
  h1: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    lineHeight: 32,
  },
  h2: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    lineHeight: 28,
  },
  h3: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    lineHeight: 24,
  },

  // Body
  bodyLg: {
    fontFamily: Fonts.regular,
    fontSize: 17,
    lineHeight: 26,
  },
  bodyMd: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  bodySm: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },

  // Labels & Buttons
  buttonLg: {
    fontFamily: Fonts.extraBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  buttonMd: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  caption: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  overline: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
} as const;
