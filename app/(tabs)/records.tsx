import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { usePets } from '@/lib/pet-context';
import { useAuth } from '@/lib/auth-context';
import { getRecordTypeLabel, formatDate } from '@/lib/utils';
import type { HealthRecord } from '@/types';

const statusVariant = (status: string) => {
  switch (status) {
    case 'completed': return 'success' as const;
    case 'failed': return 'urgent' as const;
    case 'processing': return 'watch' as const;
    default: return 'primary' as const;
  }
};

function RecordCard({ record, onPress }: { record: HealthRecord; onPress: () => void }) {
  return (
    <Card onPress={onPress} className="mb-3">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center">
          <Ionicons name="document-text" size={20} color="#0D7377" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-medium text-text-primary">
              {getRecordTypeLabel(record.record_type)}
            </Text>
            {record.flagged_items_count > 0 && (
              <Badge
                label={`${record.flagged_items_count} flagged`}
                variant={record.has_urgent_flags ? 'urgent' : 'watch'}
              />
            )}
          </View>
          <Text className="text-sm text-text-secondary">{formatDate(record.record_date)}</Text>
          {record.interpretation?.summary && (
            <Text className="text-sm text-text-secondary mt-1" numberOfLines={1}>
              {record.interpretation.summary}
            </Text>
          )}
        </View>
        <Badge label={record.processing_status} variant={statusVariant(record.processing_status)} />
      </View>
    </Card>
  );
}

export default function RecordsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePet } = usePets();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      <SafeAreaView className="flex-1 bg-background px-4 pt-4">
        <Text className="text-3xl font-bold text-text-primary mb-6">Records</Text>
        <Skeleton height={80} className="mb-3 w-full" />
        <Skeleton height={80} className="mb-3 w-full" />
        <Skeleton height={80} className="w-full" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4 pt-4">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-3xl font-bold text-text-primary">Records</Text>
          {activePet && (
            <Badge label={activePet.name} variant="primary" />
          )}
        </View>

        {records.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No records yet"
            subtitle="Scan your pet's vet records to get AI-powered health insights."
            actionLabel="Scan a Record"
            onAction={() => router.push('/record/scan')}
          />
        ) : (
          <FlashList
            data={records}
            renderItem={({ item }) => (
              <RecordCard
                record={item}
                onPress={() => router.push(`/record/${item.id}` as any)}
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
        onPress={() => router.push('/record/scan')}
        className="absolute bottom-24 right-5 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <Ionicons name="scan" size={24} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}
