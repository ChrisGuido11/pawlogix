import { View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'info' | 'watch' | 'urgent' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantConfig = {
  primary: { bg: 'bg-primary-50', text: 'text-primary', border: '#B3DDDE', dot: '#0D7377' },
  info: { bg: 'bg-info/10', text: 'text-info', border: '#90CAF9', dot: '#2196F3' },
  watch: { bg: 'bg-warning/10', text: 'text-warning', border: '#FFE0B2', dot: '#FF9800' },
  urgent: { bg: 'bg-error/10', text: 'text-error', border: '#FFCDD2', dot: '#EF5350' },
  success: { bg: 'bg-success/10', text: 'text-success', border: '#C8E6C9', dot: '#4CAF50' },
};

const sizeConfig = {
  sm: { container: 'px-2 py-0.5', text: 'text-[10px]' },
  md: { container: 'px-3 py-1', text: 'text-xs' },
  lg: { container: 'px-4 py-1.5', text: 'text-sm' },
};

export function Badge({ label, variant = 'primary', size = 'md', className = '' }: BadgeProps) {
  const config = variantConfig[variant];
  const sizeStyle = sizeConfig[size];
  const showDot = variant === 'watch' || variant === 'urgent';
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (variant === 'urgent') {
      pulseOpacity.value = withRepeat(
        withTiming(0.5, { duration: 1200 }),
        -1,
        true
      );
    }
  }, [variant]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: variant === 'urgent' ? pulseOpacity.value : 1,
  }));

  return (
    <Animated.View
      style={[{ borderWidth: 1, borderColor: config.border }, pulseStyle]}
      className={`rounded-full ${sizeStyle.container} ${config.bg} flex-row items-center ${className}`}
    >
      {showDot && (
        <View
          style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: config.dot, marginRight: 5 }}
        />
      )}
      <Text className={`${sizeStyle.text} font-semibold ${config.text} text-center`}>{label}</Text>
    </Animated.View>
  );
}
