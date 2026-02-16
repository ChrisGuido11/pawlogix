import { useState } from 'react';
import { View, Text, ScrollView, Switch, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { writeAsStringAsync, documentDirectory } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

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
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-3.5"
      style={({ pressed }) => ({ opacity: pressed && onPress ? 0.7 : 1 })}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={destructive ? '#EF5350' : '#64748B'}
      />
      <Text
        className={`text-base flex-1 ${
          destructive ? 'text-error' : 'text-text-primary'
        }`}
      >
        {label}
      </Text>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={18} color="#D1D5DB" /> : null)}
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

  const toggleMedReminders = async (value: boolean) => {
    setMedReminders(value);
    if (user?.id) {
      await supabase
        .from('pl_profiles')
        .update({ notification_med_reminders: value })
        .eq('id', user.id);
    }
  };

  const toggleVaxReminders = async (value: boolean) => {
    setVaxReminders(value);
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
    Alert.alert(
      'Delete Account',
      'Are you sure? This will permanently delete your account and all pet data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              if (!user?.id) return;

              // Delete all user data in order
              await supabase.from('pl_record_chats').delete().eq('user_id', user.id);
              await supabase.from('pl_health_records').delete().eq('user_id', user.id);

              // Delete storage files
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

              // Sign out and create fresh anonymous session
              await signOut();

              toast({ title: 'Account deleted', preset: 'done' });
              router.replace('/(tabs)');
            } catch (error: any) {
              toast({ title: 'Error', message: error.message, preset: 'error' });
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 pt-4 pb-8">
        <Text className="text-3xl font-bold text-text-primary mb-6">Settings</Text>

        {/* Account Section */}
        {isAnonymous ? (
          <Card className="mb-5">
            <View className="items-center py-2">
              <Ionicons name="person-circle-outline" size={48} color="#0D7377" />
              <Text className="text-lg font-semibold text-text-primary mt-2">
                Create an Account
              </Text>
              <Text className="text-sm text-text-secondary text-center mt-1 mb-4">
                Back up your data and access it on any device
              </Text>
              <Button
                title="Sign Up"
                onPress={() => router.push('/auth/signup')}
                className="w-full"
              />
            </View>
            <Text
              className="text-sm text-primary text-center mt-3"
              onPress={() => router.push('/auth/login')}
            >
              Already have an account? Log In
            </Text>
          </Card>
        ) : (
          <Card className="mb-5">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                <Ionicons name="person" size={24} color="#0D7377" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-text-primary">
                  {profile?.display_name ?? 'PawLogix User'}
                </Text>
                <Text className="text-sm text-text-secondary">
                  {profile?.email}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Notifications */}
        <Text className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-2 mt-2">
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
                trackColor={{ false: '#D1D5DB', true: '#0D7377' }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <View className="h-px bg-border" />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Vaccine Reminders"
            trailing={
              <Switch
                value={vaxReminders}
                onValueChange={toggleVaxReminders}
                trackColor={{ false: '#D1D5DB', true: '#0D7377' }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </Card>

        {/* Legal */}
        <Text className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-2">
          Legal
        </Text>
        <Card className="mb-5">
          <SettingsRow
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => showToastPlaceholder('Privacy Policy')}
          />
          <View className="h-px bg-border" />
          <SettingsRow
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => showToastPlaceholder('Terms of Service')}
          />
          <View className="h-px bg-border" />
          <SettingsRow
            icon="help-circle-outline"
            label="Support & FAQ"
            onPress={() => showToastPlaceholder('Support & FAQ')}
          />
        </Card>

        {/* Data */}
        <Text className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-2">
          Data
        </Text>
        <Card className="mb-5">
          <SettingsRow
            icon="download-outline"
            label="Export My Data"
            onPress={exportData}
          />
          <View className="h-px bg-border" />
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

        <Text className="text-xs text-text-secondary text-center mt-4 mb-8">
          PawLogix v1.0.0 (Beta)
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
