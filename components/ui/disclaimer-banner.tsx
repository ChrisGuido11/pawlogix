import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

interface DisclaimerBannerProps {
  className?: string;
}

// Spec: bg-primary-light (#E8F6FC), rounded-xl (12px), p-3,
// info circle icon in primary, 12px text-muted, NO border
export function DisclaimerBanner({ className = '' }: DisclaimerBannerProps) {
  return (
    <View
      accessible={true}
      accessibilityRole="text"
      style={{
        backgroundColor: Colors.primaryLight,
        borderRadius: BorderRadius.button,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
      }}
      className={className}
    >
      <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
      <Text
        style={[
          Typography.caption,
          {
            color: Colors.textMuted,
            flex: 1,
          },
        ]}
      >
        AI interpretation — always consult your veterinarian for medical decisions
      </Text>
    </View>
  );
}
