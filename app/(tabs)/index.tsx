import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { GradientBackground } from '@/components/ui/gradient-background';
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

function RecordIcon({ type }: { type: string }) {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    lab_results: 'flask',
    vet_visit: 'medkit',
    vaccine: 'shield-checkmark',
    prescription: 'document',
    other: 'document-text',
  };
  return (
    <LinearGradient
      colors={[...Gradients.primaryCta]}
      style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name={iconMap[type] || 'document-text'} size={20} color="#FFFFFF" />
    </LinearGradient>
  );
}

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
    <View className="flex-1">
      <GradientBackground variant="warm">
        <SafeAreaView className="flex-1">
          <ScrollView
            className="flex-1 px-5 pt-4 pb-8"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D7377" />
            }
          >
            <StaggeredCard index={0}>
              <View className="flex-row items-center gap-2.5 mb-1">
                <Ionicons name="paw" size={32} color={Colors.primary} />
                <Text style={{ fontSize: 36, fontWeight: '800', color: Colors.textPrimary }}>
                  PawLogix
                </Text>
              </View>
              <Text className="text-base text-text-secondary mb-6">
                {new Date().getHours() < 12
                  ? 'Good morning'
                  : new Date().getHours() < 18
                    ? 'Good afternoon'
                    : 'Good evening'}
                {activePet ? ` — how's ${activePet.name}?` : ''}
              </Text>
            </StaggeredCard>

            {activePet ? (
              <>
                {/* Active Pet Hero Card */}
                <StaggeredCard index={1}>
                  <Card
                    onPress={() => router.push(`/pet/${activePet.id}` as any)}
                    variant="elevated"
                    className="mb-5 overflow-hidden"
                  >
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4 }}>
                      <LinearGradient
                        colors={[...Gradients.primaryCta]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ height: 4 }}
                      />
                    </View>
                    <View className="flex-row items-center gap-4 pt-1">
                      {activePet.photo_url ? (
                        <View style={[Shadows.md, { borderRadius: 32 }]}>
                          <Image
                            source={{ uri: activePet.photo_url }}
                            style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#FFFFFF' }}
                          />
                        </View>
                      ) : (
                        <LinearGradient
                          colors={[...Gradients.primaryCta]}
                          style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Ionicons name="paw" size={28} color="#FFFFFF" />
                        </LinearGradient>
                      )}
                      <View className="flex-1">
                        <Text className="text-xl font-bold text-text-primary">
                          {activePet.name}
                        </Text>
                        <Text className="text-sm text-text-secondary mt-0.5">
                          {activePet.breed ?? activePet.species}
                          {activePet.date_of_birth ? ` · ${calculateAge(activePet.date_of_birth)}` : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                    </View>
                  </Card>
                </StaggeredCard>

                {/* Scan CTA */}
                <StaggeredCard index={2}>
                  <View className="py-1 mb-4">
                    <Button
                      title="Scan a Record"
                      onPress={() => router.push('/record/scan')}
                      icon="scan-outline"
                    />
                  </View>
                </StaggeredCard>

                {/* Recent Records */}
                <StaggeredCard index={3}>
                  <Text
                    style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: Colors.textSecondary }}
                    className="uppercase mb-3"
                  >
                    Recent Records
                  </Text>
                </StaggeredCard>

                {isLoading ? (
                  <View className="gap-3">
                    {[0, 1].map((i) => (
                      <Card key={i}>
                        <View className="flex-row items-center gap-3">
                          <Skeleton width={40} height={40} className="rounded-xl" />
                          <View className="flex-1 gap-2">
                            <Skeleton height={16} className="w-3/4" />
                            <Skeleton height={12} className="w-1/2" />
                          </View>
                          <Skeleton width={60} height={24} className="rounded-full" />
                        </View>
                      </Card>
                    ))}
                  </View>
                ) : recentRecords.length === 0 ? (
                  <Card>
                    <View className="items-center py-6">
                      <Ionicons name="document-text-outline" size={40} color={Colors.primary200} />
                      <Text className="text-sm text-text-secondary mt-2 text-center">
                        Scan your first record to get started
                      </Text>
                    </View>
                  </Card>
                ) : (
                  <View className="gap-3 mb-5">
                    {recentRecords.map((record, idx) => (
                      <StaggeredCard key={record.id} index={4 + idx}>
                        <Card onPress={() => router.push(`/record/${record.id}` as any)}>
                          <View className="flex-row items-center gap-3">
                            <View style={{ borderLeftWidth: 3, borderLeftColor: record.has_urgent_flags ? Colors.error : record.processing_status === 'completed' ? Colors.success : Colors.primary, borderRadius: 2, position: 'absolute', left: -16, top: 8, bottom: 8 }} />
                            <RecordIcon type={record.record_type} />
                            <View className="flex-1">
                              <Text className="text-base font-semibold text-text-primary">
                                {getRecordTypeLabel(record.record_type)}
                              </Text>
                              <Text className="text-sm text-text-secondary">
                                {formatDate(record.record_date)}
                              </Text>
                            </View>
                            {record.processing_status === 'completed' ? (
                              <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                            ) : (
                              <Badge
                                label={record.processing_status}
                                variant="primary"
                              />
                            )}
                          </View>
                        </Card>
                      </StaggeredCard>
                    ))}
                  </View>
                )}

                {/* Health Snapshot */}
                {recentRecords.some((r) => r.has_urgent_flags) && (
                  <StaggeredCard index={7}>
                    <Card className="mb-5" variant="elevated">
                      <View style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, backgroundColor: Colors.warning }} />
                      <View className="flex-row items-center gap-2 mb-2 ml-1">
                        <Ionicons name="warning" size={20} color={Colors.warning} />
                        <Text className="text-base font-bold text-text-primary">
                          Attention Needed
                        </Text>
                      </View>
                      <Text className="text-sm text-text-secondary ml-1">
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
      </GradientBackground>
    </View>
  );
}
