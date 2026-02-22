import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { FilterPills } from '@/components/ui/filter-pills';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import { supabase } from '@/lib/supabase';
import { usePets } from '@/lib/pet-context';
import { useAuth } from '@/lib/auth-context';
import { getRecordTypeLabel, formatDate } from '@/lib/utils';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows } from '@/constants/spacing';
import type { HealthRecord } from '@/types';

const FILTER_OPTIONS = ['All', 'Lab Results', 'Vet Records', 'Prescriptions'] as const;
const FILTER_MAP: Record<string, string | null> = {
  'All': null,
  'Lab Results': 'lab_results',
  'Vet Records': 'vet_visit',
  'Prescriptions': 'prescription',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const severityColor = (record: HealthRecord) => {
  if (record.has_urgent_flags) return Colors.error;
  if (record.flagged_items_count > 0) return Colors.warning;
  return Colors.primary;
};

const recordIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  lab_results: 'flask',
  vet_visit: 'medkit',
  vaccine: 'shield-checkmark',
  prescription: 'document',
  other: 'document-text',
};

function RecordCard({ record, onPress, index }: { record: HealthRecord; onPress: () => void; index: number }) {
  const animStyle = useStaggeredEntrance(index);

  return (
    <Animated.View style={animStyle}>
      <Card onPress={onPress} className="mb-3">
        <View className="flex-row items-center gap-3">
          {/* Severity accent strip */}
          <View style={{
            position: 'absolute',
            left: -16,
            top: 8,
            bottom: 8,
            width: 3,
            borderRadius: 2,
            backgroundColor: severityColor(record),
          }} />

          {/* Gradient icon */}
          <LinearGradient
            colors={[...Gradients.primaryCta]}
            style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={recordIconMap[record.record_type] || 'document-text'} size={20} color="#FFFFFF" />
          </LinearGradient>

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.textHeading }}>
                {getRecordTypeLabel(record.record_type)}
              </Text>
              {record.flagged_items_count > 0 && (
                <Badge
                  label={`${record.flagged_items_count} flagged`}
                  variant={record.has_urgent_flags ? 'urgent' : 'watch'}
                  size="sm"
                />
              )}
            </View>
            <Text style={{ fontSize: 14, color: Colors.textBody }}>{formatDate(record.record_date)}</Text>
            {record.interpretation?.summary && (
              <Text style={{ fontSize: 14, color: Colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                {record.interpretation.summary}
              </Text>
            )}
          </View>

          {record.processing_status === 'completed' ? (
            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
          ) : (
            <Badge label={record.processing_status} variant={record.processing_status === 'failed' ? 'urgent' : 'primary'} />
          )}
        </View>
      </Card>
    </Animated.View>
  );
}

export default function RecordsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePet } = usePets();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const fabScale = useSharedValue(0);
  const { onPressIn, onPressOut, animatedStyle: fabPressStyle } = usePressAnimation(0.9);

  useEffect(() => {
    fabScale.value = withDelay(500, withSpring(1, { damping: 12, stiffness: 150 }));
  }, []);

  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const filteredRecords = useMemo(() => {
    const type = FILTER_MAP[activeFilter];
    if (!type) return records;
    return records.filter((r) => r.record_type === type);
  }, [records, activeFilter]);
  const fetchRecords = useCallback(async () => {
    if (!user?.id) return;
    try {
      let query = supabase
        .from('pl_health_records')
        .select('*')
        .eq('user_id', user.id)
        .order('record_date', { ascending: false });

      if (activePet) {
        query = query.eq('pet_id', activePet.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords((data ?? []) as HealthRecord[]);
    } catch (error) {
      console.error('Error fetching records:', error);
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

  if (isLoading) {
    return (
      <CurvedHeaderPage
        headerProps={{ title: 'Health Records' }}
        contentStyle={{ paddingHorizontal: 0 }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {[0, 1, 2].map((i) => (
            <Card key={i} className="mb-3">
              <View className="flex-row items-center gap-3">
                <Skeleton width={40} height={40} className="rounded-xl" />
                <View className="flex-1 gap-2">
                  <Skeleton height={16} className="w-3/4" />
                  <Skeleton height={12} className="w-1/2" />
                </View>
                <Skeleton width={22} height={22} className="rounded-full" />
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
        title: 'Health Records',
        children: (
          <FilterPills
            options={[...FILTER_OPTIONS]}
            selected={activeFilter}
            onSelect={setActiveFilter}
          />
        ),
      }}
      contentStyle={{ paddingHorizontal: 0 }}
    >
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {activePet && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Badge label={activePet.name} variant="primary" />
          </View>
        )}

        {filteredRecords.length === 0 ? (
          <EmptyState
            illustration={activeFilter === 'All' ? require('@/assets/illustrations/mascot-confused.png') : undefined}
            icon="document-text-outline"
            title={activeFilter === 'All' ? 'No records yet' : `No ${activeFilter.toLowerCase()} found`}
            subtitle={activeFilter === 'All' ? "Scan your pet's vet records to get AI-powered health insights." : 'Try selecting a different filter.'}
            actionLabel={activeFilter === 'All' ? 'Scan a Record' : undefined}
            onAction={activeFilter === 'All' ? () => router.push('/record/scan') : undefined}
          />
        ) : (
          <FlashList
            data={filteredRecords}
            renderItem={({ item, index }) => (
              <RecordCard
                record={item}
                onPress={() => router.push(`/record/${item.id}` as any)}
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

      <AnimatedPressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          router.push('/record/scan');
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[fabAnimStyle, fabPressStyle, Shadows.primaryButton, { position: 'absolute', bottom: 110, right: 20 }]}
      >
        <View
          style={{ width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary }}
        >
          <Ionicons name="scan" size={24} color="#FFFFFF" />
        </View>
      </AnimatedPressable>
    </CurvedHeaderPage>
  );
}
