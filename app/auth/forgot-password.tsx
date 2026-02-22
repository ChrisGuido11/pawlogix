import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Colors, Gradients } from '@/constants/Colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

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
    <CurvedHeaderPage
      headerProps={{ title: 'Reset Password', showBack: true }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Spacing['4xl'] }}>
          {/* Logo icon or success mascot */}
          <View style={{ alignItems: 'center', marginBottom: Spacing['2xl'] }}>
            {sent ? (
              <View style={{ width: 140, height: 140, borderRadius: 70, overflow: 'hidden' }}>
                <Image
                  source={require('@/assets/illustrations/mascot-celebrating.png')}
                  style={{ width: 140, height: 140 }}
                  contentFit="cover"
                />
              </View>
            ) : (
              <LinearGradient
                colors={[...Gradients.primaryCta]}
                style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="paw" size={28} color={Colors.textOnPrimary} />
              </LinearGradient>
            )}
          </View>

          <Text style={[Typography.body, { color: Colors.textBody, marginBottom: Spacing['3xl'] }]}>
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
    </CurvedHeaderPage>
  );
}
