import { Pressable, ActivityIndicator, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import { Gradients, Colors } from '@/constants/Colors';
import { Shadows } from '@/constants/spacing';

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

  const sizeStyles = {
    sm: 'py-2.5 px-4',
    md: 'py-3.5 px-6',
    lg: 'py-4 px-8',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;

  // Primary uses gradient
  if (variant === 'primary') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={[animatedStyle, isDisabled ? {} : Shadows.glow]}
        className={className}
      >
        <LinearGradient
          colors={isDisabled ? ['#D1D5DB', '#D1D5DB'] : [...Gradients.primaryCta]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className={`rounded-xl ${sizeStyles[size]} flex-row items-center justify-center gap-2`}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              {icon && <Ionicons name={icon} size={iconSize} color="#FFFFFF" />}
              <Text className={`${textSizeStyles[size]} font-bold text-white`}>
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  // Destructive uses gradient
  if (variant === 'destructive') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={[animatedStyle, isDisabled ? {} : {
          shadowColor: '#EF5350',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 4,
        }]}
        className={className}
      >
        <LinearGradient
          colors={isDisabled ? ['#D1D5DB', '#D1D5DB'] : [...Gradients.destructive]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className={`rounded-xl ${sizeStyles[size]} flex-row items-center justify-center gap-2`}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              {icon && <Ionicons name={icon} size={iconSize} color="#FFFFFF" />}
              <Text className={`${textSizeStyles[size]} font-bold text-white`}>
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  // Secondary & Ghost
  const variantStyles = {
    secondary: isDisabled ? 'bg-disabled/20' : 'bg-primary-light',
    ghost: '',
  };
  const textStyles = {
    secondary: isDisabled ? 'text-text-secondary' : 'text-primary',
    ghost: isDisabled ? 'text-text-secondary' : 'text-primary',
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      className={`rounded-xl ${sizeStyles[size]} flex-row items-center justify-center gap-2 ${variantStyles[variant]} ${className}`}
      style={[animatedStyle, variant === 'secondary' && !isDisabled ? Shadows.sm : {}]}
    >
      {loading ? (
        <ActivityIndicator color="#0D7377" size="small" />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={isDisabled ? Colors.textSecondary : Colors.primary}
            />
          )}
          <Text className={`${textSizeStyles[size]} font-bold ${textStyles[variant]}`}>
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
