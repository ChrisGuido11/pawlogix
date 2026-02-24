import { useState } from 'react';
import { View, Text, ScrollView, Switch, Alert, Pressable, Modal, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { writeAsStringAsync, documentDirectory } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows, Spacing, BorderRadius } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';
import { SectionLabel } from '@/components/ui/section-label';

function SettingsRow({
  icon,
  label,
  onPress,
  trailing,
  destructive = false,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}) {
  const handlePress = onPress
    ? () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }
    : undefined;

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center gap-3 py-3.5"
      style={({ pressed }) => ({ opacity: pressed && onPress ? 0.7 : 1 })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: destructive ? Colors.errorLight : Colors.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={icon as any}
          size={18}
          color={destructive ? Colors.error : Colors.textBody}
        />
      </View>
      <Text
        style={[
          Typography.body,
          {
            flex: 1,
            color: destructive ? Colors.error : Colors.textHeading,
          },
        ]}
      >
        {label}
      </Text>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /> : null)}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAnonymous, profile, signOut, refreshProfile, linkAccount, signIn } = useAuth();
  const [medReminders, setMedReminders] = useState(profile?.notification_med_reminders ?? true);
  const [vaxReminders, setVaxReminders] = useState(profile?.notification_vax_reminders ?? true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Auth form state
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
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
      resetForm();
    } catch (error: any) {
      clearTimeout(timeout);
      setSubmitError(error.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowAuthForm(false);
    setAuthMode('signup');
    setFormEmail('');
    setFormPassword('');
    setFormDisplayName('');
    setFormErrors({});
    setSubmitError(null);
  };

  const toggleMedReminders = async (value: boolean) => {
    setMedReminders(value);
    Haptics.selectionAsync();
    if (user?.id) {
      await supabase
        .from('pl_profiles')
        .update({ notification_med_reminders: value })
        .eq('id', user.id);
    }
  };

  const toggleVaxReminders = async (value: boolean) => {
    setVaxReminders(value);
    Haptics.selectionAsync();
    if (user?.id) {
      await supabase
        .from('pl_profiles')
        .update({ notification_vax_reminders: value })
        .eq('id', user.id);
    }
  };

  const exportData = async () => {
    if (!user?.id) return;
    setIsExporting(true);
    try {
      const { data: pets } = await supabase
        .from('pl_pets')
        .select('*')
        .eq('user_id', user.id);

      const { data: records } = await supabase
        .from('pl_health_records')
        .select('*')
        .eq('user_id', user.id);

      const { data: chats } = await supabase
        .from('pl_record_chats')
        .select('*')
        .eq('user_id', user.id);

      const exportPayload = {
        exported_at: new Date().toISOString(),
        profile: profile,
        pets: pets ?? [],
        health_records: records ?? [],
        chats: chats ?? [],
      };

      const fileName = `pawlogix-export-${Date.now()}.json`;
      const filePath = `${documentDirectory}${fileName}`;
      await writeAsStringAsync(filePath, JSON.stringify(exportPayload, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export PawLogix Data',
        });
      }

      toast({ title: 'Data exported!', preset: 'done' });
    } catch (error: any) {
      toast({ title: 'Export failed', message: error.message, preset: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const deleteAccount = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (!user?.id) return;

      await supabase.from('pl_record_chats').delete().eq('user_id', user.id);
      await supabase.from('pl_health_records').delete().eq('user_id', user.id);

      const { data: petPhotos } = await supabase.storage
        .from('pl-pet-photos')
        .list(user.id);
      if (petPhotos?.length) {
        await supabase.storage
          .from('pl-pet-photos')
          .remove(petPhotos.map((f) => `${user.id}/${f.name}`));
      }

      const { data: recordImages } = await supabase.storage
        .from('pl-record-images')
        .list(user.id);
      if (recordImages?.length) {
        await supabase.storage
          .from('pl-record-images')
          .remove(recordImages.map((f) => `${user.id}/${f.name}`));
      }

      await supabase.from('pl_pets').delete().eq('user_id', user.id);
      await supabase.from('pl_usage_tracking').delete().eq('user_id', user.id);
      await supabase.from('pl_profiles').delete().eq('id', user.id);

      await AsyncStorage.removeItem('pawlogix_onboarding_complete');
      await signOut();

      setShowDeleteConfirm(false);
      toast({ title: 'Account deleted', preset: 'done' });
      router.replace('/onboarding');
    } catch (error: any) {
      toast({ title: 'Error', message: error.message, preset: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        onPress: async () => {
          await signOut();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  const showToastPlaceholder = (item: string) => {
    toast({
      title: item,
      message: 'Link not configured — will be updated before launch',
      preset: 'none',
    });
  };

  return (
    <CurvedHeaderPage
      headerProps={{ title: 'Settings' }}
      contentStyle={{ paddingHorizontal: 0 }}
    >
      <ScrollView
        style={{ flex: 1, paddingHorizontal: Spacing.lg }}
        contentContainerStyle={{ paddingBottom: Spacing['4xl'] }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Account Section */}
        <SectionLabel style={{ marginBottom: Spacing.sm, marginTop: Spacing.sm }}>Account</SectionLabel>

        {!isAnonymous ? (
          <Card className="mb-5" variant="elevated">
            <View className="flex-row items-center gap-3">
              <LinearGradient
                colors={[...Gradients.primaryCta]}
                style={{ width: 48, height: 48, borderRadius: BorderRadius.bottomSheet, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="person" size={24} color={Colors.textOnPrimary} />
              </LinearGradient>
              <View className="flex-1">
                <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>
                  {profile?.display_name ?? 'PawLogix User'}
                </Text>
                <Text style={[Typography.secondary, { color: Colors.textBody }]}>
                  {profile?.email}
                </Text>
              </View>
            </View>
          </Card>
        ) : !showAuthForm ? (
          /* Anonymous — collapsed CTA */
          <Card className="mb-5" variant="elevated">
            <View className="flex-row items-center gap-3 mb-4">
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: Colors.primaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="cloud-upload-outline" size={22} color={Colors.primary} />
              </View>
              <View className="flex-1">
                <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>
                  Back up your data
                </Text>
                <Text style={[Typography.secondary, { color: Colors.textBody }]}>
                  Create an account to keep your pets and records safe
                </Text>
              </View>
            </View>
            <Button
              title="Create Account"
              onPress={() => {
                setAuthMode('signup');
                setShowAuthForm(true);
              }}
              variant="primary"
              size="md"
            />
            <Pressable
              onPress={() => {
                setAuthMode('login');
                setShowAuthForm(true);
              }}
              style={{ alignSelf: 'center', marginTop: Spacing.md, paddingVertical: Spacing.xs }}
            >
              <Text style={[Typography.secondary, { color: Colors.textBody }]}>
                Already have an account?{' '}
                <Text style={{ fontFamily: Fonts.semiBold, color: Colors.primary }}>Log In</Text>
              </Text>
            </Pressable>
          </Card>
        ) : (
          /* Anonymous — expanded inline form */
          <Card className="mb-5" variant="elevated">
            {/* Segmented control */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: Colors.background,
                borderRadius: BorderRadius.pill,
                padding: 3,
                marginBottom: Spacing.lg,
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

            <Pressable
              onPress={resetForm}
              style={{ alignSelf: 'center', marginTop: Spacing.md, paddingVertical: Spacing.xs }}
            >
              <Text style={[Typography.secondary, { color: Colors.textBody }]}>Cancel</Text>
            </Pressable>
          </Card>
        )}

        {/* Notifications */}
        <SectionLabel style={{ marginBottom: Spacing.sm, marginTop: Spacing.sm }}>Notifications</SectionLabel>
        <Card className="mb-5">
          <SettingsRow
            icon="medical-outline"
            label="Medication Reminders"
            trailing={
              <Switch
                value={medReminders}
                onValueChange={toggleMedReminders}
                trackColor={{ false: '#D1D5DB', true: Colors.secondary }}
                thumbColor={Colors.textOnPrimary}
              />
            }
          />
          <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: 48 }} />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Vaccine Reminders"
            trailing={
              <Switch
                value={vaxReminders}
                onValueChange={toggleVaxReminders}
                trackColor={{ false: '#D1D5DB', true: Colors.secondary }}
                thumbColor={Colors.textOnPrimary}
              />
            }
          />
        </Card>

        {/* Legal */}
        <SectionLabel style={{ marginBottom: Spacing.sm }}>Legal</SectionLabel>
        <Card className="mb-5">
          <SettingsRow
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => showToastPlaceholder('Privacy Policy')}
          />
          <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: 48 }} />
          <SettingsRow
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => showToastPlaceholder('Terms of Service')}
          />
          <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: 48 }} />
          <SettingsRow
            icon="help-circle-outline"
            label="Support & FAQ"
            onPress={() => showToastPlaceholder('Support & FAQ')}
          />
        </Card>

        {/* Data */}
        <SectionLabel style={{ marginBottom: Spacing.sm }}>Data</SectionLabel>
        <Card className="mb-5">
          <SettingsRow
            icon="download-outline"
            label="Export My Data"
            onPress={exportData}
          />
          <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: 48 }} />
          <SettingsRow
            icon="trash-outline"
            label="Delete Account"
            onPress={deleteAccount}
            destructive
          />
        </Card>

        {/* Sign Out */}
        {!isAnonymous && (
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="secondary"
            className="mb-4"
          />
        )}

        <Text style={[Typography.caption, { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.lg, marginBottom: Spacing['3xl'] }]}>
          PawLogix v1.0.0 (Beta)
        </Text>
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteConfirm(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['2xl'] }}>
          <View style={[Shadows.lg, { backgroundColor: Colors.surface, borderRadius: BorderRadius.bottomSheet, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center' }]}>
            <View style={{ width: 140, height: 140, borderRadius: 70, overflow: 'hidden', marginBottom: Spacing.lg }}>
              <Image
                source={require('@/assets/illustrations/mascot-waving-goodbye.png')}
                style={{ width: 140, height: 140 }}
                contentFit="cover"
              />
            </View>
            <Text style={[Typography.sectionHeading, { color: Colors.textHeading, textAlign: 'center', marginBottom: Spacing.sm }]}>
              We'll miss you!
            </Text>
            <Text style={[Typography.body, { color: Colors.textBody, textAlign: 'center', marginBottom: Spacing['2xl'] }]}>
              This will permanently delete your account and all pet data. This action cannot be undone.
            </Text>
            <Button
              title="Delete Everything"
              onPress={confirmDelete}
              variant="destructive"
              loading={isDeleting}
            />
            <Pressable
              onPress={() => !isDeleting && setShowDeleteConfirm(false)}
              style={{ marginTop: Spacing.lg, paddingVertical: Spacing.sm }}
            >
              <Text style={[Typography.buttonSecondary, { color: Colors.textBody }]}>
                Never mind, I'll stay
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </CurvedHeaderPage>
  );
}
