import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
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
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { usePets } from '@/lib/pet-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { getRecordTypeLabel, formatDate, calculateAge } from '@/lib/utils';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows, BorderRadius } from '@/constants/spacing';
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
                    backgroundColor: Colors.primaryLight,
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
                color: isActive ? Colors.primary : Colors.textBody,
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
            borderColor: Colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          <Ionicons name="add" size={22} color={Colors.textMuted} />
        </View>
        <Text style={{ fontSize: 11, fontWeight: '500', color: Colors.textMuted }}>
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
        backgroundColor: Colors.primaryLight,
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

  const subtitleText = activePet ? `How is ${activePet.name} today?` : '';

  return (
    <CurvedHeaderPage
      headerProps={{
        title: `Welcome back! 👋`,
        subtitle: subtitleText,
        rightIcon: 'notifications-outline',
        onRightPress: () => {},
      }}
      contentStyle={{ paddingHorizontal: 0 }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* A. Pet Selector Bar */}
        {pets.length > 0 && (
          <StaggeredCard index={0}>
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
            {/* B. Hero CTA Card — Scan a Record */}
            <StaggeredCard index={1}>
              <Pressable
                onPress={() => router.push('/record/scan')}
                style={{ marginBottom: 20 }}
              >
                <LinearGradient
                  colors={Gradients.primaryCta}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    {
                      borderRadius: BorderRadius.heroCard,
                      padding: 20,
                      flexDirection: 'row',
                      alignItems: 'center',
                      overflow: 'hidden',
                    },
                    Shadows.lg,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textOnPrimary, marginBottom: 4 }}>
                      Scan your pet's
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textOnPrimary, marginBottom: 12 }}>
                      vet record!
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#FFFFFF',
                        paddingHorizontal: 24,
                        paddingVertical: 10,
                        borderRadius: BorderRadius.pill,
                        flexDirection: 'row',
                        alignItems: 'center',
                        alignSelf: 'flex-start',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.primary }}>
                        Scan Now
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                    </View>
                  </View>

                  <Image
                    source={require('@/assets/illustrations/mascot-stethoscope.png')}
                    style={{ width: 110, height: 110 }}
                    contentFit="contain"
                  />
                </LinearGradient>
              </Pressable>
            </StaggeredCard>

            {/* C. Active Pet Card */}
            <StaggeredCard index={2}>
              <Card
                onPress={() => router.push(`/pet/${activePet.id}` as any)}
                variant="elevated"
                style={{ marginBottom: 20 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  {activePet.photo_url ? (
                    <View style={[Shadows.md, { borderRadius: 32 }]}>
                      <Image
                        source={{ uri: activePet.photo_url }}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 32,
                          borderWidth: 2,
                          borderColor: Colors.primaryLight,
                        }}
                      />
                    </View>
                  ) : (
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: Colors.primaryLight,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="paw" size={28} color={Colors.primary} />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.textHeading }}>
                      {activePet.name}
                    </Text>
                    <Text style={{ fontSize: 14, color: Colors.textBody, marginTop: 2 }}>
                      {activePet.breed ?? activePet.species}
                      {activePet.date_of_birth ? ` · ${calculateAge(activePet.date_of_birth)}` : ''}
                    </Text>

                    {/* Quick stats row */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      {activePet.weight_kg && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.pill }}>
                          <Ionicons name="scale-outline" size={12} color={Colors.primary} />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.primary }}>{activePet.weight_kg} kg</Text>
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.pill }}>
                        <Ionicons name="shield-checkmark-outline" size={12} color={Colors.success} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.success }}>Active</Text>
                      </View>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </View>
              </Card>
            </StaggeredCard>

            {/* D. Recent Records */}
            <StaggeredCard index={3}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text
                  style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: Colors.textMuted, textTransform: 'uppercase' }}
                >
                  Recent Records
                </Text>
                {recentRecords.length > 0 && (
                  <Pressable onPress={() => router.push('/(tabs)/records' as any)}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary }}>See all</Text>
                  </Pressable>
                )}
              </View>
            </StaggeredCard>

            {isLoading ? (
              <View style={{ gap: 10 }}>
                {[0, 1].map((i) => (
                  <Card key={i}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Skeleton width={40} height={40} />
                      <View style={{ flex: 1, gap: 8 }}>
                        <Skeleton height={16} width="75%" />
                        <Skeleton height={12} width="50%" />
                      </View>
                      <Skeleton width={22} height={22} />
                    </View>
                  </Card>
                ))}
              </View>
            ) : recentRecords.length === 0 ? (
              <Card>
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  {/* TODO: Replace with 3D mascot illustration — mascot-confused.png */}
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Ionicons name="search-outline" size={28} color={Colors.primary} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.textHeading, marginBottom: 4 }}>
                    No records yet
                  </Text>
                  <Text style={{ fontSize: 14, color: Colors.textBody, textAlign: 'center' }}>
                    Scan your first vet record to get started
                  </Text>
                </View>
              </Card>
            ) : (
              <View style={{ gap: 10, marginBottom: 20 }}>
                {recentRecords.map((record, idx) => (
                  <StaggeredCard key={record.id} index={4 + idx}>
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
                          <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.textHeading }}>
                            {getRecordTypeLabel(record.record_type)}
                          </Text>
                          <Text style={{ fontSize: 14, color: Colors.textBody, marginTop: 2 }}>
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

            {/* E. Health Snapshot — stat tiles */}
            <StaggeredCard index={7}>
              <Text
                style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 12 }}
              >
                Health Snapshot
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: Colors.primaryLight,
                    borderRadius: BorderRadius.statTile,
                    padding: 16,
                  }}
                >
                  <Ionicons name="scale-outline" size={20} color={Colors.primary} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 2 }}>Weight</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textHeading }}>
                    {activePet.weight_kg ? `${activePet.weight_kg} kg` : '—'}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: Colors.primaryLight,
                    borderRadius: BorderRadius.statTile,
                    padding: 16,
                  }}
                >
                  <Ionicons name="calendar-outline" size={20} color={Colors.primary} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 2 }}>Records</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textHeading }}>
                    {recentRecords.length}
                  </Text>
                </View>
              </View>
            </StaggeredCard>

            {/* F. Flagged items alert */}
            {recentRecords.some((r) => r.has_urgent_flags) && (
              <StaggeredCard index={8}>
                <Card style={{ marginTop: 20 }} variant="elevated">
                  <View style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, backgroundColor: Colors.warning }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: 4 }}>
                    <Ionicons name="warning" size={20} color={Colors.warning} />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.textHeading }}>
                      Attention Needed
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: Colors.textBody, marginLeft: 4 }}>
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
    </CurvedHeaderPage>
  );
}
