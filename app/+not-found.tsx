import { View, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
      <Stack.Screen options={{ title: 'Not Found' }} />
      <Text className="text-xl font-semibold text-text-heading mb-2">
        Page not found
      </Text>
      <Text className="text-base text-text-body mb-6 text-center">
        The screen you're looking for doesn't exist.
      </Text>
      <Button title="Go Home" onPress={() => router.replace('/(tabs)')} />
    </SafeAreaView>
  );
}
