import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { DisclaimerBanner } from '@/components/ui/disclaimer-banner';
import { GradientBackground } from '@/components/ui/gradient-background';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { supabase } from '@/lib/supabase';
import { getRecordTypeLabel, formatDate, getSeverityColor } from '@/lib/utils';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows } from '@/constants/spacing';
import type { HealthRecord, FlaggedItem } from '@/types';

function StaggeredCard({ index, children }: { index: number; children: React.ReactNode }) {
  const animStyle = useStaggeredEntrance(index);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

function ChevronAnimated({ isExpanded }: { isExpanded: boolean }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 250 });
  }, [isExpanded]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name="chevron-down" size={22} color={Colors.textTertiary} />
    </Animated.View>
  );
}

function PulsingBackground({ color }: { color: string }) {
  const opacity = useSharedValue(0.05);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.12, { duration: 1500 }),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: color,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[animStyle, { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 16 }]}
    />
  );
}

const severityColorMap: Record<string, string> = {
  urgent: Colors.error,
  watch: Colors.warning,
  info: Colors.primary,
  normal: Colors.success,
};

const severityIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  urgent: 'alert-circle',
  watch: 'warning',
  info: 'information-circle',
  normal: 'checkmark-circle',
};

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set([0])
  );

  const fetchRecord = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('pl_health_records')
        .select('*')
        .eq('id', id)
        .single();
      if (data) setRecord(data as HealthRecord);
    } catch (error) {
      console.error('Error fetching record:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const toggleSection = (index: number) => {
    const next = new Set(expandedSections);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedSections(next);
  };

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage
      .from('pl-record-images')
      .getPublicUrl(path);
    return data.publicUrl;
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background px-5 pt-4">
        <View className="flex-row items-center justify-between mb-4">
          <Skeleton width={40} height={40} className="rounded-xl" />
          <Skeleton height={20} className="w-1/3" />
          <Skeleton height={14} className="w-16" />
        </View>
        <View className="flex-row gap-3 mb-5">
          <Skeleton width={200} height={260} className="rounded-xl" />
        </View>
        <Card className="mb-4">
          <Skeleton height={18} className="w-1/4 mb-3" />
          <Skeleton height={14} className="w-full mb-2" />
          <Skeleton height={14} className="w-full mb-2" />
          <Skeleton height={14} className="w-3/4" />
        </Card>
      </SafeAreaView>
    );
  }

  if (!record) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <EmptyState
          icon="alert-circle-outline"
          title="Record not found"
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const interpretation = record.interpretation;

  return (
    <View className="flex-1">
      <GradientBackground variant="warm">
        <SafeAreaView className="flex-1">
          <ScrollView className="flex-1 px-5 pt-4 pb-8">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Pressable
                onPress={() => router.back()}
                style={[Shadows.sm, { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }]}
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
              </Pressable>
              <Text style={{ fontSize: 22, fontWeight: '700', color: Colors.textPrimary }}>
                {getRecordTypeLabel(record.record_type)}
              </Text>
              <Text className="text-sm text-text-secondary">
                {formatDate(record.record_date)}
              </Text>
            </View>

            {/* Image Gallery */}
            {record.image_urls.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-5"
              >
                {record.image_urls.map((url, index) => (
                  <View key={index} style={[Shadows.md, { borderRadius: 12, marginRight: 12 }]}>
                    <Image
                      source={{ uri: getImageUrl(url) }}
                      style={{ width: 200, height: 260, borderRadius: 12 }}
                    />
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Processing States */}
            {record.processing_status === 'pending' ||
            record.processing_status === 'processing' ? (
              <Card className="mb-5 items-center py-8">
                <Ionicons name="hourglass-outline" size={40} color={Colors.primary} />
                <Text className="text-lg font-bold text-text-primary mt-3">
                  Still processing...
                </Text>
                <Text className="text-sm text-text-secondary mt-1">
                  Check back in a moment
                </Text>
                <Button
                  title="Refresh"
                  onPress={fetchRecord}
                  variant="secondary"
                  className="mt-4"
                />
              </Card>
            ) : record.processing_status === 'failed' ? (
              <Card className="mb-5 items-center py-8">
                <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
                <Text className="text-lg font-bold text-text-primary mt-3">
                  Interpretation failed
                </Text>
                <Text className="text-sm text-text-secondary mt-1 text-center">
                  {record.processing_error || 'Something went wrong. Please try again.'}
                </Text>
                <Button title="Retry" onPress={fetchRecord} className="mt-4" />
              </Card>
            ) : interpretation ? (
              <>
                {/* Summary */}
                <StaggeredCard index={0}>
                  <View
                    style={{
                      backgroundColor: Colors.primary50,
                      borderLeftWidth: 4,
                      borderLeftColor: Colors.primary,
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 16,
                      ...Shadows.sm,
                    }}
                  >
                    <Text className="text-lg font-bold text-text-primary mb-2">
                      Summary
                    </Text>
                    <Text className="text-base text-text-primary leading-6">
                      {interpretation.summary}
                    </Text>
                  </View>
                </StaggeredCard>

                {/* Detailed Breakdown */}
                {interpretation.interpreted_sections?.length > 0 && (
                  <View className="mb-4">
                    <Text
                      style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: Colors.textSecondary }}
                      className="uppercase mb-3"
                    >
                      Detailed Breakdown
                    </Text>
                    {interpretation.interpreted_sections.map((section: any, index: number) => {
                      const isExpanded = expandedSections.has(index);
                      return (
                        <StaggeredCard key={index} index={1 + index}>
                          <Card className="mb-2">
                            <Pressable
                              onPress={() => toggleSection(index)}
                              className="flex-row items-center justify-between"
                            >
                              <Text className="text-base font-semibold text-text-primary flex-1 mr-2">
                                {section.title}
                              </Text>
                              <ChevronAnimated isExpanded={isExpanded} />
                            </Pressable>
                            {!isExpanded && section.plain_english_content && (
                              <Text
                                className="text-sm text-text-secondary mt-2"
                                numberOfLines={1}
                              >
                                {section.plain_english_content}
                              </Text>
                            )}
                            {isExpanded && (
                              <Text className="text-base text-text-primary mt-3 leading-6">
                                {section.plain_english_content}
                              </Text>
                            )}
                          </Card>
                        </StaggeredCard>
                      );
                    })}
                  </View>
                )}

                {/* Flagged Items */}
                {interpretation.flagged_items?.length > 0 && (
                  <View className="mb-4">
                    <Text
                      style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: Colors.textSecondary }}
                      className="uppercase mb-3"
                    >
                      Flagged Items
                    </Text>
                    {interpretation.flagged_items.map(
                      (item: FlaggedItem, index: number) => {
                        const borderColor = severityColorMap[item.severity] || Colors.primary;
                        const iconName = severityIconMap[item.severity] || 'information-circle';
                        const isUrgent = item.severity === 'urgent';

                        return (
                          <StaggeredCard key={index} index={5 + index}>
                            <Card className="mb-2 overflow-hidden">
                              {isUrgent && <PulsingBackground color={Colors.error} />}
                              <View style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, backgroundColor: borderColor }} />
                              <View className="flex-row items-center gap-2 mb-2 ml-1">
                                <Ionicons name={iconName} size={18} color={borderColor} />
                                <Badge
                                  label={item.severity.toUpperCase()}
                                  variant={
                                    item.severity === 'urgent'
                                      ? 'urgent'
                                      : item.severity === 'watch'
                                        ? 'watch'
                                        : 'info'
                                  }
                                  size="sm"
                                />
                                <Text className="text-base font-semibold text-text-primary flex-1">
                                  {item.item}
                                </Text>
                              </View>
                              {item.value && (
                                <View className="flex-row items-center gap-2 mb-1 ml-1">
                                  <Text style={{ fontFamily: 'monospace', fontSize: 13, color: Colors.textPrimary }}>
                                    {item.value}
                                  </Text>
                                  <Text className="text-sm text-text-secondary">
                                    (Normal: {item.normal_range})
                                  </Text>
                                </View>
                              )}
                              <Text className="text-base text-text-primary leading-6 ml-1">
                                {item.explanation}
                              </Text>
                            </Card>
                          </StaggeredCard>
                        );
                      }
                    )}
                  </View>
                )}

                {/* Questions for Your Vet */}
                {interpretation.suggested_vet_questions?.length > 0 && (
                  <StaggeredCard index={10}>
                    <Card className="mb-4">
                      <Text className="text-lg font-bold text-text-primary mb-3">
                        Questions for Your Vet
                      </Text>
                      {interpretation.suggested_vet_questions.map(
                        (question: string, index: number) => (
                          <View key={index} className="flex-row gap-2 mb-2">
                            <Text className="text-base text-primary font-bold">
                              {index + 1}.
                            </Text>
                            <Text className="text-base text-text-primary flex-1 leading-6">
                              {question}
                            </Text>
                          </View>
                        )
                      )}
                    </Card>
                  </StaggeredCard>
                )}

                {/* Chat CTA */}
                <StaggeredCard index={11}>
                  <Button
                    title="Ask a Follow-Up Question"
                    onPress={() => router.push(`/record/${id}/chat` as any)}
                    variant="secondary"
                    icon="chatbubble-outline"
                    className="mb-4"
                  />
                </StaggeredCard>
              </>
            ) : null}

            <DisclaimerBanner className="mb-4" />
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    </View>
  );
}
