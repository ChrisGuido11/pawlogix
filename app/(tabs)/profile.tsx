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
import { Shadows } from '@/constants/spacing';

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
        style={{
          fontSize: 16,
          flex: 1,
          color: destructive ? Colors.error : Colors.textHeading,
        }}
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
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Account Section */}
        {isAnonymous ? (
          <View style={[Shadows.lg, { borderRadius: 16, marginBottom: 20, overflow: 'hidden' }]}>
            <LinearGradient
              colors={[...Gradients.primaryHeader]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, padding: 20 }}
            >
              <View className="items-center py-2">
                <Ionicons name="person-circle-outline" size={48} color="#FFFFFF" />
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 8 }}>
                  Create an Account
                </Text>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
                  Back up your data and access it on any device
                </Text>
                <Pressable
                  onPress={() => router.push('/auth/signup')}
                  style={[Shadows.sm, { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: '100%' }]}
                >
                  <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
                    Sign Up
                  </Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => router.push('/auth/login')}
                className="py-3 mt-1"
                hitSlop={8}
              >
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', fontWeight: '500' }}>
                  Already have an account? Log In
                </Text>
              </Pressable>
            </LinearGradient>
          </View>
        ) : (
          <Card className="mb-5" variant="elevated">
            <View className="flex-row items-center gap-3">
              <LinearGradient
                colors={[...Gradients.primaryCta]}
                style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="person" size={24} color="#FFFFFF" />
              </LinearGradient>
              <View className="flex-1">
                <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.textHeading }}>
                  {profile?.display_name ?? 'PawLogix User'}
                </Text>
                <Text style={{ fontSize: 14, color: Colors.textBody }}>
                  {profile?.email}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Notifications */}
        <Text
          style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 8, marginTop: 8 }}
        >
          Notifications
        </Text>
        <Card className="mb-5">
          <SettingsRow
            icon="medical-outline"
            label="Medication Reminders"
            trailing={
              <Switch
                value={medReminders}
                onValueChange={toggleMedReminders}
                trackColor={{ false: '#D1D5DB', true: Colors.secondary }}
                thumbColor="#FFFFFF"
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
                thumbColor="#FFFFFF"
              />
            }
          />
        </Card>

        {/* Legal */}
        <Text
          style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}
        >
          Legal
        </Text>
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
        <Text
          style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}
        >
          Data
        </Text>
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

        <Text style={{ fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 16, marginBottom: 32 }}>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={[Shadows.lg, { backgroundColor: Colors.surface, borderRadius: 24, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center' }]}>
            <View style={{ width: 140, height: 140, borderRadius: 70, overflow: 'hidden', marginBottom: 16 }}>
              <Image
                source={require('@/assets/illustrations/mascot-waving-goodbye.png')}
                style={{ width: 140, height: 140 }}
                contentFit="cover"
              />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textHeading, textAlign: 'center', marginBottom: 8 }}>
              We'll miss you!
            </Text>
            <Text style={{ fontSize: 15, color: Colors.textBody, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
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
              style={{ marginTop: 16, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.textBody }}>
                Never mind, I'll stay
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </CurvedHeaderPage>
  );
}
