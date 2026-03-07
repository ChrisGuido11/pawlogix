import '../global.css';
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { PetProvider } from '@/lib/pet-context';
import { ErrorBoundary as AppErrorBoundary } from '@/components/ui/error-boundary';
import { setupNotificationChannel } from '@/lib/notifications';
import { useNotificationSync } from '@/hooks/useNotificationSync';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const mascotScale = useSharedValue(0.3);
  const mascotOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(12);
  const subtitleOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Mascot springs in
    mascotOpacity.value = withTiming(1, { duration: 200 });
    mascotScale.value = withSpring(1, { damping: 14, stiffness: 120 });

    // 2. Title fades in after mascot settles
    titleOpacity.value = withDelay(350, withTiming(1, { duration: 400 }));
    titleTranslateY.value = withDelay(350, withSpring(0, { damping: 16, stiffness: 140 }));

    // 3. Subtitle fades in
    subtitleOpacity.value = withDelay(550, withTiming(1, { duration: 400 }));

    // 4. Hold for ~2.5s total, then fade out entire overlay (~3s total duration)
    overlayOpacity.value = withDelay(2600, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }, () => {
      runOnJS(onFinish)();
    }));
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }],
    opacity: mascotOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <Animated.View style={[splashStyles.overlay, overlayStyle]} pointerEvents="none">
      <View style={splashStyles.content}>
        <Animated.View style={[splashStyles.mascotContainer, mascotStyle]}>
          <Image
            source={require('@/assets/illustrations/mascot-welcome.png')}
            style={splashStyles.mascot}
            contentFit="cover"
          />
        </Animated.View>
        <Animated.View style={titleStyle}>
          <Text style={splashStyles.title}>PawLogix</Text>
        </Animated.View>
        <Animated.View style={subtitleStyle}>
          <Text style={splashStyles.subtitle}>Your pet's health, simplified</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primaryLight,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    marginTop: -40,
  },
  mascotContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  mascot: {
    width: 200,
    height: 200,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 36,
    color: Colors.textHeading,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 16,
    color: Colors.textMuted,
  },
});

const ONBOARDING_KEY = 'pawlogix_onboarding_complete';

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isLoading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Notification channel setup (Android)
  useEffect(() => {
    setupNotificationChannel();
  }, []);

  // Auto-schedule vaccine & med reminders
  useNotificationSync();

  // Handle notification taps — navigate to pet detail
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.petId) {
          router.push(`/pet/${data.petId}` as any);
        }
      }
    );
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    const checkOnboarding = async () => {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      setNeedsOnboarding(!completed);
      setOnboardingChecked(true);
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (isLoading || !onboardingChecked) return;

    // Hide native splash — our animated overlay takes over
    SplashScreen.hideAsync();

    if (needsOnboarding && segments[0] !== 'onboarding') {
      // Re-check AsyncStorage in case onboarding was just completed
      AsyncStorage.getItem(ONBOARDING_KEY).then((completed) => {
        if (completed) {
          setNeedsOnboarding(false);
        } else {
          router.replace('/onboarding');
        }
      });
    }
  }, [isLoading, onboardingChecked, needsOnboarding, segments]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          animationDuration: 250,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="auth" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="pet" />
        <Stack.Screen name="record" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    if (fontError) {
      console.warn('Font loading error:', fontError);
    }
  }, [fontError]);

  const handleSplashFinish = useCallback(() => {
    setShowAnimatedSplash(false);
  }, []);

  // Keep splash screen up until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppErrorBoundary>
        <AuthProvider>
          <PetProvider>
            <RootLayoutNav />
            {showAnimatedSplash && <AnimatedSplash onFinish={handleSplashFinish} />}
          </PetProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}
