import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Button } from './button';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  /** Path to mascot illustration image (e.g. require('@/assets/illustrations/mascot-sleeping.png')) */
  illustration?: any;
  /** Size of the illustration in px (default 140) */
  illustrationSize?: number;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Spec: Centered vertically, mascot illustration on soft blue blob (180px circle, bg-primary-light),
// title 20px SemiBold text-heading, subtitle 15px text-muted, CTA pill button mt-6
// If no illustration: paw icon placeholder in primary color on blue circle + TODO comment
export function EmptyState({
  icon = 'paw-outline',
  illustration,
  illustrationSize = 180,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const blobSize = 180;

  return (
    <View
      accessible={true}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing['5xl'] }}
    >
      {/* Illustration or placeholder */}
      {illustration ? (
        <View style={{ width: illustrationSize, height: illustrationSize, borderRadius: illustrationSize / 2, overflow: 'hidden' }}>
          <Image
            source={illustration}
            style={{ width: illustrationSize, height: illustrationSize }}
            contentFit="cover"
          />
        </View>
      ) : (
        <View
          style={{
            width: blobSize,
            height: blobSize,
            borderRadius: blobSize / 2,
            backgroundColor: Colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={64} color={Colors.primary} />
        </View>
      )}

      {/* Title */}
      <Text
        style={[
          Typography.sectionHeading,
          {
            color: Colors.textHeading,
            marginTop: Spacing['2xl'],
            textAlign: 'center',
          },
        ]}
      >
        {title}
      </Text>

      {/* Subtitle */}
      {subtitle && (
        <Text
          style={[
            Typography.body,
            {
              color: Colors.textMuted,
              marginTop: Spacing.sm,
              textAlign: 'center',
              maxWidth: 300,
            },
          ]}
        >
          {subtitle}
        </Text>
      )}

      {/* CTA */}
      {actionLabel && onAction && (
        <View style={{ marginTop: Spacing['2xl'], width: '100%' }}>
          <Button title={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}
