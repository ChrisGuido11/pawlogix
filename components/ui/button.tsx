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
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'pill';
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
  const { onPressIn, onPressOut, animatedStyle } = usePressAnimation(
    variant === 'pill' ? 0.95 : 0.97
  );

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  // --- Pill variant ---
  // Spec: bg-primary-light, text-primary, rounded-full, py-1.5 px-4, 13px Medium
  if (variant === 'pill') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={[
          animatedStyle,
          {
            backgroundColor: isDisabled ? Colors.disabled : Colors.primaryLight,
            borderRadius: BorderRadius.full,
            paddingVertical: 6,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          },
        ]}
        className={className}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={14}
            color={isDisabled ? Colors.textMuted : Colors.primary}
          />
        )}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '500',
            color: isDisabled ? Colors.textMuted : Colors.primary,
          }}
        >
          {title}
        </Text>
      </AnimatedPressable>
    );
  }

  // --- Size-based dimensions ---
  const sizeConfig = {
    sm: { height: 40, fontSize: 14, iconSize: 16, px: 20 },
    md: { height: 50, fontSize: 16, iconSize: 18, px: 24 },
    lg: { height: 56, fontSize: 18, iconSize: 22, px: 28 },
  };
  const cfg = sizeConfig[size];

  const baseStyle = {
    height: cfg.height,
    borderRadius: BorderRadius.button, // 12px
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingHorizontal: cfg.px,
  };

  // --- Primary variant ---
  // Spec: bg-primary (#5BC5F2), white text, bold, brand-tinted shadow
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
            backgroundColor: isDisabled ? Colors.disabled : Colors.primary,
          },
          isDisabled ? {} : Shadows.primaryButton,
        ]}
        className={className}
      >
        {loading ? (
          <ActivityIndicator color={Colors.textOnPrimary} size="small" />
        ) : (
          <>
            {icon && (
              <Ionicons name={icon} size={cfg.iconSize} color={Colors.textOnPrimary} />
            )}
            <Text
              style={{
                fontSize: cfg.fontSize,
                fontWeight: '700',
                color: Colors.textOnPrimary,
              }}
            >
              {title}
            </Text>
          </>
        )}
      </AnimatedPressable>
    );
  }

  // --- Destructive variant ---
  // Spec: transparent bg, 1.5px solid error border, error text
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
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: isDisabled ? Colors.disabled : Colors.error,
          },
        ]}
        className={className}
      >
        {loading ? (
          <ActivityIndicator color={Colors.error} size="small" />
        ) : (
          <>
            {icon && (
              <Ionicons
                name={icon}
                size={cfg.iconSize}
                color={isDisabled ? Colors.disabled : Colors.error}
              />
            )}
            <Text
              style={{
                fontSize: cfg.fontSize,
                fontWeight: '600',
                color: isDisabled ? Colors.disabled : Colors.error,
              }}
            >
              {title}
            </Text>
          </>
        )}
      </AnimatedPressable>
    );
  }

  // --- Secondary variant ---
  // Spec: transparent bg, 1.5px solid primary border, primary text
  if (variant === 'secondary') {
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
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: isDisabled ? Colors.disabled : Colors.primary,
          },
        ]}
        className={className}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <>
            {icon && (
              <Ionicons
                name={icon}
                size={cfg.iconSize}
                color={isDisabled ? Colors.disabled : Colors.primary}
              />
            )}
            <Text
              style={{
                fontSize: cfg.fontSize,
                fontWeight: '600',
                color: isDisabled ? Colors.disabled : Colors.primary,
              }}
            >
              {title}
            </Text>
          </>
        )}
      </AnimatedPressable>
    );
  }

  // --- Ghost variant ---
  // Transparent bg, primary text, no border
  const ghostTextColor = isDisabled ? Colors.textMuted : Colors.primary;
  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      style={[
        animatedStyle,
        baseStyle,
        { backgroundColor: 'transparent' },
      ]}
      className={className}
    >
      {loading ? (
        <ActivityIndicator color={Colors.primary} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={cfg.iconSize} color={ghostTextColor} />}
          <Text
            style={{
              fontSize: cfg.fontSize,
              fontWeight: '600',
              color: ghostTextColor,
            }}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
