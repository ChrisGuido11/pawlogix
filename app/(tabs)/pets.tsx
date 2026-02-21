import { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePets } from '@/lib/pet-context';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GradientBackground } from '@/components/ui/gradient-background';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import { calculateAge } from '@/lib/utils';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows } from '@/constants/spacing';
import type { PetProfile } from '@/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PetCardSkeleton() {
  return (
    <Card className="mb-3">
      <View className="flex-row items-center gap-3">
        <Skeleton width={64} height={64} className="rounded-full" />
        <View className="flex-1 gap-2">
          <Skeleton height={18} className="w-2/3" />
          <Skeleton height={14} className="w-1/2" />
        </View>
      </View>
    </Card>
  );
}

function PetCard({ pet, onPress, index }: { pet: PetProfile; onPress: () => void; index: number }) {
  const animStyle = useStaggeredEntrance(index);

  return (
    <Animated.View style={animStyle}>
      <Card onPress={onPress} className="mb-3">
        <View className="flex-row items-center gap-3">
          {pet.photo_url ? (
            <View style={[Shadows.sm, { borderRadius: 32 }]}>
              <Image
                source={{ uri: pet.photo_url }}
                style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#FFFFFF' }}
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
                color="#FFFFFF"
              />
            </LinearGradient>
          )}
          <View className="flex-1">
            <Text className="text-lg font-bold text-text-primary">{pet.name}</Text>
            <Text className="text-sm text-text-secondary mt-0.5">
              {pet.breed ?? pet.species}
              {pet.date_of_birth ? ` · ${calculateAge(pet.date_of_birth)}` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </View>
      </Card>
    </Animated.View>
  );
}

export default function PetsScreen() {
  const router = useRouter();
  const { pets, isLoading, refreshPets } = usePets();
  const [refreshing, setRefreshing] = useState(false);
  const fabScale = useSharedValue(0);
  const { onPressIn, onPressOut, animatedStyle: fabPressStyle } = usePressAnimation(0.9);

  useEffect(() => {
    fabScale.value = withDelay(500, withSpring(1, { damping: 12, stiffness: 150 }));
  }, []);

  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPets();
    setRefreshing(false);
  }, [refreshPets]);

  if (isLoading) {
    return (
      <View className="flex-1">
        <GradientBackground variant="warm">
          <SafeAreaView className="flex-1 px-5 pt-4">
            <Text style={{ fontSize: 36, fontWeight: '800', color: Colors.textPrimary }} className="mb-1">
              My Pets
            </Text>
            <Text className="text-sm text-text-secondary mb-6">Loading...</Text>
            <PetCardSkeleton />
            <PetCardSkeleton />
            <PetCardSkeleton />
          </SafeAreaView>
        </GradientBackground>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <GradientBackground variant="warm">
        <SafeAreaView className="flex-1">
          <View className="flex-1 px-5 pt-4">
            <Text style={{ fontSize: 36, fontWeight: '800', color: Colors.textPrimary }} className="mb-1">
              My Pets
            </Text>
            <Text className="text-sm text-text-secondary mb-6">
              {pets.length === 0 ? 'Add your first pet' : `${pets.length} companion${pets.length > 1 ? 's' : ''}`}
            </Text>

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
                renderItem={({ item, index }) => (
                  <PetCard
                    pet={item}
                    onPress={() => router.push(`/pet/${item.id}` as any)}
                    index={index}
                  />
                )}
                keyExtractor={(item) => item.id}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D7377" />
                }
              />
            )}
          </View>

          <AnimatedPressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              router.push('/pet/create');
            }}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            style={[fabAnimStyle, fabPressStyle, Shadows.warmGlow, { position: 'absolute', bottom: 110, right: 20 }]}
          >
            <View
              style={{ width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.secondary }}
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </View>
          </AnimatedPressable>
        </SafeAreaView>
      </GradientBackground>
    </View>
  );
}
