import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GradientBackground } from '@/components/ui/gradient-background';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows } from '@/constants/spacing';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      await signIn(data.email, data.password);
      toast({ title: 'Welcome back!', preset: 'done' });
      router.replace('/(tabs)');
    } catch (error: any) {
      toast({ title: 'Login failed', message: error.message || 'Invalid credentials', preset: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1">
      <GradientBackground variant="warm">
        <SafeAreaView className="flex-1">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled">
              <Pressable
                onPress={() => router.back()}
                style={[Shadows.sm, { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }]}
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
              </Pressable>

              {/* Logo icon */}
              <View className="items-center mb-6">
                <LinearGradient
                  colors={[...Gradients.primaryCta]}
                  style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="paw" size={28} color="#FFFFFF" />
                </LinearGradient>
              </View>

              <Text style={{ fontSize: 28, fontWeight: '700', color: Colors.textPrimary }} className="mb-2">
                Welcome Back
              </Text>
              <Text className="text-base text-text-secondary mb-8">
                Log in to access your pet health data
              </Text>

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email"
                    placeholder="you@example.com"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    containerClassName="mb-4"
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Password"
                    placeholder="Your password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    secureTextEntry
                    containerClassName="mb-2"
                  />
                )}
              />

              <Pressable onPress={() => router.push('/auth/forgot-password')} className="mb-6">
                <Text className="text-sm text-primary font-semibold">Forgot Password?</Text>
              </Pressable>

              <Button
                title="Log In"
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </GradientBackground>
    </View>
  );
}
