import { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
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
import { Image } from 'expo-image';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Colors, Gradients } from '@/constants/Colors';
import { Typography, Fonts } from '@/constants/typography';
import { Shadows, Spacing, BorderRadius } from '@/constants/spacing';

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
    const timer = setTimeout(() => {
      rotation.value = withRepeat(
        withTiming(angle + 360, { duration: 4000, easing: Easing.linear }),
        -1,
        false
      );
    }, delay);
    return () => clearTimeout(timer);
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

function ProgressStepRow({ step, isActive, isDone }: { step: string; isActive: boolean; isDone: boolean }) {
  const dotScale = useSharedValue(1);

  useEffect(() => {
    if (isDone) {
      dotScale.value = withSpring(1.2, { damping: 8, stiffness: 200 });
      const timer = setTimeout(() => {
        dotScale.value = withSpring(1, { damping: 12, stiffness: 150 });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isDone]);

  const dotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
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
        style={[Typography.secondary, {
          fontFamily: isActive ? Fonts.semiBold : Fonts.regular,
          color: isActive ? Colors.textHeading : Colors.textBody,
        }]}
      >
        {isDone ? '\u2713 ' : ''}{step}
      </Text>
    </View>
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
    <View style={{ marginTop: Spacing['3xl'], gap: Spacing.md, alignItems: 'center' }}>
      {PROGRESS_STEPS.map((step, index) => (
        <ProgressStepRow
          key={index}
          step={step}
          isActive={index === stepIndex}
          isDone={index < stepIndex}
        />
      ))}
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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    glowScale.value = withRepeat(withTiming(1.08, { duration: 1200 }), -1, true);
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  const cleanup = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  const fail = (message: string) => {
    cleanup();
    setStatus('failed');
    setError(message);
  };

  const startPollingWithTimeout = () => {
    cleanup();
    let pollErrorCount = 0;

    intervalRef.current = setInterval(async () => {
      if (!id) return;
      const { data, error: queryError } = await supabase
        .from('pl_health_records')
        .select('processing_status, processing_error')
        .eq('id', id)
        .single();

      if (queryError || !data) {
        pollErrorCount++;
        if (pollErrorCount >= 5) {
          fail('Lost connection. Please check your internet and try again.');
        }
        return;
      }
      pollErrorCount = 0;

      setStatus(data.processing_status);
      if (data.processing_status === 'completed') {
        cleanup();
        router.replace(`/record/${id}` as any);
      } else if (data.processing_status === 'failed') {
        cleanup();
        setError(data.processing_error || 'Something went wrong.');
      }
    }, 2000);

    timeoutRef.current = setTimeout(() => {
      fail('Processing is taking longer than expected. Please try again.');
    }, 90_000);
  };

  const invokeEdgeFunction = async () => {
    if (!id) return;
    try {
      const { data: record } = await supabase
        .from('pl_health_records')
        .select('*')
        .eq('id', id)
        .single();

      if (!record) { fail('Record not found.'); return; }

      let petSpecies = 'dog';
      let petBreed = 'unknown';
      if (record.pet_id) {
        const { data: pet } = await supabase
          .from('pl_pets')
          .select('species, breed')
          .eq('id', record.pet_id)
          .single();
        if (pet) {
          petSpecies = pet.species || 'dog';
          petBreed = pet.breed || 'unknown';
        }
      }

      // supabase-js v2 bug: the functions client never receives the user's JWT.
      // _handleTokenChanged() only updates realtime, not functions headers.
      // Fix: get a fresh token via refreshSession() and pass it explicitly.
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session?.access_token) {
        fail('Session expired. Please restart the app.');
        return;
      }

      const { error: invokeError } = await supabase.functions.invoke('pl-interpret-record', {
        headers: {
          Authorization: `Bearer ${refreshData.session.access_token}`,
        },
        body: {
          record_id: id,
          image_urls: record.image_urls,
          pet_species: petSpecies,
          pet_breed: petBreed,
          record_type: record.record_type,
        },
      });

      if (invokeError) {
        // Extract the actual HTTP status and response body from the error.
        // FunctionsHttpError wraps everything in a generic message — the real
        // details are in error.context (the original Response object).
        let errorMsg = invokeError.message;
        const ctx = (invokeError as any).context;
        if (ctx?.status) {
          errorMsg = `HTTP ${ctx.status}`;
          try {
            const body = await ctx.json();
            if (body?.error) errorMsg = body.error;
            else if (body?.message) errorMsg = body.message;
            else errorMsg = `HTTP ${ctx.status}: ${JSON.stringify(body).slice(0, 200)}`;
          } catch {
            try {
              const text = await ctx.text();
              if (text) errorMsg = `HTTP ${ctx.status}: ${text.slice(0, 200)}`;
            } catch {}
          }
        }
        console.warn('[processing] Edge function error:', errorMsg);

        // Check if edge function already updated DB with a specific error
        const { data: current } = await supabase
          .from('pl_health_records')
          .select('processing_status')
          .eq('id', id)
          .single();
        if (current?.processing_status !== 'failed') {
          await supabase
            .from('pl_health_records')
            .update({ processing_status: 'failed', processing_error: errorMsg })
            .eq('id', id);
        }
      }
    } catch {
      fail('Could not start analysis. Please try again.');
    }
  };

  useEffect(() => {
    if (!id) return;

    const init = async () => {
      // Check current status — may already be processing from a previous attempt
      const { data } = await supabase
        .from('pl_health_records')
        .select('processing_status, processing_error')
        .eq('id', id)
        .single();

      if (data?.processing_status === 'completed') {
        router.replace(`/record/${id}` as any);
        return;
      }
      if (data?.processing_status === 'failed') {
        setStatus('failed');
        setError(data.processing_error || 'Something went wrong.');
        return;
      }

      startPollingWithTimeout();

      // Invoke edge function if record is still pending (not yet kicked off)
      if (!data || data.processing_status === 'pending') {
        invokeEdgeFunction();
      }
    };

    init();
    return cleanup;
  }, [id]);

  const handleRetry = async () => {
    if (!id) return;
    setStatus('pending');
    setError(null);

    await supabase
      .from('pl_health_records')
      .update({ processing_status: 'pending' })
      .eq('id', id);

    startPollingWithTimeout();
    invokeEdgeFunction();
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['3xl'] }}>
        {status === 'failed' ? (
          <>
            <View style={{ width: 160, height: 160, borderRadius: 80, overflow: 'hidden' }}>
              <Image
                source={require('@/assets/illustrations/mascot-tangled.png')}
                style={{ width: 160, height: 160 }}
                contentFit="cover"
              />
            </View>
            <Text style={[Typography.sectionHeading, { color: Colors.textHeading, marginTop: Spacing.lg, textAlign: 'center' }]}>
              Something went wrong
            </Text>
            <Text style={[Typography.body, { color: Colors.textBody, marginTop: Spacing.sm, textAlign: 'center', marginBottom: Spacing['2xl'] }]}>
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
            {/* Mascot illustration with glow + orbiting accents */}
            <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
              <OrbitingCircle angle={0} radius={85} color={Colors.secondary} size={12} delay={0} />
              <OrbitingCircle angle={120} radius={85} color={Colors.primary} size={10} delay={200} />
              <OrbitingCircle angle={240} radius={85} color={Colors.secondary} size={8} delay={400} />

              <Animated.View style={[glowStyle, { width: 180, height: 180, borderRadius: 90, overflow: 'hidden' }]}>
                <Image
                  source={require('@/assets/illustrations/mascot-searching.png')}
                  style={{ width: 180, height: 180 }}
                  contentFit="cover"
                />
              </Animated.View>
            </View>

            <Text style={[Typography.sectionHeading, { color: Colors.textHeading, marginTop: Spacing['2xl'], textAlign: 'center' }]}>
              Analyzing your pet's record...
            </Text>
            <Text style={[Typography.body, { color: Colors.textBody, marginTop: Spacing.sm, textAlign: 'center' }]}>
              This usually takes 10-30 seconds
            </Text>
            <ProgressSteps />
            <Pressable
              onPress={() => router.replace('/(tabs)')}
              style={{ marginTop: Spacing['3xl'] }}
            >
              <Text style={[Typography.secondary, { color: Colors.textMuted }]}>Cancel</Text>
            </Pressable>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}
