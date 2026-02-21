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

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  displayName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const router = useRouter();
  const { linkAccount } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', displayName: '' },
  });

  const onSubmit = async (data: SignupForm) => {
    setIsSubmitting(true);
    try {
      await linkAccount(data.email, data.password, data.displayName || undefined);
      toast({ title: 'Account created!', message: 'Your data is now backed up.', preset: 'done' });
      router.back();
    } catch (error: any) {
      toast({ title: 'Error', message: error.message || 'Failed to create account', preset: 'error' });
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
                Create Account
              </Text>
              <Text className="text-base text-text-secondary mb-8">
                Back up your data and access it on any device
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
                    placeholder="At least 8 characters"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    secureTextEntry
                    containerClassName="mb-4"
                  />
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Confirm Password"
                    placeholder="Re-enter your password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirmPassword?.message}
                    secureTextEntry
                    containerClassName="mb-4"
                  />
                )}
              />

              <Controller
                control={control}
                name="displayName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Display Name (optional)"
                    placeholder="Your name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    containerClassName="mb-6"
                  />
                )}
              />

              <Button
                title="Create Account"
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
