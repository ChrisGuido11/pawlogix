import { useState, useRef } from 'react';
import { View, Text, ScrollView, useWindowDimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '@/components/ui/button';

const ONBOARDING_KEY = 'pawlogix_onboarding_complete';

const slides = [
  {
    icon: 'scan-outline' as const,
    title: 'Scan any vet record',
    subtitle: "Take a photo or upload a document — we'll do the rest.",
  },
  {
    icon: 'sparkles-outline' as const,
    title: 'AI translates the medical jargon',
    subtitle: 'Complex lab values and medical terms explained in plain English.',
  },
  {
    icon: 'trending-up-outline' as const,
    title: 'Track your pet\'s health over time',
    subtitle: "See trends, get reminders, and be your pet's best advocate.",
  },
];

function PageIndicator({ activeIndex }: { activeIndex: number }) {
  return (
    <View className="flex-row items-center justify-center gap-2 mb-6">
      {slides.map((_, index) => {
        const animWidth = useSharedValue(index === 0 ? 24 : 8);
        const animOpacity = useSharedValue(index === 0 ? 1 : 0.4);

        // Update animations when activeIndex changes
        animWidth.value = withTiming(index === activeIndex ? 24 : 8, { duration: 300 });
        animOpacity.value = withTiming(index === activeIndex ? 1 : 0.4, { duration: 300 });

        const dotStyle = useAnimatedStyle(() => ({
          width: animWidth.value,
          opacity: animOpacity.value,
        }));

        return (
          <Animated.View
            key={index}
            style={dotStyle}
            className={`h-2 rounded-full ${
              index === activeIndex ? 'bg-primary' : 'bg-border'
            }`}
          />
        );
      })}
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
    <SafeAreaView className="flex-1 bg-background">
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
            <View className="w-32 h-32 rounded-full bg-primary/10 items-center justify-center mb-10">
              <Ionicons name={slide.icon} size={64} color="#0D7377" />
            </View>
            <Text className="text-2xl font-bold text-text-primary text-center mb-3">
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
          <View className="h-[52px]" />
        )}
      </View>
    </SafeAreaView>
  );
}
