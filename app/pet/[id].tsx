import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useDeleteRecord } from '@/hooks/useDeleteRecord';
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
  const [pet, setPet] = useState<PetProfile | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPet = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data: petData } = await supabase
        .from('pl_pets')
        .select('*')
        .eq('id', id)
        .single();

      if (petData) setPet(petData as PetProfile);

      const { data: recordData } = await supabase
        .from('pl_health_records')
        .select('*')
        .eq('pet_id', id)
        .order('record_date', { ascending: false })
        .limit(10);

      if (recordData) setRecords(recordData as HealthRecord[]);
    } catch (error) {
      console.error('Error fetching pet:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPet();
  }, [fetchPet]);

  const { medications, isLoading: medsLoading, refresh } = usePetMedications(id);
  const handleDeleteRecord = useDeleteRecord(setRecords);

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
            await supabase.from('pl_pets').update({ is_active: false }).eq('id', id);
            await refreshPets();
            router.back();
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
    if (!pet) return;
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

      await supabase.from('pl_pets').update({ photo_url: urlData.publicUrl }).eq('id', pet.id);
      setPet({ ...pet, photo_url: urlData.publicUrl });
      await refreshPets();
    } catch (error: any) {
      console.error('Photo update error:', error);
      Alert.alert('Error', error.message || 'Failed to update photo.');
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
        subtitle={`${pet.breed ?? pet.species} ${pet.date_of_birth ? `· ${calculateAge(pet.date_of_birth)}` : ''}`}
        showBack
        rightIcon="trash-outline"
        onRightPress={handleDelete}
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
          <Pressable onPress={updatePhoto} style={[Shadows.lg, { borderRadius: 48 }]}>
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
          {pet.weight_kg && (
            <Badge label={`${pet.weight_kg} kg`} variant="primary" className="mt-3" />
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
              <Card onPress={() => router.push('/record/scan')} className="flex-1 items-center py-5">
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
                  <Card onPress={() => router.push(`/record/${med.sourceRecordId}` as any)}>
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
                        <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 2 }]}>
                          {getRecordTypeLabel(med.sourceRecordType)} · {formatDate(med.sourceRecordDate)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
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
        </ScrollView>
      </View>
    </View>
  );
}
