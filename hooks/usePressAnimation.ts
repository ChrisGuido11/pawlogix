import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

export function usePressAnimation(scaleTo = 0.97) {
  const scale = useSharedValue(1);

  const onPressIn = () => {
    scale.value = withSpring(scaleTo, { damping: 15, stiffness: 300 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { onPressIn, onPressOut, animatedStyle };
}
