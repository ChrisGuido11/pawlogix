import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

export function useStaggeredEntrance(index: number, delay = 80) {
  const translateY = useSharedValue(24);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const staggerDelay = index * delay;
    translateY.value = withDelay(
      staggerDelay,
      withSpring(0, { damping: 18, stiffness: 120 })
    );
    opacity.value = withDelay(
      staggerDelay,
      withSpring(1, { damping: 18, stiffness: 120 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return animatedStyle;
}
