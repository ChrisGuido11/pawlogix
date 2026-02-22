import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';

interface CurvedHeaderProps {
  /** Screen title displayed in white over the blue header */
  title: string;
  /** Optional subtitle below the title (white, 80% opacity) */
  subtitle?: string;
  /** Show a back arrow on the left */
  showBack?: boolean;
  /** Icon name for the right action button */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  /** Callback when right icon is pressed */
  onRightPress?: () => void;
  /** Additional content rendered below the title inside the blue zone */
  children?: React.ReactNode;
  /** Extra bottom padding for the blue zone (for overlapping avatars etc.) */
  extraPaddingBottom?: number;
}

/**
 * CurvedHeader — The signature visual element.
 *
 * Renders a sky-blue (#5BC5F2) header zone that extends behind the status bar
 * with white text, then transitions into the content area via a rounded overlap.
 *
 * Implementation: Option B from spec — content area has rounded-t-[30px] with
 * negative margin-top to overlap the blue zone, creating the curve illusion.
 *
 * Usage:
 * ```
 * <View style={{ flex: 1, backgroundColor: Colors.background }}>
 *   <CurvedHeader title="My Pets" />
 *   <View className="bg-background -mt-8 rounded-t-[30px] flex-1 pt-6 px-4">
 *     Content goes here
 *   </View>
 * </View>
 * ```
 *
 * Or use the companion <CurvedHeaderPage> for the full pattern.
 */
export function CurvedHeader({
  title,
  subtitle,
  showBack = false,
  rightIcon,
  onRightPress,
  children,
  extraPaddingBottom = 0,
}: CurvedHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={{
        backgroundColor: Colors.primary,
        paddingTop: insets.top + 16,
        paddingBottom: 48 + extraPaddingBottom,
        paddingHorizontal: 20,
      }}
    >
      {/* Top row: back button + right action */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: subtitle || children ? 8 : 4,
        }}
      >
        {/* Left side */}
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.textOnPrimary} />
          </Pressable>
        ) : null}

        {/* Title (centered between left and right) */}
        <View style={{ flex: 1, marginHorizontal: showBack ? 12 : 0 }}>
          <Text
            style={[
              Typography.screenTitle,
              {
                color: Colors.textOnPrimary,
                textAlign: showBack ? 'center' : 'left',
              },
            ]}
            numberOfLines={showBack ? 1 : undefined}
          >
            {title}
          </Text>
        </View>

        {/* Right side */}
        {rightIcon && onRightPress ? (
          <Pressable
            onPress={onRightPress}
            hitSlop={12}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={rightIcon} size={20} color={Colors.textOnPrimary} />
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Subtitle */}
      {subtitle && (
        <Text
          style={[
            Typography.body,
            {
              color: 'rgba(255,255,255,0.8)',
              textAlign: showBack ? 'center' : 'left',
              marginTop: 2,
            },
          ]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      )}

      {/* Optional extra content (filter pills, etc.) */}
      {children}
    </View>
  );
}

interface CurvedHeaderPageProps {
  /** Props forwarded to CurvedHeader */
  headerProps: CurvedHeaderProps;
  /** The main page content rendered in the curved content area */
  children: React.ReactNode;
  /** Additional style for the content wrapper */
  contentStyle?: object;
}

/**
 * CurvedHeaderPage — Full-page wrapper that combines CurvedHeader + curved content area.
 *
 * Implements the complete "Option B" pattern:
 * - Blue header zone with title
 * - Content area with rounded-t-[30px] overlapping the header via -mt-8
 * - Background color #F5F5F5
 */
export function CurvedHeaderPage({
  headerProps,
  children,
  contentStyle,
}: CurvedHeaderPageProps) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.primary }}>
      <CurvedHeader {...headerProps} />
      <View
        style={[
          {
            flex: 1,
            backgroundColor: Colors.background,
            marginTop: -32,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingTop: 24,
            paddingHorizontal: 16,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
