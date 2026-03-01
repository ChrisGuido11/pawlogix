import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    if (fontError) {
      console.warn('Font loading error:', fontError);
    }
  }, [fontError]);

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
          </PetProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}
