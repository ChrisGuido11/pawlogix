import { View } from 'react-native';
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
        { width: width as number, height },
      ]}
      className={`bg-border-light rounded-2xl ${className}`}
    />
  );
}
