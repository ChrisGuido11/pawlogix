import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Keyboard, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const navigation = useNavigation();

  // Unsaved changes guard
  useEffect(() => {
    const hasContent = formEmail.trim().length > 0 || formPassword.length > 0;
    if (!hasContent) return;
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      e.preventDefault();
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, formEmail, formPassword]);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: Colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        </Pressable>
        <Text
          style={[
            Typography.sectionHeading,
            { color: Colors.textHeading, marginLeft: Spacing.md },
          ]}
        >
          {authMode === 'signup' ? 'Create Account' : 'Log In'}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: Spacing['4xl'],
          }}
          keyboardShouldPersistTaps="handled"
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
                  paddingVertical: Spacing.md,
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
