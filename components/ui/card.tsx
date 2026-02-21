import { View, Pressable, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import { Shadows } from '@/constants/spacing';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  variant?: 'default' | 'elevated' | 'subtle';
  className?: string;
  style?: any;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  children,
  onPress,
  selected = false,
  variant = 'default',
  className = '',
  style,
}: CardProps) {
  const { onPressIn, onPressOut, animatedStyle } = usePressAnimation(0.98);

  const shadowStyle = selected
    ? Shadows.glow
    : variant === 'elevated'
      ? Shadows.lg
      : variant === 'subtle'
        ? Shadows.sm
        : Shadows.md;

  const bgClass = variant === 'subtle' ? 'bg-surface-muted' : 'bg-surface';
  const baseStyles = `${bgClass} rounded-2xl p-4`;

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
        className={`${baseStyles} ${className}`}
        style={[shadowStyle, animatedStyle, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View className={`${baseStyles} ${className}`} style={[shadowStyle, style]}>
      {children}
    </View>
  );
}
