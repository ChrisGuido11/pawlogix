import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface DisclaimerBannerProps {
  className?: string;
}

export function DisclaimerBanner({ className = '' }: DisclaimerBannerProps) {
  return (
    <View
      className={`bg-primary-50 rounded-xl p-3 flex-row items-start gap-2 ${className}`}
      style={{ borderWidth: 1, borderColor: Colors.primary100 }}
    >
      <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
      <Text className="text-xs text-text-secondary flex-1 leading-4">
        AI interpretation — always consult your veterinarian for medical decisions
      </Text>
    </View>
  );
}
