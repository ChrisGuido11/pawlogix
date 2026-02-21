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
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows } from '@/constants/spacing';

const resetSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ResetForm = z.infer<typeof resetSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ResetForm) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email);
      if (error) throw error;
      setSent(true);
      toast({ title: 'Reset link sent!', message: 'Check your email inbox.', preset: 'done' });
    } catch (error: any) {
      toast({ title: 'Error', message: error.message || 'Failed to send reset link', preset: 'error' });
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
                Reset Password
              </Text>
              <Text className="text-base text-text-secondary mb-8">
                {sent
                  ? "We've sent a password reset link to your email."
                  : "Enter your email and we'll send you a reset link."}
              </Text>

              {!sent && (
                <>
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
                        containerClassName="mb-6"
                      />
                    )}
                  />

                  <Button
                    title="Send Reset Link"
                    onPress={handleSubmit(onSubmit)}
                    loading={isSubmitting}
                  />
                </>
              )}

              {sent && (
                <Button
                  title="Back to Login"
                  onPress={() => router.replace('/auth/login')}
                />
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </GradientBackground>
    </View>
  );
}
