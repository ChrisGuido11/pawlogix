import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { FilterPills } from '@/components/ui/filter-pills';
import { SectionLabel } from '@/components/ui/section-label';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { usePets } from '@/lib/pet-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useDeleteRecord } from '@/hooks/useDeleteRecord';
import { RecordCard } from '@/components/records/record-card';
import { MedicationCard, LabValueCard, VaccineCard } from '@/components/records/content-cards';
import {
  FILTER_OPTIONS,
  CONTENT_FILTERS,
  FILTER_EMPTY_STATES,
  recordMatchesFilter,
  flattenContentItems,
} from '@/lib/record-filters';
import type { ContentItem } from '@/lib/record-filters';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows, BorderRadius, Spacing } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';
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
  onLongPress,
  onAdd,
}: {
  pets: any[];
  activePet: any;
  onSelect: (pet: any) => void;
  onLongPress: (pet: any) => void;
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
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onLongPress(pet);
            }}
            style={{ alignItems: 'center', width: 64 }}
          >
            <View
              style={[
                {
                  width: 48,
                  height: 48,
                  borderRadius: BorderRadius.card,
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
                    borderRadius: isActive ? BorderRadius.button : BorderRadius.card,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: isActive ? 39 : 48,
                    height: isActive ? 39 : 48,
                    borderRadius: isActive ? BorderRadius.button : BorderRadius.card,
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
            borderRadius: BorderRadius.card,
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

// ---------- Home Screen ----------
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePet, pets, setActivePet, isLoading: petsLoading } = usePets();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('All');

  const isContentFilter = (CONTENT_FILTERS as readonly string[]).includes(activeFilter);

  const filteredRecords = useMemo(() => {
    if (activeFilter === 'All') return records;
    return records.filter((r) => recordMatchesFilter(r, activeFilter));
  }, [records, activeFilter]);

  const contentItems = useMemo(() => {
    if (!isContentFilter) return [];
    return flattenContentItems(records, activeFilter);
  }, [records, activeFilter, isContentFilter]);

  // Reset filter when pet changes
  useEffect(() => {
    setActiveFilter('All');
  }, [activePet?.id]);

  const fetchRecords = useCallback(async () => {
    if (!user?.id || !activePet) return;
    try {
      const { data, error } = await supabase
        .from('pl_health_records')
        .select('*')
        .eq('pet_id', activePet.id)
        .order('record_date', { ascending: false });
      if (error) throw error;
      setRecords((data ?? []) as HealthRecord[]);
      setFetchError(null);
    } catch (error) {
      console.error('Error fetching records:', error);
      setFetchError("Couldn't load records. Pull down to try again.");
    }
  }, [user?.id, activePet?.id]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchRecords();
      setIsLoading(false);
    };
    load();
  }, [fetchRecords]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecords();
    setRefreshing(false);
  };

  const handleDeleteRecord = useDeleteRecord(setRecords);

  const subtitleText = activePet ? `How is ${activePet.name} today?` : '';

  const hasFlaggedItems = records.some((r) => r.has_urgent_flags);

  // Determine which data + renderItem to use for the FlashList
  const listData: (HealthRecord | ContentItem)[] = isContentFilter ? contentItems : filteredRecords;

  const renderItem = useCallback(({ item, index }: { item: HealthRecord | ContentItem; index: number }) => {
    if ('kind' in item) {
      switch (item.kind) {
        case 'medication':
          return <MedicationCard item={item} index={index} />;
        case 'lab_value':
          return <LabValueCard item={item} index={index} />;
        case 'vaccine':
          return <VaccineCard item={item} index={index} />;
      }
    }
    return (
      <RecordCard
        record={item as HealthRecord}
        onPress={() => router.push(`/record/${(item as HealthRecord).id}` as any)}
        onDelete={handleDeleteRecord}
        index={index}
      />
    );
  }, [router, handleDeleteRecord]);

  const keyExtractor = useCallback((item: HealthRecord | ContentItem, index: number) => {
    if ('kind' in item) {
      return `${item.kind}-${item.sourceRecordId}-${item.name}-${index}`;
    }
    return (item as HealthRecord).id;
  }, []);

  // --- Header component for FlashList ---
  const ListHeader = useMemo(() => (
    <View style={{ paddingHorizontal: Spacing.lg }}>
      {/* A. Pet Selector Bar */}
      {pets.length > 0 && (
        <StaggeredCard index={0}>
          <PetSelectorBar
            pets={pets}
            activePet={activePet}
            onSelect={setActivePet}
            onLongPress={(pet) => router.push(`/pet/${pet.id}` as any)}
            onAdd={() => router.push('/pet/create')}
          />
        </StaggeredCard>
      )}

      {fetchError && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            backgroundColor: Colors.errorLight,
            borderRadius: BorderRadius.button,
            padding: Spacing.md,
            marginBottom: Spacing.lg,
          }}
        >
          <Ionicons name="alert-circle" size={20} color={Colors.error} />
          <Text style={[Typography.secondary, { color: Colors.error, flex: 1 }]}>
            {fetchError}
          </Text>
        </View>
      )}

      {activePet && (
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
                      paddingVertical: Spacing.md,
                      borderRadius: BorderRadius.pill,
                      flexDirection: 'row',
                      alignItems: 'center',
                      alignSelf: 'flex-start',
                      gap: Spacing.sm,
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

          {/* C. Flagged items alert */}
          {hasFlaggedItems && (
            <StaggeredCard index={2}>
              <Card style={{ marginBottom: Spacing.lg }} variant="elevated">
                <View style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, backgroundColor: Colors.warning }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm, marginLeft: Spacing.xs }}>
                  <Ionicons name="warning" size={20} color={Colors.warning} />
                  <Text style={[Typography.buttonPrimary, { color: Colors.textHeading }]}>
                    Attention Needed
                  </Text>
                </View>
                <Text style={[Typography.secondary, { color: Colors.textBody, marginLeft: Spacing.xs }]}>
                  Some records have flagged items that may need your vet's attention.
                </Text>
              </Card>
            </StaggeredCard>
          )}

          {/* D. Records section label with count */}
          <StaggeredCard index={3}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
              <SectionLabel style={{ marginTop: 0, marginBottom: 0 }}>Records</SectionLabel>
              {records.length > 0 && (
                <Badge label={`${records.length}`} variant="primary" size="sm" />
              )}
            </View>
          </StaggeredCard>
        </>
      )}
    </View>
  ), [pets, activePet, fetchError, hasFlaggedItems, records.length, router, setActivePet]);

  // --- Empty component ---
  const ListEmpty = useMemo(() => {
    if (isLoading) return null;

    if (isContentFilter) {
      return (
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <EmptyState
            illustration={require('@/assets/illustrations/mascot-confused.png')}
            icon="document-text-outline"
            title={FILTER_EMPTY_STATES[activeFilter]?.title ?? `No ${activeFilter.toLowerCase()} found`}
            subtitle={FILTER_EMPTY_STATES[activeFilter]?.subtitle ?? 'Try selecting a different filter.'}
          />
        </View>
      );
    }

    if (activeFilter !== 'All') {
      return (
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <EmptyState
            illustration={require('@/assets/illustrations/mascot-confused.png')}
            icon="document-text-outline"
            title={`No ${activeFilter.toLowerCase()} found`}
            subtitle="Try selecting a different filter."
          />
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: Spacing.lg }}>
        <EmptyState
          illustration={require('@/assets/illustrations/mascot-sleeping.png')}
          icon="document-text-outline"
          title="No records yet"
          subtitle={`Scan ${activePet?.name ?? 'your pet'}'s first vet record to get started.`}
          actionLabel="Scan a Record"
          onAction={() => router.push('/record/scan')}
        />
      </View>
    );
  }, [isLoading, isContentFilter, activeFilter, activePet?.name, router]);

  // --- No pets state ---
  if (!petsLoading && pets.length === 0) {
    return (
      <CurvedHeaderPage
        headerProps={{
          title: 'Welcome back! 👋',
          subtitle: '',
        }}
        contentStyle={{ paddingHorizontal: 0 }}
      >
        <View style={{ flex: 1, paddingHorizontal: Spacing.lg }}>
          <EmptyState
            illustration={require('@/assets/illustrations/mascot-welcome.png')}
            icon="paw-outline"
            title="Welcome to PawLogix!"
            subtitle="Scan vet records, get AI-powered health insights, and keep track of your pet's care. Add a pet whenever you're ready!"
            actionLabel="Add a Pet"
            onAction={() => router.push('/pet/create')}
          />
        </View>
      </CurvedHeaderPage>
    );
  }

  // --- Loading skeleton ---
  if (isLoading && records.length === 0) {
    return (
      <CurvedHeaderPage
        headerProps={{
          title: 'Welcome back! 👋',
          subtitle: subtitleText,
        }}
        contentStyle={{ paddingHorizontal: 0 }}
      >
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm }}>
          {pets.length > 0 && (
            <PetSelectorBar
              pets={pets}
              activePet={activePet}
              onSelect={setActivePet}
              onLongPress={(pet) => router.push(`/pet/${pet.id}` as any)}
              onAdd={() => router.push('/pet/create')}
            />
          )}
          {[0, 1, 2].map((i) => (
            <Card key={i} style={{ marginBottom: Spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
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
      </CurvedHeaderPage>
    );
  }

  return (
    <CurvedHeaderPage
      headerProps={{
        title: 'Welcome back! 👋',
        subtitle: subtitleText,
        children: activePet ? (
          <FilterPills
            options={[...FILTER_OPTIONS]}
            selected={activeFilter}
            onSelect={setActiveFilter}
          />
        ) : undefined,
      }}
      contentStyle={{ paddingHorizontal: 0 }}
    >
      <View style={{ flex: 1 }}>
        <FlashList
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: Spacing.lg }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        />
      </View>
    </CurvedHeaderPage>
  );
}
