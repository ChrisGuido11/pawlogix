import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, useWindowDimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/Colors';
import { Shadows } from '@/constants/spacing';

const ONBOARDING_KEY = 'pawlogix_onboarding_complete';

const slides = [
  {
    title: 'Understand Your\nPet\u2019s Health',
    subtitle: 'Keep all your pet\u2019s medical records in one place and finally understand what they mean.',
    mainIcon: 'paw' as const,
    mainColor: Colors.primary,
    mainBg: Colors.primary50,
    ringColor: Colors.primary200,
    accents: [
      { icon: 'heart' as const, color: Colors.error, bg: Colors.errorLight, x: -20, y: -10, size: 44, delay: 0 },
      { icon: 'shield-checkmark' as const, color: Colors.success, bg: Colors.successLight, x: 130, y: 20, size: 40, delay: 300 },
      { icon: 'sparkles' as const, color: Colors.secondary, bg: Colors.secondary50, x: 110, y: 130, size: 36, delay: 600 },
      { icon: 'pulse' as const, color: Colors.primary400, bg: Colors.primary100, x: -10, y: 120, size: 32, delay: 150 },
    ],
  },
  {
    title: 'Scan Any\nVet Record',
    subtitle: 'Take a photo of lab results, prescriptions, or vaccine records \u2014 we\u2019ll handle the rest.',
    mainIcon: 'scan' as const,
    mainColor: Colors.secondary,
    mainBg: Colors.secondary50,
    ringColor: Colors.secondary200,
    accents: [
      { icon: 'camera' as const, color: Colors.primary, bg: Colors.primary50, x: -15, y: 0, size: 42, delay: 0 },
      { icon: 'document-text' as const, color: Colors.primary600, bg: Colors.primary100, x: 135, y: 10, size: 38, delay: 250 },
      { icon: 'sparkles' as const, color: Colors.secondary, bg: Colors.secondary50, x: 120, y: 135, size: 34, delay: 500 },
      { icon: 'checkmark-circle' as const, color: Colors.success, bg: Colors.successLight, x: -5, y: 125, size: 36, delay: 400 },
    ],
  },
  {
    title: 'Get Clear Answers,\nNot Jargon',
    subtitle: 'AI translates complex medical terms into plain English you can actually understand.',
    mainIcon: 'chatbubbles' as const,
    mainColor: Colors.primary,
    mainBg: Colors.primary50,
    ringColor: Colors.primary200,
    accents: [
      { icon: 'bulb' as const, color: Colors.secondary, bg: Colors.secondary50, x: -18, y: -5, size: 44, delay: 0 },
      { icon: 'flask' as const, color: Colors.primary400, bg: Colors.primary100, x: 132, y: 15, size: 38, delay: 200 },
      { icon: 'happy' as const, color: Colors.success, bg: Colors.successLight, x: 115, y: 130, size: 40, delay: 450 },
      { icon: 'medical' as const, color: Colors.error, bg: Colors.errorLight, x: -8, y: 118, size: 34, delay: 350 },
    ],
  },
];

function FloatingAccent({
  icon,
  color,
  bg,
  x,
  y,
  size,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  x: number;
  y: number;
  size: number;
  delay: number;
}) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 100 }));
    setTimeout(() => {
      translateY.value = withRepeat(
        withTiming(8, { duration: 2000 + delay }),
        -1,
        true
      );
    }, delay + 300);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        Shadows.md,
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Ionicons name={icon} size={size * 0.45} color={color} />
    </Animated.View>
  );
}

function SlideIllustration({
  slide,
}: {
  slide: (typeof slides)[0];
}) {
  const mainScale = useSharedValue(0);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    mainScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    ringScale.value = withDelay(150, withSpring(1, { damping: 16, stiffness: 80 }));
    ringOpacity.value = withDelay(150, withTiming(1, { duration: 400 }));
  }, []);

  const mainStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mainScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer ring */}
      <Animated.View
        style={[
          ringStyle,
          {
            position: 'absolute',
            width: 160,
            height: 160,
            borderRadius: 80,
            borderWidth: 2,
            borderColor: slide.ringColor,
            borderStyle: 'dashed',
          },
        ]}
      />

      {/* Main icon circle */}
      <Animated.View
        style={[
          mainStyle,
          Shadows.lg,
          {
            width: 110,
            height: 110,
            borderRadius: 55,
            backgroundColor: slide.mainBg,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Ionicons name={slide.mainIcon} size={52} color={slide.mainColor} />
      </Animated.View>

      {/* Floating accents */}
      {slide.accents.map((accent, i) => (
        <FloatingAccent key={i} {...accent} />
      ))}
    </View>
  );
}

function Dot({ index, activeIndex }: { index: number; activeIndex: number }) {
  const animWidth = useSharedValue(index === 0 ? 28 : 8);
  const animOpacity = useSharedValue(index === 0 ? 1 : 0.3);

  useEffect(() => {
    animWidth.value = withTiming(index === activeIndex ? 28 : 8, { duration: 300 });
    animOpacity.value = withTiming(index === activeIndex ? 1 : 0.3, { duration: 300 });
  }, [activeIndex]);

  const dotStyle = useAnimatedStyle(() => ({
    width: animWidth.value,
    opacity: animOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        dotStyle,
        {
          height: 8,
          borderRadius: 4,
          backgroundColor: index === activeIndex ? Colors.primary : Colors.primary200,
        },
      ]}
    />
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: any) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / width);
    setActiveIndex(index);
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/pet/create');
  };

  const skipToEnd = () => {
    scrollRef.current?.scrollTo({ x: width * 2, animated: true });
  };

  // 60/40 split
  const illustrationHeight = height * 0.52;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Skip button — top right */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 }}>
          {activeIndex < 2 ? (
            <Pressable onPress={skipToEnd} hitSlop={12}>
              <Text style={{ fontSize: 16, color: Colors.textSecondary }}>Skip</Text>
            </Pressable>
          ) : (
            <View style={{ height: 22 }} />
          )}
        </View>

        {/* Horizontal paging */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={{ flex: 1 }}
        >
          {slides.map((slide, index) => (
            <View key={index} style={{ width, flex: 1 }}>
              {/* Top 60%: Illustration area */}
              <View
                style={{
                  height: illustrationHeight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SlideIllustration slide={slide} />
              </View>

              {/* Bottom 40%: Text content */}
              <View style={{ flex: 1, paddingHorizontal: 32 }}>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '700',
                    color: Colors.textPrimary,
                    textAlign: 'center',
                    lineHeight: 36,
                    marginBottom: 12,
                  }}
                >
                  {slide.title}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: Colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: 24,
                    maxWidth: 300,
                    alignSelf: 'center',
                  }}
                >
                  {slide.subtitle}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Bottom: Dots + CTA */}
        <View style={{ paddingHorizontal: 32, paddingBottom: 32 }}>
          {/* Dot indicators */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
            {slides.map((_, index) => (
              <Dot key={index} index={index} activeIndex={activeIndex} />
            ))}
          </View>

          {activeIndex === 2 ? (
            <Button title="Get Started" onPress={completeOnboarding} icon="paw" />
          ) : (
            <Button
              title="Next"
              onPress={() => scrollRef.current?.scrollTo({ x: width * (activeIndex + 1), animated: true })}
              variant="secondary"
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
