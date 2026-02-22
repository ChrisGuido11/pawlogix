import { View } from 'react-native';
import { Colors } from '@/constants/Colors';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  className?: string;
}

// Spec: bg #E8E8E8 (slightly darker for contrast on #F5F5F5),
// radius matches element being loaded (16px cards, rounded-full avatars),
// shimmer animation 1.5s loop
export function Skeleton({ width, height = 20, className = '' }: SkeletonProps) {
  const shimmerX = useSharedValue(-1);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + 0.3 * Math.sin(shimmerX.value * Math.PI),
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width: width as number,
          height,
          backgroundColor: Colors.border,
          borderRadius: 16,
        },
      ]}
      className={className}
    />
  );
}
