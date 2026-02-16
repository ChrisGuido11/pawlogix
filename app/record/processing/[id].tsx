import { useEffect, useState, useRef } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function RecordProcessingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<
    'pending' | 'processing' | 'completed' | 'failed'
  >('pending');
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.1, { duration: 750 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    const pollStatus = async () => {
      if (!id) return;
      const { data } = await supabase
        .from('pl_health_records')
        .select('processing_status, processing_error')
        .eq('id', id)
        .single();

      if (data) {
        setStatus(data.processing_status);
        if (data.processing_status === 'completed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          router.replace(`/record/${id}` as any);
        } else if (data.processing_status === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setError(data.processing_error || 'Something went wrong.');
        }
      }
    };

    intervalRef.current = setInterval(pollStatus, 2000);
    pollStatus();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id]);

  const handleRetry = async () => {
    if (!id) return;
    setStatus('pending');
    setError(null);

    await supabase
      .from('pl_health_records')
      .update({ processing_status: 'pending' })
      .eq('id', id);

    const { data: record } = await supabase
      .from('pl_health_records')
      .select('*')
      .eq('id', id)
      .single();

    if (record) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pl-interpret-record`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            record_id: id,
            image_urls: record.image_urls,
            pet_species: 'dog',
            pet_breed: 'unknown',
            record_type: record.record_type,
          }),
        }
      ).catch(console.error);

      intervalRef.current = setInterval(async () => {
        const { data } = await supabase
          .from('pl_health_records')
          .select('processing_status, processing_error')
          .eq('id', id)
          .single();

        if (data?.processing_status === 'completed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          router.replace(`/record/${id}` as any);
        } else if (data?.processing_status === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setStatus('failed');
          setError(data.processing_error || 'Something went wrong.');
        }
      }, 2000);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
      {status === 'failed' ? (
        <>
          <Ionicons name="alert-circle-outline" size={64} color="#EF5350" />
          <Text className="text-xl font-semibold text-text-primary mt-4 text-center">
            Something went wrong
          </Text>
          <Text className="text-base text-text-secondary mt-2 text-center mb-6">
            {error || "We couldn't analyze your record. Please try again."}
          </Text>
          <Button
            title="Try Again"
            onPress={handleRetry}
            className="w-full mb-3"
          />
          <Button
            title="Cancel"
            onPress={() => router.replace('/(tabs)')}
            variant="secondary"
            className="w-full"
          />
        </>
      ) : (
        <>
          <Animated.View style={animatedStyle}>
            <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center">
              <Ionicons name="paw" size={48} color="#0D7377" />
            </View>
          </Animated.View>
          <Text className="text-xl font-semibold text-text-primary mt-6 text-center">
            Analyzing your pet's record...
          </Text>
          <Text className="text-base text-text-secondary mt-2 text-center">
            This usually takes 10-30 seconds
          </Text>
        </>
      )}
    </SafeAreaView>
  );
}
