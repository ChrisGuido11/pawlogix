import { Text, TextStyle, StyleProp } from 'react-native';
import { Typography } from '@/constants/typography';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';

interface SectionLabelProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export function SectionLabel({ children, style }: SectionLabelProps) {
  return (
    <Text accessibilityRole="header" style={[Typography.overline, { color: Colors.textMuted, marginTop: Spacing.xl, marginBottom: Spacing.md }, style]}>
      {children}
    </Text>
  );
}
