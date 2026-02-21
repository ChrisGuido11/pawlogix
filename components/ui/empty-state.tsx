import { View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './button';
import { Shadows } from '@/constants/spacing';
import { Colors } from '@/constants/Colors';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  accentIcon1?: keyof typeof Ionicons.glyphMap;
  accentIcon2?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

function FloatingAccent({
  icon,
  size,
  color,
  offsetX,
  offsetY,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  size: number;
  color: string;
  offsetX: number;
  offsetY: number;
}) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(8, { duration: 2000 }),
      -1,
      true
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        floatStyle,
        {
          position: 'absolute',
          left: offsetX,
          top: offsetY,
        },
      ]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Animated.View>
  );
}

export function EmptyState({
  icon = 'paw-outline',
  accentIcon1 = 'heart-outline',
  accentIcon2 = 'sparkles-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View style={{ width: 120, height: 120, position: 'relative' }}>
        <View
          style={[
            Shadows.md,
            {
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: Colors.primary50,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Ionicons name={icon} size={52} color={Colors.primary} />
        </View>
        <FloatingAccent
          icon={accentIcon1}
          size={20}
          color={Colors.secondary}
          offsetX={-16}
          offsetY={-8}
        />
        <FloatingAccent
          icon={accentIcon2}
          size={18}
          color={Colors.primary300}
          offsetX={108}
          offsetY={10}
        />
      </View>
      <Text className="text-xl font-bold text-text-primary mt-6 text-center">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-base text-text-secondary mt-2 text-center max-w-[300px]">
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <View className="mt-6 w-full">
          <Button title={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}
