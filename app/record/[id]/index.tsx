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
import { Typography, Fonts } from '@/constants/typography';
import { Shadows, Spacing, BorderRadius } from '@/constants/spacing';
import { SectionLabel } from '@/components/ui/section-label';
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
      style={[animStyle, { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: BorderRadius.card }]}
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
    new Set()
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

  useEffect(() => {
    if (record?.interpretation?.interpreted_sections) {
      setExpandedSections(
        new Set(record.interpretation.interpreted_sections.map((_: any, i: number) => i))
      );
    }
  }, [record?.interpretation]);

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
      <View style={{ flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.xl, paddingTop: Spacing['5xl'] + Spacing.md }}>
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
      <ScrollView style={{ flex: 1, paddingHorizontal: Spacing.lg }} contentContainerStyle={{ paddingBottom: Spacing['4xl'] }}>
        {/* Mascot illustration — shown for interpreted records */}
        {interpretation && (
          <StaggeredCard index={0}>
            <View style={{ alignItems: 'center', paddingVertical: Spacing.lg }}>
              <View style={{ width: 200, height: 200, borderRadius: 100, overflow: 'hidden' }}>
                <Image
                  source={require('@/assets/illustrations/mascot-summary.png')}
                  style={{ width: 200, height: 200 }}
                  contentFit="cover"
                />
              </View>
            </View>
          </StaggeredCard>
        )}

        {/* Image Gallery — only for records with images, hidden during interpreted view to avoid blank broken-image space */}
        {record.image_urls.length > 0 && !interpretation && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: Spacing.xl }}
          >
            {record.image_urls.map((url, index) => (
              <View key={index} style={[Shadows.md, { borderRadius: BorderRadius.button, marginRight: Spacing.md }]}>
                <Image
                  source={{ uri: getImageUrl(url) }}
                  style={{ width: 200, height: 260, borderRadius: BorderRadius.button }}
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
            <Text style={[Typography.cardTitle, { color: Colors.textHeading, marginTop: Spacing.md }]}>
              Still processing...
            </Text>
            <Text style={[Typography.secondary, { color: Colors.textBody, marginTop: Spacing.xs }]}>
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
            <Text style={[Typography.cardTitle, { color: Colors.textHeading, marginTop: Spacing.md }]}>
              Interpretation failed
            </Text>
            <Text style={[Typography.secondary, { color: Colors.textBody, marginTop: Spacing.xs, textAlign: 'center' }]}>
              {record.processing_error || 'Something went wrong. Please try again.'}
            </Text>
            <Button title="Retry" onPress={fetchRecord} className="mt-4" />
          </Card>
        ) : interpretation ? (
          <>
            {/* Summary */}
            <StaggeredCard index={1}>
              <View
                style={{
                  backgroundColor: Colors.primaryLight,
                  borderLeftWidth: 4,
                  borderLeftColor: Colors.primary,
                  borderRadius: BorderRadius.card,
                  padding: Spacing.lg,
                  marginBottom: Spacing['2xl'],
                  ...Shadows.sm,
                }}
              >
                <Text style={[Typography.cardTitle, { color: Colors.textHeading, marginBottom: Spacing.sm }]}>
                  Summary
                </Text>
                <Text style={[Typography.body, { color: Colors.textHeading }]}>
                  {interpretation.summary}
                </Text>
              </View>
            </StaggeredCard>

            {/* Detailed Breakdown */}
            {interpretation.interpreted_sections?.length > 0 && (
              <View style={{ marginBottom: Spacing['2xl'] }}>
                <SectionLabel>
                  Detailed Breakdown
                </SectionLabel>
                {interpretation.interpreted_sections.map((section: any, index: number) => {
                  const isExpanded = expandedSections.has(index);
                  return (
                    <StaggeredCard key={index} index={1 + index}>
                      <Card className="mb-2">
                        <Pressable
                          onPress={() => toggleSection(index)}
                          className="flex-row items-center justify-between"
                        >
                          <Text style={[Typography.buttonPrimary, { color: Colors.textHeading, flex: 1, marginRight: Spacing.sm }]}>
                            {section.title}
                          </Text>
                          <ChevronAnimated isExpanded={isExpanded} />
                        </Pressable>
                        {!isExpanded && section.plain_english_content && (
                          <Text
                            style={[Typography.secondary, { color: Colors.textBody, marginTop: Spacing.sm }]}
                            numberOfLines={1}
                          >
                            {section.plain_english_content}
                          </Text>
                        )}
                        {isExpanded && (
                          <Text style={[Typography.body, { color: Colors.textHeading, marginTop: Spacing.md }]}>
                            {section.plain_english_content}
                          </Text>
                        )}
                      </Card>
                    </StaggeredCard>
                  );
                })}
              </View>
            )}

            {/* Medications */}
            {(interpretation.extracted_values?.medications ?? []).length > 0 && (
              <View style={{ marginBottom: Spacing['2xl'] }}>
                <SectionLabel>
                  Medications
                </SectionLabel>
                {(interpretation.extracted_values?.medications ?? []).map(
                  (med, index) => (
                    <StaggeredCard key={index} index={4 + index}>
                      <Card className="mb-2">
                        <View className="flex-row items-center gap-3">
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: BorderRadius.button,
                              backgroundColor: Colors.successLight,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons name="medkit" size={20} color={Colors.success} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>
                              {med.name}
                            </Text>
                            {(med.dosage || med.frequency) && (
                              <Text style={[Typography.secondary, { color: Colors.textBody }]}>
                                {[med.dosage, med.frequency].filter(Boolean).join(' · ')}
                              </Text>
                            )}
                          </View>
                        </View>
                      </Card>
                    </StaggeredCard>
                  )
                )}
              </View>
            )}

            {/* Flagged Items */}
            {interpretation.flagged_items?.length > 0 && (
              <View style={{ marginBottom: Spacing['2xl'] }}>
                <SectionLabel>
                  Flagged Items
                </SectionLabel>
                {interpretation.flagged_items.map(
                  (item: FlaggedItem, index: number) => {
                    const borderColor = severityColorMap[item.severity] || Colors.primary;
                    const iconName = severityIconMap[item.severity] || 'information-circle';
                    const isUrgent = item.severity === 'urgent';

                    return (
                      <StaggeredCard key={index} index={5 + index}>
                        <Card className="mb-2 overflow-hidden">
                          {isUrgent && <PulsingBackground color={Colors.error} />}
                          <View style={{ position: 'absolute', left: 0, top: Spacing.md, bottom: Spacing.md, width: 3, borderRadius: 2, backgroundColor: borderColor }} />
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
                            <Text style={[Typography.buttonPrimary, { color: Colors.textHeading, flex: 1 }]}>
                              {item.item}
                            </Text>
                          </View>
                          {item.value && (
                            <View className="flex-row items-center gap-2 mb-1 ml-1">
                              <Text style={[Typography.secondary, { fontFamily: 'monospace', color: Colors.textHeading }]}>
                                {item.value}
                              </Text>
                              <Text style={[Typography.secondary, { color: Colors.textBody }]}>
                                (Normal: {item.normal_range})
                              </Text>
                            </View>
                          )}
                          <Text style={[Typography.body, { color: Colors.textHeading, marginLeft: Spacing.xs }]}>
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
                  <Text style={[Typography.cardTitle, { color: Colors.textHeading, marginBottom: Spacing.md }]}>
                    Questions for Your Vet
                  </Text>
                  {interpretation.suggested_vet_questions.map(
                    (question: string, index: number) => (
                      <View key={index} className="flex-row gap-2 mb-2">
                        <Text style={[Typography.buttonPrimary, { color: Colors.primary }]}>
                          {index + 1}.
                        </Text>
                        <Text style={[Typography.body, { color: Colors.textHeading, flex: 1 }]}>
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
