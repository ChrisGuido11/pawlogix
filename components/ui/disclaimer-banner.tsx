import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface DisclaimerBannerProps {
  className?: string;
}

// Spec: bg-primary-light (#E8F6FC), rounded-xl (12px), p-3,
// info circle icon in primary, 12px text-muted, NO border
export function DisclaimerBanner({ className = '' }: DisclaimerBannerProps) {
  return (
    <View
      style={{
        backgroundColor: Colors.primaryLight,
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
      }}
      className={className}
    >
      <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
      <Text
        style={{
          fontSize: 12,
          color: Colors.textMuted,
          flex: 1,
          lineHeight: 16,
        }}
      >
        AI interpretation — always consult your veterinarian for medical decisions
      </Text>
    </View>
  );
}
