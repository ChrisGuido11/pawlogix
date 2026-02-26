import { useState } from 'react';
import { View, Text, ScrollView, Switch, Alert, Pressable, Modal } from 'react-native';
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
          width: 40,
          height: 40,
          borderRadius: BorderRadius.button,
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
  const { user, isAnonymous, profile, signOut, refreshProfile } = useAuth();
  const [medReminders, setMedReminders] = useState(profile?.notification_med_reminders ?? true);
  const [vaxReminders, setVaxReminders] = useState(profile?.notification_vax_reminders ?? true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      >
        {/* Account Section */}
        <SectionLabel style={{ marginTop: Spacing.sm }}>Account</SectionLabel>

        {!isAnonymous ? (
          <Card className="mb-5" variant="elevated">
            <View className="flex-row items-center gap-3">
              <LinearGradient
                colors={[...Gradients.primaryCta]}
                style={{ width: 48, height: 48, borderRadius: BorderRadius.statTile, alignItems: 'center', justifyContent: 'center' }}
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
        ) : (
          /* Anonymous — CTA to navigate to account screen */
          <Card className="mb-5" variant="elevated">
            <View className="flex-row items-center gap-3 mb-4">
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: BorderRadius.statTile,
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
              onPress={() => router.push('/auth/account')}
              variant="primary"
              size="md"
            />
            <Pressable
              onPress={() => router.push('/auth/account?mode=login')}
              style={{ alignSelf: 'center', marginTop: Spacing.md, paddingVertical: Spacing.xs }}
            >
              <Text style={[Typography.secondary, { color: Colors.textBody }]}>
                Already have an account?{' '}
                <Text style={{ fontFamily: Fonts.semiBold, color: Colors.primary }}>Log In</Text>
              </Text>
            </Pressable>
          </Card>
        )}

        {/* Notifications */}
        <SectionLabel>Notifications</SectionLabel>
        <Card className="mb-5">
          <SettingsRow
            icon="medical-outline"
            label="Medication Reminders"
            trailing={
              <Switch
                value={medReminders}
                onValueChange={toggleMedReminders}
                trackColor={{ false: Colors.disabled, true: Colors.secondary }}
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
                trackColor={{ false: Colors.disabled, true: Colors.secondary }}
                thumbColor={Colors.textOnPrimary}
              />
            }
          />
        </Card>

        {/* Legal */}
        <SectionLabel>Legal</SectionLabel>
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
        <SectionLabel>Data</SectionLabel>
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
