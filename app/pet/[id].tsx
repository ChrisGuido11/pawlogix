import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { usePets } from '@/lib/pet-context';
import { calculateAge } from '@/lib/utils';
import type { PetProfile, HealthRecord } from '@/types';

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { setActivePet, refreshPets } = usePets();
  const [pet, setPet] = useState<PetProfile | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background px-4 pt-4">
        <Skeleton height={200} className="mb-4 w-full" />
        <Skeleton height={20} className="mb-2 w-3/4" />
        <Skeleton height={16} className="mb-6 w-1/2" />
        <Skeleton height={100} className="mb-4 w-full" />
      </SafeAreaView>
    );
  }

  if (!pet) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <EmptyState
          icon="alert-circle-outline"
          title="Pet not found"
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 pt-4 pb-8">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
          </Pressable>
          <View className="flex-row gap-4">
            <Pressable onPress={() => { setActivePet(pet); router.back(); }}>
              <Ionicons name="star-outline" size={24} color="#0D7377" />
            </Pressable>
            <Pressable onPress={handleDelete}>
              <Ionicons name="trash-outline" size={24} color="#EF5350" />
            </Pressable>
          </View>
        </View>

        {/* Pet Info Card */}
        <Card className="mb-5">
          <View className="items-center">
            {pet.photo_url ? (
              <Image
                source={{ uri: pet.photo_url }}
                style={{ width: 96, height: 96, borderRadius: 48 }}
                className="mb-3"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center mb-3">
                <Ionicons name="paw" size={40} color="#0D7377" />
              </View>
            )}
            <Text className="text-2xl font-bold text-text-primary">{pet.name}</Text>
            <Text className="text-base text-text-secondary mt-1">
              {pet.breed ?? pet.species} {pet.date_of_birth ? `· ${calculateAge(pet.date_of_birth)}` : ''}
            </Text>
            {pet.weight_kg && (
              <Badge label={`${pet.weight_kg} kg`} variant="primary" className="mt-2" />
            )}
          </View>
        </Card>

        {/* Quick Actions */}
        <View className="flex-row gap-3 mb-5">
          <Card onPress={() => router.push('/record/scan')} className="flex-1 items-center py-4">
            <Ionicons name="scan-outline" size={28} color="#0D7377" />
            <Text className="text-xs font-medium text-text-primary mt-2">Scan Record</Text>
          </Card>
          <Card className="flex-1 items-center py-4">
            <Ionicons name="trending-up-outline" size={28} color="#0D7377" />
            <Text className="text-xs font-medium text-text-primary mt-2">Health Trends</Text>
          </Card>
        </View>

        {/* Records Section */}
        <Text className="text-xl font-semibold text-text-primary mb-3">Records</Text>
        {records.length === 0 ? (
          <Card className="mb-5">
            <View className="items-center py-6">
              <Ionicons name="document-text-outline" size={40} color="#D1D5DB" />
              <Text className="text-sm text-text-secondary mt-2 text-center">
                No records yet. Scan your first vet record!
              </Text>
            </View>
          </Card>
        ) : (
          records.map((record) => (
            <Card
              key={record.id}
              onPress={() => router.push(`/record/${record.id}` as any)}
              className="mb-3"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="document-text" size={24} color="#0D7377" />
                <View className="flex-1">
                  <Text className="text-base font-medium text-text-primary">
                    {record.record_type.replace('_', ' ')}
                  </Text>
                  <Text className="text-sm text-text-secondary">{record.record_date}</Text>
                </View>
                <Badge
                  label={record.processing_status}
                  variant={record.processing_status === 'completed' ? 'success' : 'primary'}
                />
              </View>
            </Card>
          ))
        )}

        {/* Notes */}
        {pet.notes && (
          <>
            <Text className="text-xl font-semibold text-text-primary mb-3 mt-2">Notes</Text>
            <Card>
              <Text className="text-base text-text-primary">{pet.notes}</Text>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
