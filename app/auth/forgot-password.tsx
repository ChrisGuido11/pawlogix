import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} className="mb-4">
            <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
          </Pressable>

          <Text className="text-3xl font-bold text-text-primary mb-2">
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
  );
}
