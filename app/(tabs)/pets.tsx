import { useState, useCallback } from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { usePets } from '@/lib/pet-context';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateAge } from '@/lib/utils';
import type { PetProfile } from '@/types';

function PetCardSkeleton() {
  return (
    <View className="bg-surface rounded-xl border border-border p-4 mb-3 flex-row items-center gap-3">
      <Skeleton width={56} height={56} className="rounded-full" />
      <View className="flex-1 gap-2">
        <Skeleton height={18} className="w-2/3" />
        <Skeleton height={14} className="w-1/2" />
      </View>
      <Skeleton width={20} height={20} className="rounded" />
    </View>
  );
}

function PetCard({ pet, onPress }: { pet: PetProfile; onPress: () => void }) {
  return (
    <Card onPress={onPress} className="mb-3">
      <View className="flex-row items-center gap-3">
        {pet.photo_url ? (
          <Image
            source={{ uri: pet.photo_url }}
            style={{ width: 56, height: 56, borderRadius: 28 }}
          />
        ) : (
          <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center">
            <Ionicons
              name={pet.species === 'dog' ? 'paw' : 'paw-outline'}
              size={24}
              color="#0D7377"
            />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-lg font-semibold text-text-primary">{pet.name}</Text>
          <Text className="text-sm text-text-secondary">
            {pet.breed ?? pet.species}
            {pet.date_of_birth ? ` · ${calculateAge(pet.date_of_birth)}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748B" />
      </View>
    </Card>
  );
}

export default function PetsScreen() {
  const router = useRouter();
  const { pets, isLoading, refreshPets } = usePets();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPets();
    setRefreshing(false);
  }, [refreshPets]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background px-4 pt-4">
        <Text className="text-3xl font-bold text-text-primary mb-6">My Pets</Text>
        <PetCardSkeleton />
        <PetCardSkeleton />
        <PetCardSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4 pt-4">
        <Text className="text-3xl font-bold text-text-primary mb-6">My Pets</Text>

        {pets.length === 0 ? (
          <EmptyState
            icon="paw-outline"
            title="No pets yet!"
            subtitle="Add your first furry friend to get started."
            actionLabel="Add Pet"
            onAction={() => router.push('/pet/create')}
          />
        ) : (
          <FlashList
            data={pets}
            renderItem={({ item }) => (
              <PetCard
                pet={item}
                onPress={() => router.push(`/pet/${item.id}` as any)}
              />
            )}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D7377" />
            }
          />
        )}
      </View>

      <Pressable
        onPress={() => router.push('/pet/create')}
        className="absolute bottom-28 right-5 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}
