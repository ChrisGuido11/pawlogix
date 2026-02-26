import { View, Text, TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors } from '@/constants/Colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'info' | 'watch' | 'urgent' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantConfig = {
  primary: {
    bg: Colors.primaryLight,
    text: Colors.primary,
    dot: Colors.primary,
  },
  get info() { return variantConfig.primary; },
  watch: {
    bg: Colors.warningLight,
    text: Colors.warning,
    dot: Colors.warning,
  },
  urgent: {
    bg: Colors.errorLight,
    text: Colors.error,
    dot: Colors.error,
  },
  success: {
    bg: Colors.successLight,
    text: Colors.success,
    dot: Colors.success,
  },
};

const sizeConfig = {
  sm: { paddingH: Spacing.sm, paddingV: 2, textStyle: { ...Typography.tabLabel, fontFamily: Fonts.semiBold } as TextStyle },
  md: { paddingH: Spacing.md, paddingV: Spacing.xs, textStyle: { ...Typography.caption, fontFamily: Fonts.semiBold } as TextStyle },
  lg: { paddingH: Spacing.lg, paddingV: 6, textStyle: { ...Typography.bodySm, fontFamily: Fonts.semiBold } as TextStyle },
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
      style={[
        {
          backgroundColor: config.bg,
          borderRadius: BorderRadius.pill,
          paddingHorizontal: sizeStyle.paddingH,
          paddingVertical: sizeStyle.paddingV,
          flexDirection: 'row',
          alignItems: 'center',
        },
        pulseStyle,
      ]}
      className={className}
    >
      {showDot && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: config.dot,
            marginRight: 5,
          }}
        />
      )}
      <Text
        style={[
          sizeStyle.textStyle,
          {
            color: config.text,
            textAlign: 'center',
          },
        ]}
      >
        {label}
      </Text>
    </Animated.View>
  );
}
