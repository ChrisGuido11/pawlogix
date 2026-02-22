import { View, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/button';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={{ width: 160, height: 160, borderRadius: 80, overflow: 'hidden', marginBottom: 16 }}>
        <Image
          source={require('@/assets/illustrations/mascot-tangled.png')}
          style={{ width: 160, height: 160 }}
          contentFit="cover"
        />
      </View>
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
