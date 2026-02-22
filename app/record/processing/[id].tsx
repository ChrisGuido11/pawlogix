import { useEffect, useState, useRef } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows } from '@/constants/spacing';

const PROGRESS_STEPS = [
  'Reading your document...',
  'Interpreting results...',
  'Preparing your summary...',
];

function OrbitingCircle({ angle, radius, color, size, delay }: {
  angle: number;
  radius: number;
  color: string;
  size: number;
  delay: number;
}) {
  const rotation = useSharedValue(angle);

  useEffect(() => {
    setTimeout(() => {
      rotation.value = withRepeat(
        withTiming(angle + 360, { duration: 4000, easing: Easing.linear }),
        -1,
        false
      );
    }, delay);
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const rad = (rotation.value * Math.PI) / 180;
    return {
      transform: [
        { translateX: Math.cos(rad) * radius },
        { translateY: Math.sin(rad) * radius },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        animStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          position: 'absolute',
        },
      ]}
    />
  );
}

function ProgressSteps() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= PROGRESS_STEPS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ marginTop: 32, gap: 12, alignItems: 'center' }}>
      {PROGRESS_STEPS.map((step, index) => {
        const isActive = index === stepIndex;
        const isDone = index < stepIndex;
        const dotScale = useSharedValue(1);

        useEffect(() => {
          if (isDone) {
            dotScale.value = withSpring(1.2, { damping: 8, stiffness: 200 });
            setTimeout(() => {
              dotScale.value = withSpring(1, { damping: 12, stiffness: 150 });
            }, 200);
          }
        }, [isDone]);

        const dotAnimStyle = useAnimatedStyle(() => ({
          transform: [{ scale: dotScale.value }],
        }));

        return (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Animated.View style={dotAnimStyle}>
              {isDone ? (
                <LinearGradient
                  colors={[...Gradients.primaryCta]}
                  style={{ width: 8, height: 8, borderRadius: 4 }}
                />
              ) : (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isActive ? Colors.primary : Colors.border,
                  }}
                />
              )}
            </Animated.View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: isActive ? '600' : '400',
                color: isActive ? Colors.textHeading : Colors.textBody,
              }}
            >
              {isDone ? '\u2713 ' : ''}{step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function RecordProcessingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<
    'pending' | 'processing' | 'completed' | 'failed'
  >('pending');
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    glowScale.value = withRepeat(withTiming(1.08, { duration: 1200 }), -1, true);
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
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
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {status === 'failed' ? (
          <>
            <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
            <Text style={{ fontSize: 22, fontWeight: '700', color: Colors.textHeading, marginTop: 16, textAlign: 'center' }}>
              Something went wrong
            </Text>
            <Text style={{ fontSize: 16, color: Colors.textBody, marginTop: 8, textAlign: 'center', marginBottom: 24 }}>
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
            {/* Central icon with glow + orbiting accents */}
            <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
              <OrbitingCircle angle={0} radius={65} color={Colors.secondary} size={12} delay={0} />
              <OrbitingCircle angle={120} radius={65} color={Colors.primary} size={10} delay={200} />
              <OrbitingCircle angle={240} radius={65} color={Colors.primaryLight} size={8} delay={400} />

              <Animated.View style={[glowStyle, Shadows.primaryButton, { borderRadius: 48 }]}>
                <LinearGradient
                  colors={[...Gradients.primaryCta]}
                  style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="paw" size={44} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
            </View>

            <Text style={{ fontSize: 22, fontWeight: '700', color: Colors.textHeading, marginTop: 24, textAlign: 'center' }}>
              Analyzing your pet's record...
            </Text>
            <Text style={{ fontSize: 16, color: Colors.textBody, marginTop: 8, textAlign: 'center' }}>
              This usually takes 10-30 seconds
            </Text>
            <ProgressSteps />
          </>
        )}
      </SafeAreaView>
    </View>
  );
}
