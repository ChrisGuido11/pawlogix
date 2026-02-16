import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DisclaimerBannerProps {
  className?: string;
}

export function DisclaimerBanner({ className = '' }: DisclaimerBannerProps) {
  return (
    <View className={`bg-primary/5 rounded-lg p-3 flex-row items-start gap-2 ${className}`}>
      <Ionicons name="information-circle-outline" size={16} color="#64748B" />
      <Text className="text-xs text-text-secondary flex-1">
        AI interpretation — always consult your veterinarian for medical decisions
      </Text>
    </View>
  );
}
