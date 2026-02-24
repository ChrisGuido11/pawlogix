import { useState, useCallback } from 'react';
import { View, Text, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { usePets } from '@/lib/pet-context';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { calculateAge } from '@/lib/utils';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import type { PetProfile } from '@/types';

function PetCardSkeleton() {
  return (
    <Card style={{ marginBottom: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <Skeleton width={64} height={64} />
        <View style={{ flex: 1, gap: Spacing.sm }}>
          <Skeleton height={18} width="66%" />
          <Skeleton height={14} width="50%" />
        </View>
      </View>
    </Card>
  );
}

function PetCard({ pet, onPress, index }: { pet: PetProfile; onPress: () => void; index: number }) {
  const animStyle = useStaggeredEntrance(index);

  return (
    <Animated.View style={animStyle}>
      <Card onPress={onPress} style={{ marginBottom: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          {pet.photo_url ? (
            <View style={[Shadows.sm, { borderRadius: 32 }]}>
              <Image
                source={{ uri: pet.photo_url }}
                style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: Colors.primaryLight }}
              />
            </View>
          ) : (
            <LinearGradient
              colors={[...Gradients.primaryCta]}
              style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons
                name={pet.species === 'dog' ? 'paw' : 'paw-outline'}
                size={28}
                color={Colors.textOnPrimary}
              />
            </LinearGradient>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>{pet.name}</Text>
            <Text style={[Typography.secondary, { color: Colors.textBody, marginTop: 2 }]}>
              {pet.breed ?? pet.species}
              {pet.date_of_birth ? ` · ${calculateAge(pet.date_of_birth)}` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </View>
      </Card>
    </Animated.View>
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

  const subtitle = pets.length === 0
    ? 'Add your first pet'
    : `${pets.length} companion${pets.length > 1 ? 's' : ''}`;

  if (isLoading) {
    return (
      <CurvedHeaderPage
        headerProps={{ title: 'My Pets', subtitle: 'Loading...' }}
        contentStyle={{ paddingHorizontal: 0 }}
      >
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <PetCardSkeleton />
          <PetCardSkeleton />
          <PetCardSkeleton />
        </View>
      </CurvedHeaderPage>
    );
  }

  return (
    <CurvedHeaderPage
      headerProps={{ title: 'My Pets', subtitle }}
      contentStyle={{ paddingHorizontal: 0 }}
    >
      <View style={{ flex: 1, paddingHorizontal: Spacing.lg }}>
        {pets.length === 0 ? (
          <EmptyState
            illustration={require('@/assets/illustrations/mascot-sleeping.png')}
            title="No pets yet!"
            subtitle="Add your first furry friend to get started."
            actionLabel="Add Pet"
            onAction={() => router.push('/pet/create')}
          />
        ) : (
          <FlashList
            data={pets}
            renderItem={({ item, index }) => (
              <PetCard
                pet={item}
                onPress={() => router.push(`/pet/${item.id}` as any)}
                index={index}
              />
            )}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
          />
        )}
      </View>

    </CurvedHeaderPage>
  );
}
