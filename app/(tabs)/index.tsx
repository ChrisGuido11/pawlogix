import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { usePets } from '@/lib/pet-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { getRecordTypeLabel, formatDate, calculateAge } from '@/lib/utils';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows } from '@/constants/spacing';
import type { HealthRecord } from '@/types';

function StaggeredCard({ index, children }: { index: number; children: React.ReactNode }) {
  const animStyle = useStaggeredEntrance(index);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

// ---------- Pet Selector Bar ----------
function PetSelectorBar({
  pets,
  activePet,
  onSelect,
  onAdd,
}: {
  pets: any[];
  activePet: any;
  onSelect: (pet: any) => void;
  onAdd: () => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 16, gap: 12, alignItems: 'center' }}
      style={{ marginBottom: 16 }}
    >
      {pets.map((pet) => {
        const isActive = activePet?.id === pet.id;
        return (
          <Pressable
            key={pet.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(pet);
            }}
            style={{ alignItems: 'center', width: 64 }}
          >
            <View
              style={[
                {
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  borderWidth: isActive ? 2.5 : 0,
                  borderColor: isActive ? Colors.primary : 'transparent',
                  padding: isActive ? 2 : 0,
                  marginBottom: 4,
                },
              ]}
            >
              {pet.photo_url ? (
                <Image
                  source={{ uri: pet.photo_url }}
                  style={{
                    width: isActive ? 39 : 48,
                    height: isActive ? 39 : 48,
                    borderRadius: isActive ? 12 : 16,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: isActive ? 39 : 48,
                    height: isActive ? 39 : 48,
                    borderRadius: isActive ? 12 : 16,
                    backgroundColor: Colors.primary100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="paw" size={20} color={Colors.primary} />
                </View>
              )}
            </View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: isActive ? '700' : '500',
                color: isActive ? Colors.primary : Colors.textSecondary,
              }}
              numberOfLines={1}
            >
              {pet.name}
            </Text>
          </Pressable>
        );
      })}

      {/* Add pet circle */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onAdd();
        }}
        style={{ alignItems: 'center', width: 64 }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: Colors.borderLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          <Ionicons name="add" size={22} color={Colors.textTertiary} />
        </View>
        <Text style={{ fontSize: 11, fontWeight: '500', color: Colors.textTertiary }}>
          Add
        </Text>
      </Pressable>
    </ScrollView>
  );
}

// ---------- Record Icon ----------
function RecordIcon({ type }: { type: string }) {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    lab_results: 'flask',
    vet_visit: 'medkit',
    vaccine: 'shield-checkmark',
    prescription: 'document',
    other: 'document-text',
  };

  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.primary50,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={iconMap[type] || 'document-text'} size={20} color={Colors.primary} />
    </View>
  );
}

// ---------- Status Badge ----------
function StatusBadge({ record }: { record: HealthRecord }) {
  if (record.processing_status === 'completed') {
    return <Ionicons name="checkmark-circle" size={22} color={Colors.success} />;
  }
  if (record.processing_status === 'failed') {
    return <Badge label="Failed" variant="urgent" />;
  }
  return <Badge label="Processing" variant="watch" />;
}

