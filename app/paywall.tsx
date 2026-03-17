import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  withRepeat,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/button';
import { Colors, Gradients } from '@/constants/Colors';
import { Spacing, Shadows, BorderRadius } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';
import { FREE_LIMITS, getResetDateLabel } from '@/lib/subscription';
import { useOfferings } from '@/hooks/useOfferings';
import { purchasePackage, restorePurchases, checkEntitlement } from '@/lib/revenucat';
import { PACKAGE_TYPE } from 'react-native-purchases';

// ---------- Feature row ----------
function FeatureRow({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  isFree,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  isFree: boolean;
  delay: number;
}) {
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(delay, withSpring(0, { damping: 16, stiffness: 120 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animStyle}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
          paddingVertical: Spacing.md,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: BorderRadius.button,
            backgroundColor: iconBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>
            {title}
          </Text>
          <Text style={[Typography.secondary, { color: Colors.textMuted }]}>
            {subtitle}
          </Text>
        </View>
        {isFree ? (
          <View
            style={{
              backgroundColor: Colors.successLight,
              borderRadius: BorderRadius.pill,
              paddingHorizontal: Spacing.sm,
              paddingVertical: 2,
            }}
          >
            <Text style={[Typography.caption, { color: Colors.success }]}>FREE</Text>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: Colors.warningLight,
              borderRadius: BorderRadius.pill,
              paddingHorizontal: Spacing.sm,
              paddingVertical: 2,
            }}
          >
            <Text style={[Typography.caption, { color: Colors.warning }]}>PRO</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ---------- Pricing card ----------
function PricingCard({
  title,
  price,
  period,
  savings,
  isPopular,
  selected,
  onSelect,
}: {
  title: string;
  price: string;
  period: string;
  savings?: string;
  isPopular?: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect();
      }}
    >
      <View
        style={[
          Shadows.md,
          {
            backgroundColor: Colors.surface,
            borderRadius: BorderRadius.card,
            padding: Spacing.lg,
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? Colors.primary : Colors.border,
            position: 'relative',
            overflow: 'hidden',
          },
        ]}
      >
        {isPopular && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              backgroundColor: Colors.secondary,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.xs,
              borderBottomLeftRadius: BorderRadius.button,
            }}
          >
            <Text style={[Typography.caption, { color: Colors.textHeading, fontFamily: Fonts.bold }]}>
              BEST VALUE
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          {/* Radio circle */}
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 2,
              borderColor: selected ? Colors.primary : Colors.disabled,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selected && (
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: Colors.primary,
                }}
              />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>
              {title}
            </Text>
            {savings && (
              <Text style={[Typography.caption, { color: Colors.success }]}>
                {savings}
              </Text>
            )}
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[Typography.sectionHeading, { color: Colors.textHeading }]}>
              {price}
            </Text>
            <Text style={[Typography.caption, { color: Colors.textMuted }]}>
              {period}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ---------- Main paywall screen ----------
