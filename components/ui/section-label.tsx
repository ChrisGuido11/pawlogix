import { Text, TextStyle, StyleProp } from 'react-native';
import { Typography } from '@/constants/typography';
import { Colors } from '@/constants/Colors';

interface SectionLabelProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export function SectionLabel({ children, style }: SectionLabelProps) {
  return (
    <Text style={[Typography.overline, { color: Colors.textMuted }, style]}>
      {children}
    </Text>
  );
}
