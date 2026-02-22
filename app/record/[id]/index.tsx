import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { supabase } from '@/lib/supabase';
import { getRecordTypeLabel, formatDate } from '@/lib/utils';
import { Colors } from '@/constants/Colors';
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
      <Ionicons name="chevron-down" size={22} color={Colors.textMuted} />
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
      <View style={{ flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20, paddingTop: 60 }}>
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
      </View>
    );
  }

  if (!record) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <EmptyState
          illustration={require('@/assets/illustrations/mascot-tangled.png')}
          title="Record not found"
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const interpretation = record.interpretation;

  return (
    <CurvedHeaderPage
      headerProps={{
        title: getRecordTypeLabel(record.record_type),
        showBack: true,
        subtitle: formatDate(record.record_date),
      }}
      contentStyle={{ paddingHorizontal: 0 }}
    >
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Image Gallery */}
        {record.image_urls.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20 }}
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
            <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.textHeading, marginTop: 12 }}>
              Still processing...
            </Text>
            <Text style={{ fontSize: 14, color: Colors.textBody, marginTop: 4 }}>
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
            <View style={{ width: 120, height: 120, borderRadius: 60, overflow: 'hidden' }}>
              <Image
                source={require('@/assets/illustrations/mascot-tangled.png')}
                style={{ width: 120, height: 120 }}
                contentFit="cover"
              />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.textHeading, marginTop: 12 }}>
              Interpretation failed
            </Text>
            <Text style={{ fontSize: 14, color: Colors.textBody, marginTop: 4, textAlign: 'center' }}>
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
                  backgroundColor: Colors.primaryLight,
                  borderLeftWidth: 4,
                  borderLeftColor: Colors.primary,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  ...Shadows.sm,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.textHeading, marginBottom: 8 }}>
                  Summary
                </Text>
                <Text style={{ fontSize: 16, color: Colors.textHeading, lineHeight: 24 }}>
                  {interpretation.summary}
                </Text>
              </View>
            </StaggeredCard>

            {/* Detailed Breakdown */}
            {interpretation.interpreted_sections?.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 12 }}
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
                          <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.textHeading, flex: 1, marginRight: 8 }}>
                            {section.title}
                          </Text>
                          <ChevronAnimated isExpanded={isExpanded} />
                        </Pressable>
                        {!isExpanded && section.plain_english_content && (
                          <Text
                            style={{ fontSize: 14, color: Colors.textBody, marginTop: 8 }}
                            numberOfLines={1}
                          >
                            {section.plain_english_content}
                          </Text>
                        )}
                        {isExpanded && (
                          <Text style={{ fontSize: 16, color: Colors.textHeading, marginTop: 12, lineHeight: 24 }}>
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
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 12 }}
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
                            <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.textHeading, flex: 1 }}>
                              {item.item}
                            </Text>
                          </View>
                          {item.value && (
                            <View className="flex-row items-center gap-2 mb-1 ml-1">
                              <Text style={{ fontFamily: 'monospace', fontSize: 13, color: Colors.textHeading }}>
                                {item.value}
                              </Text>
                              <Text style={{ fontSize: 14, color: Colors.textBody }}>
                                (Normal: {item.normal_range})
                              </Text>
                            </View>
                          )}
                          <Text style={{ fontSize: 16, color: Colors.textHeading, lineHeight: 24, marginLeft: 4 }}>
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
                  <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.textHeading, marginBottom: 12 }}>
                    Questions for Your Vet
                  </Text>
                  {interpretation.suggested_vet_questions.map(
                    (question: string, index: number) => (
                      <View key={index} className="flex-row gap-2 mb-2">
                        <Text style={{ fontSize: 16, color: Colors.primary, fontWeight: '700' }}>
                          {index + 1}.
                        </Text>
                        <Text style={{ fontSize: 16, color: Colors.textHeading, flex: 1, lineHeight: 24 }}>
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
    </CurvedHeaderPage>
  );
}
