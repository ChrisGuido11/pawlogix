import { View, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import { Shadows, BorderRadius } from '@/constants/spacing';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'subtle';
  className?: string;
  style?: any;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  children,
  onPress,
  variant = 'default',
  className = '',
  style,
}: CardProps) {
  const { onPressIn, onPressOut, animatedStyle } = usePressAnimation(0.97);

  const shadowStyle = variant === 'elevated' ? Shadows.lg : variant === 'subtle' ? Shadows.sm : Shadows.md;

  // Spec: bg-surface (#FFFFFF), rounded-2xl (16px), p-4 (16px), no border, shadow only
  const baseStyles = 'bg-surface rounded-2xl p-4';

  if (onPress) {
    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    };

    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessible={true}
        accessibilityRole="button"
        className={`${baseStyles} ${className}`}
        style={[shadowStyle, animatedStyle, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View accessible={true} className={`${baseStyles} ${className}`} style={[shadowStyle, style]}>
      {children}
    </View>
  );
}
