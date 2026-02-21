import { Pressable, ActivityIndicator, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import { Colors } from '@/constants/Colors';
import { Shadows, BorderRadius } from '@/constants/spacing';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const sizeHeights = {
  sm: 40,
  md: 50,
  lg: 56,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const { onPressIn, onPressOut, animatedStyle } = usePressAnimation(0.96);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const textSizes = { sm: 14, md: 16, lg: 18 };
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;
  const height = sizeHeights[size];

  const baseStyle = {
    height,
    borderRadius: BorderRadius.button,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingHorizontal: 24,
  };

  if (variant === 'primary') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={[
          animatedStyle,
          baseStyle,
          {
            backgroundColor: isDisabled ? Colors.disabled : Colors.secondary,
          },
          isDisabled ? {} : Shadows.warmGlow,
        ]}
        className={className}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            {icon && <Ionicons name={icon} size={iconSize} color="#FFFFFF" />}
            <Text style={{ fontSize: textSizes[size], fontWeight: '700', color: '#FFFFFF' }}>
              {title}
            </Text>
          </>
        )}
      </AnimatedPressable>
    );
  }

  if (variant === 'destructive') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={[
          animatedStyle,
          baseStyle,
          {
            backgroundColor: isDisabled ? Colors.disabled : Colors.error,
          },
          isDisabled ? {} : {
            shadowColor: Colors.error,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 4,
          },
        ]}
        className={className}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            {icon && <Ionicons name={icon} size={iconSize} color="#FFFFFF" />}
            <Text style={{ fontSize: textSizes[size], fontWeight: '700', color: '#FFFFFF' }}>
              {title}
            </Text>
          </>
        )}
      </AnimatedPressable>
    );
  }

  // Secondary & Ghost
  const bgColor = variant === 'secondary'
    ? (isDisabled ? '#E5E7EB33' : Colors.primary50)
    : 'transparent';
  const textColor = isDisabled ? Colors.textSecondary : Colors.primary;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      style={[
        animatedStyle,
        baseStyle,
        { backgroundColor: bgColor },
        variant === 'secondary' && !isDisabled ? Shadows.sm : {},
      ]}
      className={className}
    >
      {loading ? (
        <ActivityIndicator color={Colors.primary} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={iconSize} color={textColor} />}
          <Text style={{ fontSize: textSizes[size], fontWeight: '700', color: textColor }}>
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
