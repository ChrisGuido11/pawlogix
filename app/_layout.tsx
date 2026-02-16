import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { PetProvider } from '@/lib/pet-context';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const ONBOARDING_KEY = 'pawlogix_onboarding_complete';

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isLoading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

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
      router.replace('/onboarding');
    }
  }, [isLoading, onboardingChecked, needsOnboarding, segments]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="pet" />
        <Stack.Screen name="record" />
        <Stack.Screen name="auth" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PetProvider>
        <RootLayoutNav />
      </PetProvider>
    </AuthProvider>
  );
}
