import { Pressable, ActivityIndicator, Text, View, TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import { Colors } from '@/constants/Colors';
import { Shadows, BorderRadius, Spacing } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';

interface ButtonProps {
  title: string;
  onPress: () => void | Promise<void>;
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

  const handlePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onPress();
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
            paddingHorizontal: Spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Spacing.xs,
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
          style={[
            Typography.secondary,
            {
              fontFamily: Fonts.medium,
              color: isDisabled ? Colors.textMuted : Colors.primary,
            },
          ]}
        >
          {title}
        </Text>
      </AnimatedPressable>
    );
  }

  // --- Size-based dimensions ---
  const sizeConfig = {
    sm: { height: 40, iconSize: 16, px: Spacing.xl },
    md: { height: 50, iconSize: 18, px: Spacing['2xl'] },
    lg: { height: 56, iconSize: 22, px: 28 },
  };
  const cfg = sizeConfig[size];

  // Typography presets per size for primary (bold) and secondary/ghost/destructive (semiBold)
  const primaryTextStyle: Record<string, TextStyle> = {
    sm: { ...Typography.bodySm, fontFamily: Fonts.bold },
    md: Typography.buttonPrimary,
    lg: Typography.buttonLg,
  };
  const secondaryTextStyle: Record<string, TextStyle> = {
    sm: { ...Typography.bodySm, fontFamily: Fonts.semiBold },
    md: Typography.buttonSecondary,
    lg: { ...Typography.buttonLg, fontFamily: Fonts.semiBold },
  };

  const baseStyle = {
    height: cfg.height,
    borderRadius: BorderRadius.button, // 12px
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: Spacing.sm,
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
              style={[
                primaryTextStyle[size],
                { color: Colors.textOnPrimary },
              ]}
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
              style={[
                secondaryTextStyle[size],
                { color: isDisabled ? Colors.disabled : Colors.error },
              ]}
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
              style={[
                secondaryTextStyle[size],
                { color: isDisabled ? Colors.disabled : Colors.primary },
              ]}
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
            style={[
              secondaryTextStyle[size],
              { color: ghostTextColor },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
