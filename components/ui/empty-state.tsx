import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './button';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'paw-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Ionicons name={icon} size={64} color="rgba(13, 115, 119, 0.2)" />
      <Text className="text-lg font-semibold text-text-primary mt-4 text-center">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-sm text-text-secondary mt-2 text-center max-w-[280px]">
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          className="mt-6 w-full"
        />
      )}
    </View>
  );
}