// ---------- Home Screen ----------
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePet, pets, setActivePet, isLoading: petsLoading } = usePets();
  const [recentRecords, setRecentRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecent = useCallback(async () => {
    if (!user?.id || !activePet) return;
    try {
      const { data } = await supabase
        .from('pl_health_records')
        .select('*')
        .eq('pet_id', activePet.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setRecentRecords((data ?? []) as HealthRecord[]);
    } catch (error) {
      console.error('Error fetching records:', error);
    }
  }, [user?.id, activePet?.id]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchRecent();
      setIsLoading(false);
    };
    load();
  }, [fetchRecent]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecent();
    setRefreshing(false);
  };

  const greeting = new Date().getHours() < 12
    ? 'Good morning'
    : new Date().getHours() < 18
      ? 'Good afternoon'
      : 'Good evening';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          {/* App header */}
          <StaggeredCard index={0}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Ionicons name="paw" size={28} color={Colors.primary} />
              <Text style={{ fontSize: 32, fontWeight: '800', color: Colors.textPrimary }}>
                PawLogix
              </Text>
            </View>
            <Text style={{ fontSize: 16, color: Colors.textSecondary, marginBottom: 20 }}>
              {greeting}{activePet ? ` \u2014 how's ${activePet.name}?` : ''}
            </Text>
          </StaggeredCard>

          {/* A. Pet Selector Bar */}
          {pets.length > 0 && (
            <StaggeredCard index={1}>
              <PetSelectorBar
                pets={pets}
                activePet={activePet}
                onSelect={setActivePet}
                onAdd={() => router.push('/pet/create')}
              />
            </StaggeredCard>
          )}

          {activePet ? (
            <>
              {/* B. Active Pet Hero Card */}
              <StaggeredCard index={2}>
                <Card
                  onPress={() => router.push(`/pet/${activePet.id}` as any)}
                  variant="elevated"
                  className="mb-5 overflow-hidden"
                >
                  {/* Teal left accent */}
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 12,
                      bottom: 12,
                      width: 3,
                      borderRadius: 2,
                      backgroundColor: Colors.primary,
                    }}
                  />

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginLeft: 4 }}>
                    {activePet.photo_url ? (
                      <View style={[Shadows.md, { borderRadius: 24 }]}>
                        <Image
                          source={{ uri: activePet.photo_url }}
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 20,
                            borderWidth: 2,
                            borderColor: '#FFFFFF',
                          }}
                        />
                      </View>
                    ) : (
                      <View
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 20,
                          backgroundColor: Colors.primary100,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="paw" size={26} color={Colors.primary} />
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary }}>
                        {activePet.name}
                      </Text>
                      <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 2 }}>
                        {activePet.breed ?? activePet.species}
                        {activePet.date_of_birth ? ` \u00B7 ${calculateAge(activePet.date_of_birth)}` : ''}
                      </Text>

                      {/* Quick stats row */}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        {activePet.weight_kg && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary50, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                            <Ionicons name="scale-outline" size={12} color={Colors.primary} />
                            <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.primary }}>{activePet.weight_kg} kg</Text>
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                          <Ionicons name="shield-checkmark-outline" size={12} color={Colors.success} />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.success }}>Active</Text>
                        </View>
                      </View>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                  </View>
                </Card>
              </StaggeredCard>

              {/* C. Primary CTA — Scan a Record */}
              <StaggeredCard index={3}>
                <View style={{ marginBottom: 20 }}>
                  <Button
                    title="Scan a Record"
                    onPress={() => router.push('/record/scan')}
                    icon="camera-outline"
                    size="lg"
                  />
                </View>
              </StaggeredCard>

              {/* D. Recent Activity Cards */}
              <StaggeredCard index={4}>
                <Text
                  style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 12 }}
                >
                  Recent Records
                </Text>
              </StaggeredCard>

              {isLoading ? (
                <View style={{ gap: 10 }}>
                  {[0, 1].map((i) => (
                    <Card key={i}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Skeleton width={40} height={40} className="rounded-xl" />
                        <View style={{ flex: 1, gap: 8 }}>
                          <Skeleton height={16} className="w-3/4" />
                          <Skeleton height={12} className="w-1/2" />
                        </View>
                        <Skeleton width={22} height={22} className="rounded-full" />
                      </View>
                    </Card>
                  ))}
                </View>
              ) : recentRecords.length === 0 ? (
                <Card>
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary50, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <Ionicons name="search-outline" size={28} color={Colors.primary200} />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 }}>
                      No records yet
                    </Text>
                    <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center' }}>
                      Scan your first vet record to get started
                    </Text>
                  </View>
                </Card>
              ) : (
                <View style={{ gap: 10, marginBottom: 20 }}>
                  {recentRecords.map((record, idx) => (
                    <StaggeredCard key={record.id} index={5 + idx}>
                      <Card onPress={() => router.push(`/record/${record.id}` as any)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          {/* Severity accent strip */}
                          <View
                            style={{
                              position: 'absolute',
                              left: -16,
                              top: 8,
                              bottom: 8,
                              width: 3,
                              borderRadius: 2,
                              backgroundColor: record.has_urgent_flags
                                ? Colors.error
                                : record.processing_status === 'completed'
                                  ? Colors.success
                                  : Colors.secondary,
                            }}
                          />
                          <RecordIcon type={record.record_type} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.textPrimary }}>
                              {getRecordTypeLabel(record.record_type)}
                            </Text>
                            <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 2 }}>
                              {formatDate(record.record_date)}
                            </Text>
                          </View>
                          <StatusBadge record={record} />
                        </View>
                      </Card>
                    </StaggeredCard>
                  ))}
                </View>
              )}

              {/* E. Health Snapshot — flagged items alert */}
              {recentRecords.some((r) => r.has_urgent_flags) && (
                <StaggeredCard index={8}>
                  <Card className="mb-5" variant="elevated">
                    <View style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, backgroundColor: Colors.warning }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: 4 }}>
                      <Ionicons name="warning" size={20} color={Colors.warning} />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.textPrimary }}>
                        Attention Needed
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: Colors.textSecondary, marginLeft: 4 }}>
                      Some recent records have flagged items that may need your vet's attention.
                    </Text>
                  </Card>
                </StaggeredCard>
              )}
            </>
          ) : (
            <EmptyState
              icon="paw-outline"
              title="Welcome to PawLogix!"
              subtitle="Add your first pet to get started with AI-powered health insights."
              actionLabel="Add Your Pet"
              onAction={() => router.push('/pet/create')}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
