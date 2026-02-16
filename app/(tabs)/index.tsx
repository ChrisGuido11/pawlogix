import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { usePets } from '@/lib/pet-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { getRecordTypeLabel, formatDate, calculateAge } from '@/lib/utils';
import type { HealthRecord } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePet, pets } = usePets();
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4 pt-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D7377" />
        }
      >
        <Text className="text-3xl font-bold text-text-primary mb-6">PawLogix</Text>

        {activePet ? (
          <>
            {/* Active Pet Card */}
            <Card
              onPress={() => router.push(`/pet/${activePet.id}` as any)}
              className="mb-5"
            >
              <View className="flex-row items-center gap-3">
                {activePet.photo_url ? (
                  <Image
                    source={{ uri: activePet.photo_url }}
                    style={{ width: 56, height: 56, borderRadius: 28 }}
                  />
                ) : (
                  <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center">
                    <Ionicons name="paw" size={28} color="#0D7377" />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-text-primary">
                    {activePet.name}
                  </Text>
                  <Text className="text-sm text-text-secondary">
                    {activePet.breed ?? activePet.species}
                    {activePet.date_of_birth ? ` · ${calculateAge(activePet.date_of_birth)}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748B" />
              </View>
            </Card>

            {/* Scan CTA */}
            <Button
              title="Scan a Record"
              onPress={() => router.push('/record/scan')}
              className="mb-5"
            />

            {/* Recent Records */}
            <Text className="text-xl font-semibold text-text-primary mb-3">
              Recent Records
            </Text>

            {isLoading ? (
              <View className="gap-3">
                <Skeleton height={70} className="w-full" />
                <Skeleton height={70} className="w-full" />
              </View>
            ) : recentRecords.length === 0 ? (
              <Card className="mb-5">
                <View className="items-center py-6">
                  <Ionicons name="document-text-outline" size={40} color="#D1D5DB" />
                  <Text className="text-sm text-text-secondary mt-2 text-center">
                    Scan your first record to get started
                  </Text>
                </View>
              </Card>
            ) : (
              <View className="gap-3 mb-5">
                {recentRecords.map((record) => (
                  <Card
                    key={record.id}
                    onPress={() => router.push(`/record/${record.id}` as any)}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center">
                        <Ionicons name="document-text" size={20} color="#0D7377" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-medium text-text-primary">
                          {getRecordTypeLabel(record.record_type)}
                        </Text>
                        <Text className="text-sm text-text-secondary">
                          {formatDate(record.record_date)}
                        </Text>
                      </View>
                      <Badge
                        label={record.processing_status}
                        variant={record.processing_status === 'completed' ? 'success' : 'primary'}
                      />
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* Health Snapshot */}
            {recentRecords.some((r) => r.has_urgent_flags) && (
              <Card className="mb-5 border-warning">
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="warning-outline" size={20} color="#FF9800" />
                  <Text className="text-base font-semibold text-text-primary">
                    Attention Needed
                  </Text>
                </View>
                <Text className="text-sm text-text-secondary">
                  Some recent records have flagged items that may need your vet's attention.
                </Text>
              </Card>
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
  );
}
