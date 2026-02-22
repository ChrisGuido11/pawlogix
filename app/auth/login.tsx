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
    <CurvedHeaderPage
      headerProps={{ title: 'Welcome Back', showBack: true }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Logo icon */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <LinearGradient
              colors={[...Gradients.primaryCta]}
              style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="paw" size={28} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={{ fontSize: 16, color: Colors.textBody, marginBottom: 32 }}>
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

          <Pressable onPress={() => router.push('/auth/forgot-password')} style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, color: Colors.primary, fontWeight: '600' }}>Forgot Password?</Text>
          </Pressable>

          <Button
            title="Log In"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </CurvedHeaderPage>
  );
}
