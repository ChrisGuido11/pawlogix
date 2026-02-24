import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { Colors } from '@/constants/Colors';
import { Shadows, Spacing, BorderRadius } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';

export default function AccountScreen() {
  const router = useRouter();
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const { linkAccount, signIn } = useAuth();

  const [authMode, setAuthMode] = useState<'signup' | 'login'>(
    initialMode === 'login' ? 'login' : 'signup'
  );
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formEmail.trim() || !emailRegex.test(formEmail.trim())) {
      errors.email = 'Please enter a valid email';
    }
    if (!formPassword || formPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAuthSubmit = async () => {
    if (!validate()) return;
    Keyboard.dismiss();
    setIsSubmitting(true);
    setSubmitError(null);

    const timeout = setTimeout(() => {
      setIsSubmitting(false);
      setSubmitError('Request timed out. Please try again.');
    }, 15000);

    try {
      if (authMode === 'signup') {
        await linkAccount(formEmail.trim(), formPassword, formDisplayName.trim() || undefined);
        toast({ title: 'Account created!', preset: 'done' });
      } else {
        await signIn(formEmail.trim(), formPassword);
        toast({ title: 'Welcome back!', preset: 'done' });
      }
      clearTimeout(timeout);
      router.back();
    } catch (error: any) {
      clearTimeout(timeout);
      setSubmitError(error.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CurvedHeaderPage
      headerProps={{
        title: authMode === 'signup' ? 'Create Account' : 'Log In',
        showBack: true,
      }}
    >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: Spacing['4xl'] }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {/* Segmented control */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: Colors.background,
              borderRadius: BorderRadius.pill,
              padding: 3,
              marginBottom: Spacing['2xl'],
            }}
          >
            {(['signup', 'login'] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => {
                  setAuthMode(mode);
                  setFormErrors({});
                  setSubmitError(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: Spacing.sm,
                  borderRadius: BorderRadius.pill,
                  backgroundColor: authMode === mode ? Colors.surface : 'transparent',
                  alignItems: 'center',
                  ...(authMode === mode ? Shadows.sm : {}),
                }}
              >
                <Text
                  style={[
                    Typography.secondary,
                    {
                      fontFamily: authMode === mode ? Fonts.semiBold : Fonts.regular,
                      color: authMode === mode ? Colors.textHeading : Colors.textBody,
                    },
                  ]}
                >
                  {mode === 'signup' ? 'Create Account' : 'Log In'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Display Name (signup only) */}
          {authMode === 'signup' && (
            <Input
              label="Display Name"
              placeholder="Your name (optional)"
              value={formDisplayName}
              onChangeText={setFormDisplayName}
              autoCapitalize="words"
              containerClassName="mb-3"
            />
          )}

          <Input
            label="Email"
            placeholder="you@example.com"
            value={formEmail}
            onChangeText={(text) => {
              setFormEmail(text);
              if (formErrors.email) setFormErrors((e) => ({ ...e, email: undefined }));
            }}
            error={formErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            containerClassName="mb-3"
          />

          <Input
            label="Password"
            placeholder="Min 6 characters"
            value={formPassword}
            onChangeText={(text) => {
              setFormPassword(text);
              if (formErrors.password) setFormErrors((e) => ({ ...e, password: undefined }));
            }}
            error={formErrors.password}
            secureTextEntry
            autoCapitalize="none"
            containerClassName="mb-3"
          />

          {/* Submission error banner */}
          {submitError && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.sm,
                backgroundColor: Colors.errorLight,
                borderRadius: BorderRadius.card,
                padding: Spacing.md,
                marginBottom: Spacing.md,
              }}
            >
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={[Typography.secondary, { color: Colors.error, flex: 1 }]}>
                {submitError}
              </Text>
            </View>
          )}

          <Button
            title={authMode === 'signup' ? 'Create Account' : 'Log In'}
            onPress={handleAuthSubmit}
            variant="primary"
            loading={isSubmitting}
          />
        </ScrollView>
    </CurvedHeaderPage>
  );
}
