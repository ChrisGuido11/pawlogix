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
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { usePets } from '@/lib/pet-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { getRecordTypeLabel, formatDate, calculateAge } from '@/lib/utils';
import { useDeleteRecord } from '@/hooks/useDeleteRecord';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows, BorderRadius, Spacing } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';
import { SectionLabel } from '@/components/ui/section-label';
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
      contentContainerStyle={{ paddingRight: Spacing.lg, gap: Spacing.md, alignItems: 'center' }}
      style={{ marginBottom: Spacing.lg }}
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
                  marginBottom: Spacing.xs,
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
              style={[
                Typography.caption,
                {
                  fontFamily: isActive ? Fonts.bold : Fonts.medium,
                  color: isActive ? Colors.primary : Colors.textBody,
                },
              ]}
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
        <Text style={[Typography.caption, { color: Colors.textMuted }]}>
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
        borderRadius: BorderRadius.button,
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

  const handleDeleteRecord = useDeleteRecord(setRecentRecords);

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
      }}
      contentStyle={{ paddingHorizontal: 0 }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100 }}
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
                style={{ marginBottom: Spacing['2xl'] }}
              >
                <LinearGradient
                  colors={Gradients.primaryCta}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    {
                      borderRadius: BorderRadius.heroCard,
                      padding: Spacing.xl,
                      flexDirection: 'row',
                      alignItems: 'center',
                      overflow: 'hidden',
                    },
                    Shadows.lg,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.sectionHeading, { color: Colors.textOnPrimary, marginBottom: Spacing.xs }]}>
                      Scan your pet's
                    </Text>
                    <Text style={[Typography.sectionHeading, { color: Colors.textOnPrimary, marginBottom: Spacing.md }]}>
                      vet record!
                    </Text>
                    <View
                      style={{
                        backgroundColor: Colors.surface,
                        paddingHorizontal: Spacing['2xl'],
                        paddingVertical: 10,
                        borderRadius: BorderRadius.pill,
                        flexDirection: 'row',
                        alignItems: 'center',
                        alignSelf: 'flex-start',
                        gap: 6,
                      }}
                    >
                      <Text style={[Typography.secondary, { fontFamily: Fonts.semiBold, color: Colors.primary }]}>
                        Scan Now
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                    </View>
                  </View>

                  <View style={{ width: 110, height: 110, borderRadius: 55, overflow: 'hidden' }}>
                    <Image
                      source={require('@/assets/illustrations/mascot-stethoscope.png')}
                      style={{ width: 110, height: 110 }}
                      contentFit="cover"
                    />
                  </View>
                </LinearGradient>
              </Pressable>
            </StaggeredCard>

            {/* D. Recent Records */}
            <StaggeredCard index={2}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
                <SectionLabel style={{ marginTop: 0, marginBottom: 0 }}>Recent Records</SectionLabel>
                {recentRecords.length > 0 && (
                  <Pressable onPress={() => router.push('/(tabs)/records' as any)}>
                    <Text style={[Typography.secondary, { fontFamily: Fonts.semiBold, color: Colors.primary }]}>See all</Text>
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
                <View style={{ alignItems: 'center', paddingVertical: Spacing['2xl'] }}>
                  <View style={{ width: 120, height: 120, borderRadius: 60, overflow: 'hidden', marginBottom: Spacing.md }}>
                    <Image
                      source={require('@/assets/illustrations/mascot-confused.png')}
                      style={{ width: 120, height: 120 }}
                      contentFit="cover"
                    />
                  </View>
                  <Text style={[Typography.body, { fontFamily: Fonts.semiBold, color: Colors.textHeading, marginBottom: Spacing.xs }]}>
                    No records yet
                  </Text>
                  <Text style={[Typography.secondary, { color: Colors.textBody, textAlign: 'center' }]}>
                    Scan your first vet record to get started
                  </Text>
                </View>
              </Card>
            ) : (
              <View style={{ marginBottom: Spacing['2xl'] }}>
                {recentRecords.map((record, idx) => (
                  <StaggeredCard key={record.id} index={3 + idx}>
                    <SwipeableRow onDelete={() => handleDeleteRecord(record)}>
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
                            <Text style={[Typography.buttonPrimary, { fontFamily: Fonts.semiBold, color: Colors.textHeading }]}>
                              {getRecordTypeLabel(record.record_type)}
                            </Text>
                            <Text style={[Typography.secondary, { color: Colors.textBody, marginTop: 2 }]}>
                              {formatDate(record.record_date)}
                            </Text>
                          </View>
                          <StatusBadge record={record} />
                        </View>
                      </Card>
                    </SwipeableRow>
                  </StaggeredCard>
                ))}
              </View>
            )}

            {/* E. Health Snapshot — stat tiles */}
            <StaggeredCard index={6}>
              <SectionLabel style={{ marginBottom: Spacing.md }}>Health Snapshot</SectionLabel>
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: Colors.primaryLight,
                    borderRadius: BorderRadius.statTile,
                    padding: Spacing.lg,
                  }}
                >
                  <Ionicons name="scale-outline" size={20} color={Colors.primary} style={{ marginBottom: Spacing.sm }} />
                  <Text style={[Typography.caption, { color: Colors.textMuted, marginBottom: 2 }]}>Weight</Text>
                  <Text style={[Typography.sectionHeading, { color: Colors.textHeading }]}>
                    {activePet.weight_kg ? `${activePet.weight_kg} kg` : '—'}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: Colors.primaryLight,
                    borderRadius: BorderRadius.statTile,
                    padding: Spacing.lg,
                  }}
                >
                  <Ionicons name="calendar-outline" size={20} color={Colors.primary} style={{ marginBottom: Spacing.sm }} />
                  <Text style={[Typography.caption, { color: Colors.textMuted, marginBottom: 2 }]}>Recent</Text>
                  <Text style={[Typography.sectionHeading, { color: Colors.textHeading }]}>
                    {recentRecords.length}
                  </Text>
                </View>
              </View>
            </StaggeredCard>

            {/* F. Flagged items alert */}
            {recentRecords.some((r) => r.has_urgent_flags) && (
              <StaggeredCard index={7}>
                <Card style={{ marginTop: Spacing.xl }} variant="elevated">
                  <View style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, backgroundColor: Colors.warning }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm, marginLeft: Spacing.xs }}>
                    <Ionicons name="warning" size={20} color={Colors.warning} />
                    <Text style={[Typography.buttonPrimary, { color: Colors.textHeading }]}>
                      Attention Needed
                    </Text>
                  </View>
                  <Text style={[Typography.secondary, { color: Colors.textBody, marginLeft: Spacing.xs }]}>
                    Some recent records have flagged items that may need your vet's attention.
                  </Text>
                </Card>
              </StaggeredCard>
            )}
          </>
        ) : (
          <EmptyState
            illustration={require('@/assets/illustrations/mascot-welcome.png')}
            icon="paw-outline"
            title="Welcome to PawLogix!"
            subtitle="Scan vet records, get AI-powered health insights, and keep track of your pet's care. Add a pet whenever you're ready!"
            actionLabel="Add a Pet"
            onAction={() => router.push('/pet/create')}
          />
        )}
      </ScrollView>
    </CurvedHeaderPage>
  );
}
