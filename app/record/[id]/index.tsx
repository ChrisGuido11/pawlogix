import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { DisclaimerBanner } from '@/components/ui/disclaimer-banner';
import { supabase } from '@/lib/supabase';
import { getRecordTypeLabel, formatDate, getSeverityColor } from '@/lib/utils';
import type { HealthRecord, FlaggedItem } from '@/types';

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
      <SafeAreaView className="flex-1 bg-background px-4 pt-4">
        <Skeleton height={24} className="w-1/3 mb-4" />
        <Skeleton height={200} className="w-full mb-4" />
        <Skeleton height={100} className="w-full mb-4" />
        <Skeleton height={60} className="w-full mb-4" />
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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 pt-4 pb-8">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
          </Pressable>
          <Badge label={getRecordTypeLabel(record.record_type)} />
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
              <Image
                key={index}
                source={{ uri: getImageUrl(url) }}
                style={{
                  width: 200,
                  height: 260,
                  borderRadius: 8,
                  marginRight: 12,
                }}
              />
            ))}
          </ScrollView>
        )}

        {/* Processing States */}
        {record.processing_status === 'pending' ||
        record.processing_status === 'processing' ? (
          <Card className="mb-5 items-center py-8">
            <Ionicons name="hourglass-outline" size={40} color="#0D7377" />
            <Text className="text-lg font-semibold text-text-primary mt-3">
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
            <Ionicons name="alert-circle-outline" size={40} color="#EF5350" />
            <Text className="text-lg font-semibold text-text-primary mt-3">
              Interpretation failed
            </Text>
            <Text className="text-sm text-text-secondary mt-1 text-center">
              {record.processing_error ||
                'Something went wrong. Please try again.'}
            </Text>
            <Button title="Retry" onPress={fetchRecord} className="mt-4" />
          </Card>
        ) : interpretation ? (
          <>
            {/* Summary */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-text-primary mb-2">
                Summary
              </Text>
              <Text className="text-base text-text-primary leading-6">
                {interpretation.summary}
              </Text>
            </Card>

            {/* Detailed Breakdown */}
            {interpretation.interpreted_sections?.length > 0 && (
              <View className="mb-4">
                <Text className="text-lg font-semibold text-text-primary mb-3">
                  Detailed Breakdown
                </Text>
                {interpretation.interpreted_sections.map((section, index) => {
                  const isExpanded = expandedSections.has(index);
                  return (
                    <Card key={index} className={`mb-2 ${isExpanded ? 'bg-surface' : ''}`}>
                      <Pressable
                        onPress={() => toggleSection(index)}
                        className="flex-row items-center justify-between"
                      >
                        <Text className="text-base font-medium text-text-primary flex-1 mr-2">
                          {section.title}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={24}
                          color="#64748B"
                        />
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
                  );
                })}
              </View>
            )}

            {/* Flagged Items */}
            {interpretation.flagged_items?.length > 0 && (
              <View className="mb-4">
                <Text className="text-lg font-semibold text-text-primary mb-3">
                  Flagged Items
                </Text>
                {interpretation.flagged_items.map(
                  (item: FlaggedItem, index: number) => {
                    const colors = getSeverityColor(item.severity);
                    return (
                      <Card key={index} className="mb-2">
                        <View className="flex-row items-center gap-2 mb-2">
                          <Badge
                            label={item.severity.toUpperCase()}
                            variant={
                              item.severity === 'urgent'
                                ? 'urgent'
                                : item.severity === 'watch'
                                  ? 'watch'
                                  : 'info'
                            }
                          />
                          <Text className="text-base font-medium text-text-primary flex-1">
                            {item.item}
                          </Text>
                        </View>
                        {item.value && (
                          <Text className="text-sm text-text-secondary mb-1">
                            Value: {item.value} (Normal: {item.normal_range})
                          </Text>
                        )}
                        <Text className="text-base text-text-primary leading-6">
                          {item.explanation}
                        </Text>
                      </Card>
                    );
                  }
                )}
              </View>
            )}

            {/* Questions for Your Vet */}
            {interpretation.suggested_vet_questions?.length > 0 && (
              <Card className="mb-4">
                <Text className="text-lg font-semibold text-text-primary mb-3">
                  Questions for Your Vet
                </Text>
                {interpretation.suggested_vet_questions.map(
                  (question: string, index: number) => (
                    <View key={index} className="flex-row gap-2 mb-2">
                      <Text className="text-base text-primary font-medium">
                        {index + 1}.
                      </Text>
                      <Text className="text-base text-text-primary flex-1 leading-6">
                        {question}
                      </Text>
                    </View>
                  )
                )}
              </Card>
            )}

            {/* Chat CTA */}
            <Button
              title="Ask a Follow-Up Question"
              onPress={() => router.push(`/record/${id}/chat` as any)}
              variant="secondary"
              className="mb-4"
            />
          </>
        ) : null}

        <DisclaimerBanner className="mb-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
