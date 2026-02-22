import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { Colors, Gradients } from '@/constants/Colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

export default function SignupScreen() {
  const router = useRouter();
  const { linkAccount } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!password || password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = () => {
    if (!validate()) return;
    setIsSubmitting(true);

    // Safety: force spinner off after 15s no matter what
    const safetyTimeout = setTimeout(() => {
      setIsSubmitting(false);
      toast({ title: 'Timeout', message: 'Request took too long. Please try again.', preset: 'error' });
    }, 15000);

    linkAccount(email, password, displayName || undefined)
      .then(() => {
        clearTimeout(safetyTimeout);
        toast({ title: 'Account created!', message: 'Your data is now backed up.', preset: 'done' });
        router.back();
      })
      .catch((error: any) => {
        clearTimeout(safetyTimeout);
        toast({ title: 'Error', message: error.message || 'Failed to create account', preset: 'error' });
      })
      .finally(() => {
        clearTimeout(safetyTimeout);
        setIsSubmitting(false);
      });
  };

  return (
    <CurvedHeaderPage
      headerProps={{ title: 'Create Account', showBack: true }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Spacing['4xl'] }}>
          <View style={{ alignItems: 'center', marginBottom: Spacing['2xl'] }}>
            <LinearGradient
              colors={[...Gradients.primaryCta]}
              style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="paw" size={28} color={Colors.textOnPrimary} />
            </LinearGradient>
          </View>

          <Text style={[Typography.body, { color: Colors.textBody, marginBottom: Spacing['3xl'] }]}>
            Back up your data and access it on any device
          </Text>

          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            containerClassName="mb-4"
          />

          <Input
            label="Password"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            containerClassName="mb-4"
          />

          <Input
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
            secureTextEntry
            containerClassName="mb-4"
          />

          <Input
            label="Display Name (optional)"
            placeholder="Your name"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            containerClassName="mb-6"
          />

          <Button
            title="Create Account"
            onPress={handleCreateAccount}
            loading={isSubmitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </CurvedHeaderPage>
  );
}
