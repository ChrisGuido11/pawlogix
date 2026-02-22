import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { Gradients } from '@/constants/Colors';

interface GradientBackgroundProps {
  variant?: 'warm' | 'primary' | 'surface' | 'cta';
  children: React.ReactNode;
  className?: string;
  style?: any;
}

const gradientMap = {
  warm: Gradients.warmBackground,
  primary: Gradients.primaryHeader,
  surface: Gradients.surfaceSubtle,
  cta: Gradients.primaryCta,
};

export function GradientBackground({
  variant = 'warm',
  children,
  style,
}: GradientBackgroundProps) {
  return (
    <LinearGradient
      colors={[...gradientMap[variant]]}
      style={[StyleSheet.absoluteFill, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
}