export default function PaywallScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { packages, isLoading: offeringsLoading } = useOfferings();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Map RevenueCat packages by type
  const annualPackage = packages.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL);
  const monthlyPackage = packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);

  // Mascot animation
  const mascotScale = useSharedValue(0.6);
  const mascotY = useSharedValue(20);
  const floatY = useSharedValue(0);

  useEffect(() => {
    mascotScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    mascotY.value = withSpring(0, { damping: 14, stiffness: 100 });
    // Gentle float after entrance
    const timer = setTimeout(() => {
      floatY.value = withRepeat(
        withTiming(6, { duration: 2500 }),
        -1,
        true
      );
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: mascotScale.value },
      { translateY: mascotY.value + floatY.value },
    ],
  }));

  // Default to annual plan
  const [selectedPlan, setSelectedPlan] = useState('annual');

  const handleSubscribe = async () => {
    const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
    if (!pkg) {
      Alert.alert('Unavailable', 'This plan is not available right now. Please try again later.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPurchasing(true);
    try {
      const info = await purchasePackage(pkg);
      if (info) {
        // Verify entitlement is active before closing
        const entitled = await checkEntitlement('Pawlogix pro');
        if (entitled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        } else {
          // Purchase succeeded but entitlement not yet active
          Alert.alert(
            'Almost There',
            'Your purchase is being processed. Please try again in a moment.'
          );
        }
      }
      // null means user cancelled — do nothing
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      Alert.alert('Purchase Failed', message);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRestoring(true);
    try {
      const info = await restorePurchases();
      const hasPro = info.entitlements.active['Pawlogix pro'] !== undefined;
      if (hasPro) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Restored!', 'Your PawLogix Pro subscription has been restored.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('No Subscription Found', 'We could not find a previous PawLogix Pro subscription for this account.');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not restore purchases. Please try again.';
      Alert.alert('Restore Failed', message);
    } finally {
      setIsRestoring(false);
    }
  };

  const resetDate = getResetDateLabel();

  // Use dynamic prices from RevenueCat, fallback to hardcoded
  const annualPrice = annualPackage?.product.priceString ?? '$39.99';
  const monthlyPrice = monthlyPackage?.product.priceString ?? '$4.99';

  const features = [
    {
      icon: 'scan' as const,
      iconColor: Colors.primary,
      iconBg: Colors.primaryLight,
      title: 'Unlimited Record Scans',
      subtitle: `Free: ${FREE_LIMITS.scansPerMonth}/month`,
      isFree: false,
    },
    {
      icon: 'chatbubbles' as const,
      iconColor: Colors.primaryDark,
      iconBg: Colors.primaryLight,
      title: 'Unlimited Health Chat',
      subtitle: `Free: ${FREE_LIMITS.chatMessagesPerRecord} messages/record`,
      isFree: false,
    },
    {
      icon: 'paw' as const,
      iconColor: Colors.primary,
      iconBg: Colors.primaryLight,
      title: 'Unlimited Pets',
      subtitle: `Free: ${FREE_LIMITS.maxPets} pet`,
      isFree: false,
    },
    {
      icon: 'notifications' as const,
      iconColor: Colors.success,
      iconBg: Colors.successLight,
      title: 'Medication Reminders',
      subtitle: 'Always free, unlimited',
      isFree: true,
    },
    {
      icon: 'shield-checkmark' as const,
      iconColor: Colors.success,
      iconBg: Colors.successLight,
      title: 'Vaccine Tracking',
      subtitle: 'Always free, unlimited',
      isFree: true,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Close button */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            paddingHorizontal: Spacing.lg,
            paddingTop: Spacing.sm,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: Colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={18} color={Colors.textBody} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: Spacing['5xl'] }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero section */}
          <View style={{ alignItems: 'center', paddingTop: Spacing.sm, paddingBottom: Spacing.xl }}>
            <Animated.View
              style={[
                mascotStyle,
                {
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  overflow: 'hidden',
                  marginBottom: Spacing.lg,
                },
              ]}
            >
              <Image
                source={require('@/assets/illustrations/mascot-celebrating.png')}
                style={{ width: 140, height: 140 }}
                contentFit="cover"
              />
            </Animated.View>

            <Animated.View entering={FadeIn.delay(200).duration(400)}>
              <LinearGradient
                colors={Gradients.primaryCta}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.xs,
                  borderRadius: BorderRadius.pill,
                  marginBottom: Spacing.md,
                }}
              >
                <Text style={[Typography.caption, { color: Colors.textOnPrimary, fontFamily: Fonts.bold, letterSpacing: 1 }]}>
                  PAWLOGIX PRO
                </Text>
              </LinearGradient>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(350).duration(400)}>
              <Text
                style={[
                  Typography.contentTitle,
                  { color: Colors.textHeading, textAlign: 'center', marginBottom: Spacing.sm },
                ]}
              >
                Unlock full pet health insights
              </Text>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(450).duration(400)}>
              <Text
                style={[
                  Typography.body,
                  { color: Colors.textBody, textAlign: 'center', paddingHorizontal: Spacing['3xl'], maxWidth: 340 },
                ]}
              >
                Unlimited scans, deeper AI analysis, and health trends across every visit.
              </Text>
            </Animated.View>
          </View>

          {/* Scan limit reminder */}
          <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
            <Animated.View entering={FadeIn.delay(500).duration(400)}>
              <View
                style={[
                  Shadows.sm,
                  {
                    backgroundColor: Colors.warningLight,
                    borderRadius: BorderRadius.card,
                    padding: Spacing.lg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.md,
                  },
                ]}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: Colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="scan" size={20} color={Colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>
                    You've used your free scans
                  </Text>
                  <Text style={[Typography.secondary, { color: Colors.textBody }]}>
                    Free scans reset {resetDate}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Pricing cards */}
          <View style={{ paddingHorizontal: Spacing.xl, gap: Spacing.md, marginBottom: Spacing['2xl'] }}>
            <Animated.View entering={FadeIn.delay(550).duration(400)}>
              <PricingCard
                title="Annual"
                price={annualPrice}
                period="/year"
                savings="Save 33%"
                isPopular
                selected={selectedPlan === 'annual'}
                onSelect={() => setSelectedPlan('annual')}
              />
            </Animated.View>
            <Animated.View entering={FadeIn.delay(650).duration(400)}>
              <PricingCard
                title="Monthly"
                price={monthlyPrice}
                period="/month"
                selected={selectedPlan === 'monthly'}
                onSelect={() => setSelectedPlan('monthly')}
              />
            </Animated.View>
          </View>

          {/* CTA button */}
          <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing['2xl'] }}>
            <Animated.View entering={FadeIn.delay(700).duration(400)}>
              <Button
                title={
                  selectedPlan === 'annual'
                    ? `Start Pro — ${annualPrice}/year`
                    : `Start Pro — ${monthlyPrice}/month`
                }
                onPress={handleSubscribe}
                loading={isPurchasing}
                size="lg"
              />
            </Animated.View>
            <Animated.View entering={FadeIn.delay(750).duration(400)}>
              <Text
                style={[
                  Typography.caption,
                  { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md },
                ]}
              >
                Cancel anytime. No commitment.
              </Text>
            </Animated.View>
          </View>

          {/* Feature comparison */}
          <View style={{ paddingHorizontal: Spacing.xl }}>
            <Animated.View entering={FadeIn.delay(800).duration(400)}>
              <Text
                style={[
                  Typography.overline,
                  { color: Colors.textMuted, marginBottom: Spacing.md },
                ]}
              >
                WHAT'S INCLUDED
              </Text>
            </Animated.View>

            <View
              style={[
                Shadows.sm,
                {
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.card,
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.sm,
                },
              ]}
            >
              {features.map((feature, index) => (
                <View key={feature.title}>
                  <FeatureRow
                    {...feature}
                    delay={850 + index * 80}
                  />
                  {index < features.length - 1 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: Colors.border,
                        marginLeft: 40 + Spacing.md,
                      }}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Restore purchases */}
          <Animated.View entering={FadeIn.delay(1200).duration(400)}>
            <Pressable
              onPress={handleRestore}
              disabled={isRestoring}
              style={{ alignSelf: 'center', marginTop: Spacing.xl, paddingVertical: Spacing.md }}
            >
              <Text style={[Typography.secondary, { color: Colors.textMuted }]}>
                {isRestoring ? 'Restoring...' : 'Restore Purchases'}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Apple-required subscription terms */}
          <Animated.View entering={FadeIn.delay(1300).duration(400)}>
            <View style={{ paddingHorizontal: Spacing['2xl'], marginTop: Spacing.xl, marginBottom: Spacing.lg }}>
              <Text
                style={[
                  Typography.caption,
                  { color: Colors.textMuted, textAlign: 'center', lineHeight: 16 },
                ]}
              >
                Payment will be charged to your Apple ID account at confirmation of purchase.
                Subscription automatically renews unless it is canceled at least 24 hours before
                the end of the current period. Your account will be charged for renewal within
                24 hours prior to the end of the current period. You can manage and cancel your
                subscriptions by going to your App Store account settings after purchase.
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: Spacing.lg,
                  marginTop: Spacing.md,
                }}
              >
                <Pressable onPress={() => Linking.openURL('https://pawlogix.lovable.app/privacy')}>
                  <Text style={[Typography.caption, { color: Colors.primary }]}>Privacy Policy</Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL('https://pawlogix.lovable.app/terms')}>
                  <Text style={[Typography.caption, { color: Colors.primary }]}>Terms of Service</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
