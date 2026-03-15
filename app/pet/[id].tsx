import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Animated from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CurvedHeader } from '@/components/ui/curved-header';
import { DisclaimerBanner } from '@/components/ui/disclaimer-banner';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { usePetMedications } from '@/hooks/usePetMedications';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { supabase } from '@/lib/supabase';
import { usePets } from '@/lib/pet-context';
import { calculateAge, getRecordTypeLabel, formatDate } from '@/lib/utils';
import { getVaccineStatus, getEffectiveNextDue } from '@/lib/record-filters';
import { useDeleteRecord } from '@/hooks/useDeleteRecord';
import { usePaywall } from '@/hooks/usePaywall';
import { canScan } from '@/lib/subscription';
import { useAuth } from '@/lib/auth-context';
import { getMedReminderSchedules, type MedReminderSchedule } from '@/lib/notifications';
import { cancelNotificationsForPet } from '@/lib/notifications';
import { MedicationReminderModal } from '@/components/medication-reminder-modal';
import { useMedicationCompletions } from '@/hooks/useMedicationCompletions';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows, Spacing, BorderRadius } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';
import { SectionLabel } from '@/components/ui/section-label';
import type { PetProfile, HealthRecord } from '@/types';

function StaggeredCard({ index, children }: { index: number; children: React.ReactNode }) {
  const animStyle = useStaggeredEntrance(index);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { setActivePet, refreshPets } = usePets();
  const { user } = useAuth();
  const { isPremium, showPaywall } = usePaywall();
  const [pet, setPet] = useState<PetProfile | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPet = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const { data: petData, error: petError } = await supabase
        .from('pl_pets')
        .select('*')
        .eq('id', id)
        .single();
      if (petError) throw petError;

      if (petData) setPet(petData as PetProfile);

      const { data: recordData, error: recordError } = await supabase
        .from('pl_health_records')
        .select('*')
        .eq('pet_id', id)
        .order('record_date', { ascending: false })
        .limit(10);
      if (recordError) throw recordError;

      if (recordData) setRecords(recordData as HealthRecord[]);
    } catch {
      setFetchError('Could not load pet details. Pull down to try again.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPet();
  }, [fetchPet]);

  // Re-fetch when screen regains focus (e.g., after scanning a record for this pet)
  const hasMounted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasMounted.current) {
        hasMounted.current = true;
        return;
      }
      fetchPet();
    }, [fetchPet])
  );

  const { medications, isLoading: medsLoading, refresh } = usePetMedications(id);
  const handleDeleteRecord = useDeleteRecord(setRecords);
  const { markDone, markUndone, isCompleted: isMedCompleted, getLastCompletedAt } = useMedicationCompletions();
  const [isUploading, setIsUploading] = useState(false);

  // Medication reminder modal state
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedMed, setSelectedMed] = useState<{ name: string; dosage: string; frequency: string } | null>(null);
  const [activeReminders, setActiveReminders] = useState<Set<string>>(new Set());

  const loadActiveReminders = useCallback(async () => {
    if (!id) return;
    const schedules = await getMedReminderSchedules();
    const active = new Set<string>();
    for (const s of schedules) {
      if (s.petId === id) {
        active.add(s.medicationName);
      }
    }
    setActiveReminders(active);
  }, [id]);

  useEffect(() => {
    loadActiveReminders();
  }, [loadActiveReminders]);

  const handleDelete = () => {
    Alert.alert(
      'Remove Pet',
      `Are you sure you want to remove ${pet?.name}? This will also delete all their records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              await cancelNotificationsForPet(id);
              const { error: deleteError } = await supabase.from('pl_pets').update({ is_active: false }).eq('id', id);
              if (deleteError) throw deleteError;
              await refreshPets();
              router.back();
            } catch {
              Alert.alert('Error', 'Could not remove pet. Please try again.');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPet();
    await refresh();
    setRefreshing(false);
  };

  const updatePhoto = async () => {
    if (!pet || isUploading) return;
    setIsUploading(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    try {
      const uri = result.assets[0].uri;
      const filePath = `${pet.user_id}/${pet.id}.jpg`;

      const formData = new FormData();
      formData.append('', {
        uri,
        name: `${pet.id}.jpg`,
        type: 'image/jpeg',
      } as any);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/pl-pet-photos/${filePath}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-upsert': 'true',
          },
          body: formData,
        }
      );

      if (!uploadRes.ok) {
        const errBody = await uploadRes.text();
        throw new Error(`Upload failed: ${errBody}`);
      }

      const { data: urlData } = supabase.storage
        .from('pl-pet-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase.from('pl_pets').update({ photo_url: urlData.publicUrl }).eq('id', pet.id);
      if (updateError) throw updateError;

      setPet({ ...pet, photo_url: urlData.publicUrl });
      await refreshPets();
    } catch {
      Alert.alert('Photo Upload Failed', 'Could not update the photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.xl, paddingTop: Spacing['5xl'] + Spacing.md }}>
        <View className="flex-row items-center gap-3 mb-6">
          <Skeleton width={40} height={40} className="rounded-xl" />
          <Skeleton height={20} className="w-1/3" />
        </View>
        <Card className="mb-5 items-center py-6">
          <Skeleton width={120} height={120} className="rounded-full mb-3" />
          <Skeleton height={24} className="w-1/3 mb-2" />
          <Skeleton height={16} className="w-1/2" />
        </Card>
        <View className="flex-row gap-3 mb-5">
          <Card className="flex-1 items-center py-4">
            <Skeleton width={28} height={28} className="rounded mb-2" />
            <Skeleton height={12} className="w-2/3" />
          </Card>
          <Card className="flex-1 items-center py-4">
            <Skeleton width={28} height={28} className="rounded mb-2" />
            <Skeleton height={12} className="w-2/3" />
          </Card>
        </View>
      </View>
    );
  }

  if (fetchError && !pet) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <EmptyState
          illustration={require('@/assets/illustrations/mascot-tangled.png')}
          title="Something went wrong"
          subtitle={fetchError}
          actionLabel="Retry"
          onAction={fetchPet}
        />
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <EmptyState
          illustration={require('@/assets/illustrations/mascot-tangled.png')}
          title="Pet not found"
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.primary }}>
      <CurvedHeader
        title={pet.name}
        subtitle={[pet.breed ?? pet.species, pet.sex ? (pet.sex === 'male' ? 'Male' : 'Female') : null, pet.date_of_birth ? calculateAge(pet.date_of_birth) : null].filter(Boolean).join(' · ')}
        showBack
        rightIcon="create-outline"
        onRightPress={() => router.push(`/pet/edit/${pet.id}` as any)}
        extraPaddingBottom={40}
      />

      {/* Overlapping avatar */}
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          marginTop: -32,
          borderTopLeftRadius: BorderRadius.curvedHeader,
          borderTopRightRadius: BorderRadius.curvedHeader,
        }}
      >
        <View style={{ alignItems: 'center', marginTop: -48 }}>
          <Pressable onPress={updatePhoto} disabled={isUploading} style={[Shadows.lg, { borderRadius: 48, opacity: isUploading ? 0.6 : 1 }]}>
            {pet.photo_url ? (
              <Image
                source={{ uri: pet.photo_url }}
                style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: Colors.textOnPrimary }}
              />
            ) : (
              <LinearGradient
                colors={[...Gradients.primaryCta]}
                style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: Colors.textOnPrimary, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="camera-outline" size={32} color={Colors.textOnPrimary} />
              </LinearGradient>
            )}
          </Pressable>
          {isUploading && (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: Spacing.sm }} />
          )}
          {pet.weight_kg && (
            <Badge label={`${pet.weight_kg} lbs`} variant="primary" className="mt-3" />
          )}
        </View>

        <ScrollView
          style={{ flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg }}
          contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          {/* Quick Actions */}
          <StaggeredCard index={0}>
            <View className="flex-row gap-3 mb-5">
              <Card onPress={async () => {
                if (!isPremium && user?.id) {
                  const allowed = await canScan(user.id);
                  if (!allowed) { showPaywall(); return; }
                }
                router.push('/record/scan');
              }} className="flex-1 items-center py-5">
                <View
                  style={{ width: 48, height: 48, borderRadius: BorderRadius.statTile, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm }}
                >
                  <Ionicons name="scan-outline" size={24} color={Colors.primary} />
                </View>
                <Text style={[Typography.caption, { fontFamily: Fonts.bold, color: Colors.textHeading }]}>Scan Record</Text>
              </Card>
              <Card onPress={() => Alert.alert('Coming Soon', 'Health Trends will be available in a future update.')} className="flex-1 items-center py-5">
                <View
                  style={{ width: 48, height: 48, borderRadius: BorderRadius.statTile, backgroundColor: Colors.warningLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm }}
                >
                  <Ionicons name="trending-up-outline" size={24} color={Colors.secondary} />
                </View>
                <Text style={[Typography.caption, { fontFamily: Fonts.bold, color: Colors.textHeading }]}>Health Trends</Text>
              </Card>
            </View>
          </StaggeredCard>

          {/* Medications Section */}
          <StaggeredCard index={1}>
            <SectionLabel>
              Medications
            </SectionLabel>
          </StaggeredCard>
          {medsLoading ? (
            <Card className="mb-5">
              <View className="flex-row items-center gap-3 py-2">
                <Skeleton width={36} height={36} className="rounded-xl" />
                <View style={{ flex: 1 }}>
                  <Skeleton height={16} className="w-2/3 mb-1" />
                  <Skeleton height={12} className="w-1/2" />
                </View>
              </View>
            </Card>
          ) : medications.length === 0 ? (
            <Card className="mb-5">
              <View className="flex-row items-center gap-3 py-2">
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: BorderRadius.button,
                    backgroundColor: Colors.successLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="medkit-outline" size={20} color={Colors.success} />
                </View>
                <Text style={[Typography.secondary, { color: Colors.textBody, flex: 1 }]}>
                  No medications found in scanned records
                </Text>
              </View>
            </Card>
          ) : (
            <View style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
              {medications.map((med, idx) => (
                <StaggeredCard key={`${med.sourceRecordId}-${med.name}`} index={2 + idx}>
                  <Card onPress={() => {
                    setSelectedMed({ name: med.name, dosage: med.dosage, frequency: med.frequency });
                    setReminderModalVisible(true);
                  }}>
                    <View className="flex-row items-center gap-3">
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: Colors.successLight,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="medkit" size={20} color={Colors.success} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>
                          {med.name}
                        </Text>
                        {(med.dosage || med.frequency) && (
                          <Text style={[Typography.secondary, { color: Colors.textBody }]}>
                            {[med.dosage, med.frequency].filter(Boolean).join(' · ')}
                          </Text>
                        )}
                        {(() => {
                          const lastDone = id ? getLastCompletedAt(id, med.name) : null;
                          const effectiveDue = getEffectiveNextDue(med.next_due, med.frequency, lastDone);
                          if (!effectiveDue) return null;
                          const completed = id ? isMedCompleted(id, med.name, med.frequency) : false;
                          if (completed) {
                            return (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                                <Text style={[Typography.caption, { color: Colors.success }]}>Done · Next due: {formatDate(effectiveDue)}</Text>
                              </View>
                            );
                          }
                          const medStatus = getVaccineStatus(effectiveDue);
                          const statusColor = medStatus === 'overdue' ? Colors.error : medStatus === 'upcoming' ? Colors.warning : Colors.primaryDark;
                          return (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              {medStatus === 'overdue' && <Ionicons name="alert-circle" size={12} color={Colors.error} />}
                              {medStatus === 'upcoming' && <Ionicons name="time" size={12} color={Colors.warning} />}
                              <Text style={[Typography.caption, { color: statusColor }]}>
                                {medStatus === 'overdue' ? 'Overdue' : medStatus === 'upcoming' ? 'Due Soon' : `Next due: ${formatDate(effectiveDue)}`}
                              </Text>
                            </View>
                          );
                        })()}
                        <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 2 }]}>
                          {getRecordTypeLabel(med.sourceRecordType)} · {formatDate(med.sourceRecordDate)}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          if (!id) return;
                          const completed = isMedCompleted(id, med.name, med.frequency);
                          if (completed) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            markUndone(id, med.name);
                          } else {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            markDone(id, med.name);
                          }
                        }}
                        hitSlop={8}
                        style={{ padding: 4 }}
                        accessibilityLabel={id && isMedCompleted(id, med.name, med.frequency) ? `Mark ${med.name} as not done` : `Mark ${med.name} as done`}
                        accessibilityRole="button"
                      >
                        <Ionicons
                          name={id && isMedCompleted(id, med.name, med.frequency) ? 'checkmark-circle' : 'checkmark-circle-outline'}
                          size={20}
                          color={id && isMedCompleted(id, med.name, med.frequency) ? Colors.success : Colors.textMuted}
                        />
                      </Pressable>
                      <Ionicons
                        name={activeReminders.has(med.name) ? 'notifications' : 'notifications-outline'}
                        size={20}
                        color={activeReminders.has(med.name) ? Colors.primary : Colors.textMuted}
                      />
                    </View>
                  </Card>
                </StaggeredCard>
              ))}
              <DisclaimerBanner />
            </View>
          )}

          {/* Records Section */}
          <StaggeredCard index={2 + medications.length}>
            <SectionLabel>
              Records
            </SectionLabel>
          </StaggeredCard>

          {records.length === 0 ? (
            <Card>
              <View className="items-center py-6">
                <View style={{ width: 120, height: 120, borderRadius: 60, overflow: 'hidden', marginBottom: Spacing.sm }}>
                  <Image
                    source={require('@/assets/illustrations/mascot-running.png')}
                    style={{ width: 120, height: 120 }}
                    contentFit="cover"
                  />
                </View>
                <Text style={[Typography.secondary, { color: Colors.textBody, marginTop: Spacing.sm, textAlign: 'center' }]}>
                  No records yet. Scan your first vet record!
                </Text>
              </View>
            </Card>
          ) : (
            records.map((record, idx) => (
              <StaggeredCard key={record.id} index={3 + medications.length + idx}>
                <SwipeableRow onDelete={() => handleDeleteRecord(record)}>
                  <Card
                    onPress={() => router.push(`/record/${record.id}` as any)}
                  >
                    <View className="flex-row items-center gap-3">
                      <LinearGradient
                        colors={[...Gradients.primaryCta]}
                        style={{ width: 40, height: 40, borderRadius: BorderRadius.button, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="document-text" size={20} color={Colors.textOnPrimary} />
                      </LinearGradient>
                      <View className="flex-1">
                        <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>
                          {getRecordTypeLabel(record.record_type)}
                        </Text>
                        <Text style={[Typography.secondary, { color: Colors.textBody }]}>{formatDate(record.record_date)}</Text>
                      </View>
                      {record.processing_status === 'completed' ? (
                        <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                      ) : (
                        <Badge
                          label={record.processing_status}
                          variant="primary"
                        />
                      )}
                    </View>
                  </Card>
                </SwipeableRow>
              </StaggeredCard>
            ))
          )}

          {/* Notes */}
          {pet.notes && (
            <StaggeredCard index={records.length + 3 + medications.length}>
              <SectionLabel>
                Notes
              </SectionLabel>
              <Card>
                <Text style={[Typography.body, { color: Colors.textHeading }]}>{pet.notes}</Text>
              </Card>
            </StaggeredCard>
          )}

          {/* Remove Pet */}
          <View style={{ marginTop: Spacing['2xl'], alignItems: 'center' }}>
            <Button
              title="Remove Pet"
              onPress={handleDelete}
              variant="destructive"
              size="sm"
              icon="trash-outline"
            />
          </View>
        </ScrollView>
      </View>

      {selectedMed && pet && (
        <MedicationReminderModal
          visible={reminderModalVisible}
          onClose={() => {
            setReminderModalVisible(false);
            loadActiveReminders();
          }}
          petId={pet.id}
          petName={pet.name}
          medicationName={selectedMed.name}
          dosage={selectedMed.dosage}
          frequency={selectedMed.frequency}
        />
      )}
    </View>
  );
}
