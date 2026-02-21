import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, useWindowDimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { GradientBackground } from '@/components/ui/gradient-background';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows } from '@/constants/spacing';

const ONBOARDING_KEY = 'pawlogix_onboarding_complete';

const slides = [
  {
    icon: 'scan-outline' as const,
    accent1: 'camera-outline' as const,
    accent2: 'document-text-outline' as const,
    title: 'Scan any vet record',
    subtitle: "Take a photo or upload a document — we'll do the rest.",
  },
  {
    icon: 'sparkles-outline' as const,
    accent1: 'flask-outline' as const,
    accent2: 'chatbubble-outline' as const,
    title: 'AI translates the medical jargon',
    subtitle: 'Complex lab values and medical terms explained in plain English.',
  },
  {
    icon: 'trending-up-outline' as const,
    accent1: 'heart-outline' as const,
    accent2: 'shield-checkmark-outline' as const,
    title: "Track your pet's health over time",
    subtitle: "See trends, get reminders, and be your pet's best advocate.",
  },
];

function FloatingIcon({ icon, offsetX, offsetY, delay = 0 }: {
  icon: keyof typeof Ionicons.glyphMap;
  offsetX: number;
  offsetY: number;
  delay?: number;
}) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    setTimeout(() => {
      translateY.value = withRepeat(
        withTiming(10, { duration: 2200 }),
        -1,
        true
      );
    }, delay);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[animStyle, { position: 'absolute', left: offsetX, top: offsetY }]}
    >
      <Ionicons name={icon} size={22} color={Colors.secondary} />
    </Animated.View>
  );
}

function Dot({ index, activeIndex }: { index: number; activeIndex: number }) {
  const animWidth = useSharedValue(index === 0 ? 28 : 8);
  const animOpacity = useSharedValue(index === 0 ? 1 : 0.4);

  useEffect(() => {
    animWidth.value = withTiming(index === activeIndex ? 28 : 8, { duration: 300 });
    animOpacity.value = withTiming(index === activeIndex ? 1 : 0.4, { duration: 300 });
  }, [activeIndex]);

  const dotStyle = useAnimatedStyle(() => ({
    width: animWidth.value,
    opacity: animOpacity.value,
  }));

  return (
    <Animated.View
      style={dotStyle}
      className={`h-2 rounded-full ${
        index === activeIndex ? 'bg-primary' : 'bg-primary-200'
      }`}
    />
  );
}

function PageIndicator({ activeIndex }: { activeIndex: number }) {
  return (
    <View className="flex-row items-center justify-center gap-2 mb-6">
      {slides.map((_, index) => (
        <Dot key={index} index={index} activeIndex={activeIndex} />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
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

  return (
    <View className="flex-1">
      <GradientBackground variant="warm">
        <SafeAreaView className="flex-1">
          <View className="flex-row justify-end px-6 pt-2 pb-4">
            {activeIndex < 2 ? (
              <Pressable onPress={skipToEnd} hitSlop={12}>
                <Text className="text-base text-text-secondary">Skip</Text>
              </Pressable>
            ) : (
              <View className="h-6" />
            )}
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            className="flex-1"
          >
            {slides.map((slide, index) => (
              <View
                key={index}
                style={{ width }}
                className="flex-1 items-center pt-16 px-10"
              >
                {/* Composed illustration */}
                <View style={{ width: 120, height: 120, position: 'relative' }}>
                  <LinearGradient
                    colors={[...Gradients.primaryCta]}
                    style={[
                      Shadows.lg,
                      {
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'absolute',
                        left: 20,
                        top: 20,
                      },
                    ]}
                  >
                    <Ionicons name={slide.icon} size={40} color="#FFFFFF" />
                  </LinearGradient>
                  <FloatingIcon icon={slide.accent1} offsetX={-8} offsetY={0} delay={0} />
                  <FloatingIcon icon={slide.accent2} offsetX={95} offsetY={15} delay={400} />
                </View>

                <Text
                  style={{ fontSize: 28, fontWeight: '700', color: Colors.textPrimary }}
                  className="text-center mb-3 mt-10"
                >
                  {slide.title}
                </Text>
                <Text className="text-base text-text-secondary text-center leading-6 max-w-[300px]">
                  {slide.subtitle}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View className="px-8 pb-8">
            <PageIndicator activeIndex={activeIndex} />

            {activeIndex === 2 ? (
              <Button title="Get Started" onPress={completeOnboarding} />
            ) : (
              <Button
                title="Next"
                onPress={() => scrollRef.current?.scrollTo({ x: width * (activeIndex + 1), animated: true })}
                variant="secondary"
              />
            )}
          </View>
        </SafeAreaView>
      </GradientBackground>
    </View>
  );
}
