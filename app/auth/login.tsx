import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { Colors, Gradients } from '@/constants/Colors';
import { Typography, Fonts } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, trigger, getValues, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onPressLogin = () => {
    trigger().then((isValid) => {
      if (!isValid) return;
      const data = getValues();
      setIsSubmitting(true);
      signIn(data.email, data.password)
        .then(() => {
          toast({ title: 'Welcome back!', preset: 'done' });
          router.replace('/(tabs)');
        })
        .catch((error: any) => {
          toast({ title: 'Login failed', message: error.message || 'Invalid credentials', preset: 'error' });
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    });
  };

  return (
    <CurvedHeaderPage
      headerProps={{ title: 'Welcome Back', showBack: true }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Spacing['4xl'] }}>
          {/* Logo icon */}
          <View style={{ alignItems: 'center', marginBottom: Spacing['2xl'] }}>
            <LinearGradient
              colors={[...Gradients.primaryCta]}
              style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="paw" size={28} color={Colors.textOnPrimary} />
            </LinearGradient>
          </View>

          <Text style={[Typography.body, { color: Colors.textBody, marginBottom: Spacing['3xl'] }]}>
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

          <Pressable onPress={() => router.push('/auth/forgot-password')} style={{ marginBottom: Spacing['2xl'] }}>
            <Text style={[Typography.secondary, { color: Colors.primary, fontFamily: Fonts.semiBold }]}>Forgot Password?</Text>
          </Pressable>

          <Button
            title="Log In"
            onPress={onPressLogin}
            loading={isSubmitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </CurvedHeaderPage>
  );
}
