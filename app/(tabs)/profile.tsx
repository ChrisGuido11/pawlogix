import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Switch, Alert, Pressable, Modal, Linking } from 'react-native';
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
import { usePaywall } from '@/hooks/usePaywall';
import { getManageSubscriptionURL } from '@/lib/revenucat';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import {
  requestNotificationPermissions,
  cancelNotificationsByType,
  cancelMedNotificationsOnly,
  rescheduleAllMedReminders,
  cancelAllNotifications,
} from '@/lib/notifications';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows, Spacing, BorderRadius, IconTile } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';
import { SectionLabel } from '@/components/ui/section-label';
import {
  ADVANCE_OPTIONS,
  TIME_OPTIONS,
  getAdvanceDays,
  setAdvanceDays as saveAdvanceDays,
  getReminderHour,
  setReminderHour as saveReminderHour,
  formatHour,
} from '@/lib/notification-prefs';

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
  const { isPremium, restorePurchases: rcRestore } = usePaywall();
  const [medReminders, setMedReminders] = useState(profile?.notification_med_reminders ?? true);
  const [vaxReminders, setVaxReminders] = useState(profile?.notification_vax_reminders ?? true);
  const [preventiveReminders, setPreventiveReminders] = useState(profile?.notification_preventive_reminders ?? true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [advanceDays, setAdvanceDays] = useState(7);
  const [reminderHour, setReminderHour] = useState(9);
  const [showAdvancePicker, setShowAdvancePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    getAdvanceDays().then(setAdvanceDays);
    getReminderHour().then(setReminderHour);
  }, []);

  const handleAdvanceDaysChange = useCallback(async (days: number) => {
    setAdvanceDays(days);
    setShowAdvancePicker(false);
    await saveAdvanceDays(days);
    Haptics.selectionAsync();
    toast({ title: 'Updated', message: `Vaccine reminders set to ${days} day${days !== 1 ? 's' : ''} before.`, preset: 'done' });
  }, []);

  const handleReminderHourChange = useCallback(async (hour: number) => {
    setReminderHour(hour);
    setShowTimePicker(false);
    await saveReminderHour(hour);
    Haptics.selectionAsync();
    toast({ title: 'Updated', message: `Reminders will arrive at ${formatHour(hour)}.`, preset: 'done' });
  }, []);

  const toggleMedReminders = async (value: boolean) => {
    const previous = medReminders;
    setMedReminders(value);
    Haptics.selectionAsync();

    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setMedReminders(previous);
        toast({ title: 'Notifications Blocked', message: 'Please enable notifications in your device settings.', preset: 'error' });
        return;
      }
      // Reschedule all saved med reminders from AsyncStorage
      const count = await rescheduleAllMedReminders();
      if (count > 0) {
        toast({ title: 'Reminders restored', message: `${count} medication reminder${count !== 1 ? 's' : ''} rescheduled.`, preset: 'done' });
      }
    } else {
      // Cancel OS notifications but preserve saved schedules
      await cancelMedNotificationsOnly();
    }

    if (user?.id) {
      const { error } = await supabase
        .from('pl_profiles')
        .update({ notification_med_reminders: value })
        .eq('id', user.id);
      if (error) {
        setMedReminders(previous);
        toast({ title: 'Failed to update', message: 'Could not save notification preference. Please try again.', preset: 'error' });
      } else {
        await refreshProfile();
      }
    }
  };

  const toggleVaxReminders = async (value: boolean) => {
    const previous = vaxReminders;
    setVaxReminders(value);
    Haptics.selectionAsync();

    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setVaxReminders(previous);
        toast({ title: 'Notifications Blocked', message: 'Please enable notifications in your device settings.', preset: 'error' });
        return;
      }
    } else {
      await cancelNotificationsByType('vaccine_reminder');
    }

    if (user?.id) {
      const { error } = await supabase
        .from('pl_profiles')
        .update({ notification_vax_reminders: value })
        .eq('id', user.id);
      if (error) {
        setVaxReminders(previous);
        toast({ title: 'Failed to update', message: 'Could not save notification preference. Please try again.', preset: 'error' });
      } else {
        await refreshProfile();
      }
    }
  };

  const togglePreventiveReminders = async (value: boolean) => {
    const previous = preventiveReminders;
    setPreventiveReminders(value);
    Haptics.selectionAsync();

    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setPreventiveReminders(previous);
        toast({ title: 'Notifications Blocked', message: 'Please enable notifications in your device settings.', preset: 'error' });
        return;
      }
    } else {
      await cancelNotificationsByType('preventive_care_reminder');
    }

    if (user?.id) {
      const { error } = await supabase
        .from('pl_profiles')
        .update({ notification_preventive_reminders: value })
        .eq('id', user.id);
      if (error) {
        setPreventiveReminders(previous);
        toast({ title: 'Failed to update', message: 'Could not save notification preference. Please try again.', preset: 'error' });
      } else {
        await refreshProfile();
      }
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
        .eq('user_id', user.id)
        .order('record_date', { ascending: false });

      const formatDate = (d: string | null) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      };

      const recordTypeLabel = (t: string) => {
        const map: Record<string, string> = { lab_results: 'Lab Results', vet_visit: 'Vet Visit', vaccine: 'Vaccine', prescription: 'Prescription', other: 'Other' };
        return map[t] ?? t;
      };

      const severityColor = (s: string) => {
        if (s === 'urgent') return '#EF4444';
        if (s === 'watch') return '#F59E0B';
        return '#6B7280';
      };

      const petsHtml = (pets ?? []).map((pet) => `
        <div class="pet-card">
          <h2>${pet.name}</h2>
          <div class="meta-grid">
            <div><span class="label">Species</span><span class="value">${pet.species === 'dog' ? 'Dog' : 'Cat'}</span></div>
            ${pet.breed ? `<div><span class="label">Breed</span><span class="value">${pet.breed}</span></div>` : ''}
            ${pet.sex ? `<div><span class="label">Sex</span><span class="value">${pet.sex === 'male' ? 'Male' : 'Female'}</span></div>` : ''}
            ${pet.date_of_birth ? `<div><span class="label">Date of Birth</span><span class="value">${formatDate(pet.date_of_birth)}</span></div>` : ''}
            ${pet.weight_kg ? `<div><span class="label">Weight</span><span class="value">${Math.round(pet.weight_kg * 2.205)} lbs</span></div>` : ''}
          </div>

          ${(records ?? []).filter((r: Record<string, unknown>) => r.pet_id === pet.id).length > 0 ? `
            <h3>Health Records</h3>
            ${(records ?? []).filter((r: Record<string, unknown>) => r.pet_id === pet.id).map((rec: Record<string, unknown>) => {
              const interp = rec.interpretation as Record<string, unknown> | null;
              const flagged = (interp?.flagged_items ?? []) as Array<Record<string, string>>;
              const sections = (interp?.interpreted_sections ?? []) as Array<Record<string, string>>;
              const extracted = (interp?.extracted_values ?? {}) as Record<string, unknown>;
              const vaccines = (extracted.vaccines ?? []) as Array<Record<string, string>>;
              const medications = (extracted.medications ?? []) as Array<Record<string, string>>;

              return `
              <div class="record">
                <div class="record-header">
                  <span class="record-type">${recordTypeLabel(rec.record_type as string)}</span>
                  <span class="record-date">${formatDate(rec.record_date as string)}</span>
                </div>

                ${interp?.summary ? `<p class="summary">${interp.summary}</p>` : ''}

                ${flagged.length > 0 ? `
                  <div class="flagged">
                    <h4>Flagged Items</h4>
                    ${flagged.map((f) => `
                      <div class="flag-item">
                        <span class="flag-dot" style="background:${severityColor(f.severity)}"></span>
                        <div>
                          <strong>${f.item}</strong>: ${f.value} <span class="normal-range">(normal: ${f.normal_range})</span>
                          <p class="flag-explanation">${f.explanation}</p>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}

                ${sections.length > 0 ? `
                  ${sections.map((s) => `
                    <div class="section">
                      <h4>${s.title}</h4>
                      <p>${s.plain_english_content}</p>
                    </div>
                  `).join('')}
                ` : ''}

                ${vaccines.length > 0 ? `
                  <div class="section">
                    <h4>Vaccines</h4>
                    <table>
                      <tr><th>Vaccine</th><th>Date Given</th><th>Next Due</th></tr>
                      ${vaccines.map((v) => `<tr><td>${v.name}</td><td>${formatDate(v.date_given)}</td><td>${formatDate(v.next_due)}</td></tr>`).join('')}
                    </table>
                  </div>
                ` : ''}

                ${medications.length > 0 ? `
                  <div class="section">
                    <h4>Medications</h4>
                    <table>
                      <tr><th>Medication</th><th>Dosage</th><th>Frequency</th></tr>
                      ${medications.map((m) => `<tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td></tr>`).join('')}
                    </table>
                  </div>
                ` : ''}
              </div>
            `;
            }).join('')}
          ` : '<p class="empty">No health records yet.</p>'}
        </div>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, Helvetica Neue, sans-serif; color: #1A1A2E; padding: 40px; background: #fff; line-height: 1.5; }
            .header { text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #0D7377; }
            .header h1 { font-size: 28px; color: #0D7377; margin-bottom: 4px; }
            .header p { color: #64748B; font-size: 13px; }
            .pet-card { margin-bottom: 40px; }
            .pet-card h2 { font-size: 22px; color: #0D7377; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0; }
            .pet-card h3 { font-size: 16px; color: #1A1A2E; margin: 20px 0 12px; }
            .meta-grid { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 8px; }
            .meta-grid > div { min-width: 120px; }
            .label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; }
            .value { font-size: 15px; font-weight: 600; }
            .record { background: #F8F7F4; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
            .record-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
            .record-type { font-weight: 700; font-size: 14px; color: #0D7377; }
            .record-date { font-size: 13px; color: #64748B; }
            .summary { font-size: 14px; color: #334155; margin-bottom: 12px; }
            .flagged { margin: 12px 0; }
            .flagged h4 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 8px; }
            .flag-item { display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start; }
            .flag-dot { width: 8px; height: 8px; border-radius: 4px; margin-top: 6px; flex-shrink: 0; }
            .flag-explanation { font-size: 13px; color: #64748B; margin-top: 2px; }
            .normal-range { font-size: 12px; color: #94A3B8; }
            .section { margin: 12px 0; }
            .section h4 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 6px; }
            .section p { font-size: 14px; color: #334155; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 4px; }
            th { text-align: left; padding: 6px 8px; background: #E2E8F0; font-weight: 600; font-size: 12px; }
            td { padding: 6px 8px; border-bottom: 1px solid #E2E8F0; }
            .empty { font-size: 14px; color: #94A3B8; font-style: italic; margin: 8px 0; }
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #94A3B8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PawLogix Health Report</h1>
            <p>Exported ${formatDate(new Date().toISOString())}</p>
          </div>
          ${(pets ?? []).length > 0 ? petsHtml : '<p class="empty">No pets added yet.</p>'}
          <div class="footer">
            <p>Generated by PawLogix &mdash; Your pet's health, simplified</p>
            <p>This report is not a substitute for professional veterinary advice.</p>
          </div>
        </body>
        </html>
      `;

      const fileName = `PawLogix-Health-Report-${new Date().toISOString().slice(0, 10)}.html`;
      const filePath = `${documentDirectory}${fileName}`;
      await writeAsStringAsync(filePath, html);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/html',
          dialogTitle: 'Export PawLogix Health Report',
        });
      }

      toast({ title: 'Report exported!', preset: 'done' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to export';
      toast({ title: 'Export failed', message, preset: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const deleteAccount = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    const completed: string[] = [];
    const failed: string[] = [];

    try {
      if (!user?.id) return;

      // 1. Delete chat messages
      try {
        const { error } = await supabase.from('pl_record_chats').delete().eq('user_id', user.id);
        if (error) throw error;
        completed.push('chat messages');
      } catch {
        failed.push('chat messages');
      }

      // 2. Delete health records
      try {
        const { error } = await supabase.from('pl_health_records').delete().eq('user_id', user.id);
        if (error) throw error;
        completed.push('health records');
      } catch {
        failed.push('health records');
      }

      // 3. Delete pet photos from storage
      try {
        const { data: petPhotos } = await supabase.storage
          .from('pl-pet-photos')
          .list(user.id);
        if (petPhotos?.length) {
          const { error } = await supabase.storage
            .from('pl-pet-photos')
            .remove(petPhotos.map((f) => `${user.id}/${f.name}`));
          if (error) throw error;
        }
        completed.push('pet photos');
      } catch {
        failed.push('pet photos');
      }

      // 4. Delete record images from storage
      try {
        const { data: recordImages } = await supabase.storage
          .from('pl-record-images')
          .list(user.id);
        if (recordImages?.length) {
          const { error } = await supabase.storage
            .from('pl-record-images')
            .remove(recordImages.map((f) => `${user.id}/${f.name}`));
          if (error) throw error;
        }
        completed.push('record images');
      } catch {
        failed.push('record images');
      }

      // 5. Delete pets
      try {
        const { error } = await supabase.from('pl_pets').delete().eq('user_id', user.id);
        if (error) throw error;
        completed.push('pets');
      } catch {
        failed.push('pets');
      }

      // 6. Delete usage tracking
      try {
        const { error } = await supabase.from('pl_usage_tracking').delete().eq('user_id', user.id);
        if (error) throw error;
        completed.push('usage data');
      } catch {
        failed.push('usage data');
      }

      // 7. Delete profile
      try {
        const { error } = await supabase.from('pl_profiles').delete().eq('id', user.id);
        if (error) throw error;
        completed.push('profile');
      } catch {
        failed.push('profile');
      }

      if (failed.length > 0) {
        Alert.alert(
          'Partial Deletion',
          `Some data could not be deleted: ${failed.join(', ')}. Please contact support for help removing the remaining data.`
        );
        return;
      }

      // 8. Delete the auth user via edge function (requires service role)
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.access_token) {
          const { error: fnError } = await supabase.functions.invoke('pl-delete-account', {
            headers: { Authorization: `Bearer ${currentSession.access_token}` },
          });
          if (fnError) throw fnError;
          completed.push('auth account');
        }
      } catch {
        failed.push('auth account');
      }

      await cancelAllNotifications();
      await AsyncStorage.removeItem('pawlogix_onboarding_complete');
      await signOut();

      setShowDeleteConfirm(false);
      toast({ title: 'Account deleted', preset: 'done' });
      router.replace('/onboarding');
    } catch (error: any) {
      toast({ title: 'Deletion failed', message: error.message, preset: 'error' });
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

        {/* Subscription */}
        <SectionLabel>Subscription</SectionLabel>
        <Card className="mb-5">
          <SettingsRow
            icon={isPremium ? 'star' : 'star-outline'}
            label={isPremium ? 'PawLogix Pro' : 'Free Plan'}
            onPress={isPremium ? undefined : () => router.push('/paywall')}
            trailing={
              isPremium ? (
                <View style={{ backgroundColor: Colors.successLight, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2 }}>
                  <Text style={[Typography.caption, { color: Colors.success }]}>ACTIVE</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                  <Text style={[Typography.secondary, { color: Colors.secondary }]}>Upgrade</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </View>
              )
            }
          />
          <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: IconTile.standard + Spacing.sm }} />
          <SettingsRow
            icon="refresh-outline"
            label="Restore Purchases"
            onPress={async () => {
              if (isRestoring) return;
              setIsRestoring(true);
              try {
                const restored = await rcRestore();
                if (restored) {
                  toast({ title: 'Restored!', message: 'Your subscription has been restored.', preset: 'done' });
                } else {
                  toast({ title: 'No subscription found', message: 'We could not find a previous subscription.', preset: 'error' });
                }
              } finally {
                setIsRestoring(false);
              }
            }}
          />
          {isPremium && (
            <>
              <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: IconTile.standard + Spacing.sm }} />
              <SettingsRow
                icon="settings-outline"
                label="Manage Subscription"
                onPress={async () => {
                  if (isManaging) return;
                  setIsManaging(true);
                  try {
                    const url = await getManageSubscriptionURL();
                    if (url) {
                      Linking.openURL(url);
                    } else {
                      Linking.openURL('https://apps.apple.com/account/subscriptions');
                    }
                  } finally {
                    setIsManaging(false);
                  }
                }}
              />
            </>
          )}
        </Card>

        {/* Notifications — Medications */}
        <SectionLabel>Medication Reminders</SectionLabel>
        <Card className="mb-3">
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
        </Card>
        <Text style={[Typography.caption, { color: Colors.textMuted, marginBottom: Spacing.lg, paddingHorizontal: Spacing.xs }]}>
          Set reminder times for each medication from pet profiles or the home screen. This toggle enables or pauses all medication reminders.
        </Text>

        {/* Notifications — Vaccines & Preventive */}
        <SectionLabel>Vaccine &amp; Preventive Reminders</SectionLabel>
        <Card className="mb-5">
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
          <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: IconTile.standard + Spacing.sm }} />
          <SettingsRow
            icon="fitness-outline"
            label="Preventive Care Reminders"
            trailing={
              <Switch
                value={preventiveReminders}
                onValueChange={togglePreventiveReminders}
                trackColor={{ false: Colors.disabled, true: Colors.secondary }}
                thumbColor={Colors.textOnPrimary}
              />
            }
          />
          {(vaxReminders || preventiveReminders) && (
            <>
              <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: IconTile.standard + Spacing.sm }} />
              <SettingsRow
                icon="calendar-outline"
                label="Advance Notice"
                onPress={() => setShowAdvancePicker(true)}
                trailing={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                    <Text style={[Typography.secondary, { color: Colors.textMuted }]}>{advanceDays} day{advanceDays !== 1 ? 's' : ''}</Text>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                  </View>
                }
              />
              <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: IconTile.standard + Spacing.sm }} />
              <SettingsRow
                icon="time-outline"
                label="Reminder Time"
                onPress={() => setShowTimePicker(true)}
                trailing={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                    <Text style={[Typography.secondary, { color: Colors.textMuted }]}>{formatHour(reminderHour)}</Text>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                  </View>
                }
              />
            </>
          )}
        </Card>

        {/* Legal */}
        <SectionLabel>Legal</SectionLabel>
        <Card className="mb-5">
          <SettingsRow
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://pawlogix.lovable.app/privacy')}
          />
          <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: IconTile.standard + Spacing.sm }} />
          <SettingsRow
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL('https://pawlogix.lovable.app/terms')}
          />
          <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: IconTile.standard + Spacing.sm }} />
          <SettingsRow
            icon="help-circle-outline"
            label="Support & FAQ"
            onPress={() => Linking.openURL('https://pawlogix.lovable.app/support')}
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
          <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: IconTile.standard + Spacing.sm }} />
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

      {/* Advance Notice Picker — conditionally mounted to avoid iOS Modal touch interception */}
      {showAdvancePicker && <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdvancePicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: Colors.modalScrim, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['2xl'] }}
          onPress={() => setShowAdvancePicker(false)}
        >
          <Pressable style={[Shadows.lg, { backgroundColor: Colors.surface, borderRadius: BorderRadius.bottomSheet, padding: Spacing.xl, width: '100%', maxWidth: 480 }]}>
            <Text style={[Typography.sectionHeading, { color: Colors.textHeading, marginBottom: Spacing.lg, textAlign: 'center' }]}>
              Advance Notice
            </Text>
            <Text style={[Typography.secondary, { color: Colors.textBody, marginBottom: Spacing.lg, textAlign: 'center' }]}>
              How early should we remind you about upcoming vaccines and preventive care?
            </Text>
            {ADVANCE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => handleAdvanceDaysChange(opt.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: Spacing.md,
                  paddingHorizontal: Spacing.md,
                  borderRadius: BorderRadius.button,
                  backgroundColor: advanceDays === opt.value ? Colors.primaryLight : 'transparent',
                }}
              >
                <Text style={[Typography.body, { color: advanceDays === opt.value ? Colors.primary : Colors.textHeading }]}>
                  {opt.label}
                </Text>
                {advanceDays === opt.value && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>}

      {/* Reminder Time Picker — conditionally mounted to avoid iOS Modal touch interception */}
      {showTimePicker && <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: Colors.modalScrim, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['2xl'] }}
          onPress={() => setShowTimePicker(false)}
        >
          <Pressable style={[Shadows.lg, { backgroundColor: Colors.surface, borderRadius: BorderRadius.bottomSheet, padding: Spacing.xl, width: '100%', maxWidth: 480 }]}>
            <Text style={[Typography.sectionHeading, { color: Colors.textHeading, marginBottom: Spacing.lg, textAlign: 'center' }]}>
              Reminder Time
            </Text>
            <Text style={[Typography.secondary, { color: Colors.textBody, marginBottom: Spacing.lg, textAlign: 'center' }]}>
              What time of day should vaccine and preventive care reminders arrive?
            </Text>
            {TIME_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => handleReminderHourChange(opt.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: Spacing.md,
                  paddingHorizontal: Spacing.md,
                  borderRadius: BorderRadius.button,
                  backgroundColor: reminderHour === opt.value ? Colors.primaryLight : 'transparent',
                }}
              >
                <Text style={[Typography.body, { color: reminderHour === opt.value ? Colors.primary : Colors.textHeading }]}>
                  {opt.label}
                </Text>
                {reminderHour === opt.value && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>}

      {/* Delete Account Confirmation Modal — conditionally mounted to avoid iOS Modal touch interception */}
      {showDeleteConfirm && <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteConfirm(false)}
      >
        <View style={{ flex: 1, backgroundColor: Colors.modalScrim, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['2xl'] }}>
          <View style={[Shadows.lg, { backgroundColor: Colors.surface, borderRadius: BorderRadius.bottomSheet, padding: Spacing['3xl'], width: '100%', maxWidth: 480, alignItems: 'center' }]}>
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
              style={{ marginTop: Spacing.lg, paddingVertical: Spacing.md }}
            >
              <Text style={[Typography.buttonSecondary, { color: Colors.textBody }]}>
                Never mind, I'll stay
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>}
    </CurvedHeaderPage>
  );
}
