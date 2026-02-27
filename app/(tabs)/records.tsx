import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, RefreshControl, LayoutAnimation, UIManager, Platform } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { FilterPills } from '@/components/ui/filter-pills';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';

import { supabase } from '@/lib/supabase';
import { usePets } from '@/lib/pet-context';
import { useAuth } from '@/lib/auth-context';
import { getRecordTypeLabel, formatDate } from '@/lib/utils';
import { useDeleteRecord } from '@/hooks/useDeleteRecord';
import { Colors, Gradients } from '@/constants/Colors';
import { Spacing, BorderRadius, IconSize, IconTile } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';
import type { HealthRecord, FlaggedItem, InterpretedSection } from '@/types';

// --- Content item types for flattened filter views ---

type ContentItemBase = {
  sourceRecordId: string;
  sourceRecordType: HealthRecord['record_type'];
  sourceRecordDate: string;
  relatedFlags: FlaggedItem[];
  relatedSections: string[];
};

type MedicationItem = ContentItemBase & {
  kind: 'medication';
  name: string;
  dosage: string;
  frequency: string;
};

type LabValueItem = ContentItemBase & {
  kind: 'lab_value';
  name: string;
  value: number;
  unit: string;
  date: string;
};

type VaccineItem = ContentItemBase & {
  kind: 'vaccine';
  name: string;
  dateGiven: string;
  nextDue: string;
};

type ContentItem = MedicationItem | LabValueItem | VaccineItem;

const FILTER_OPTIONS = ['All', 'Lab Results', 'Vet Records', 'Prescriptions', 'Vaccines'] as const;
const CONTENT_FILTERS = ['Prescriptions', 'Lab Results', 'Vaccines'] as const;

function recordMatchesFilter(record: HealthRecord, filter: string): boolean {
  const ev = record.interpretation?.extracted_values;

  switch (filter) {
    case 'Prescriptions':
      return (ev?.medications && ev.medications.length > 0) || record.record_type === 'prescription';
    case 'Lab Results':
      return (ev?.lab_values && Object.keys(ev.lab_values).length > 0) || record.record_type === 'lab_results';
    case 'Vet Records':
      return record.record_type === 'vet_visit';
    case 'Vaccines':
      return (ev?.vaccines && ev.vaccines.length > 0) || record.record_type === 'vaccine';
    default:
      return true;
  }
}

const severityColor = (record: HealthRecord) => {
  if (record.has_urgent_flags) return Colors.error;
  if (record.flagged_items_count > 0) return Colors.warning;
  return Colors.primary;
};

function matchFlags(flaggedItems: FlaggedItem[], name: string): FlaggedItem[] {
  const lower = name.toLowerCase();
  return flaggedItems.filter((f) => f.item.toLowerCase().includes(lower) || lower.includes(f.item.toLowerCase()));
}

function matchSections(sections: InterpretedSection[], name: string): string[] {
  const lower = name.toLowerCase();
  return sections
    .filter((s) => s.title.toLowerCase().includes(lower) || s.plain_english_content.toLowerCase().includes(lower))
    .map((s) => s.plain_english_content);
}

function flattenContentItems(records: HealthRecord[], filter: string): ContentItem[] {
  const items: ContentItem[] = [];

  for (const record of records) {
    if (record.processing_status !== 'completed' || !record.interpretation) continue;
    const ev = record.interpretation.extracted_values;
    const flags = record.interpretation.flagged_items ?? [];
    const sections = record.interpretation.interpreted_sections ?? [];
    const base = {
      sourceRecordId: record.id,
      sourceRecordType: record.record_type,
      sourceRecordDate: record.record_date,
    };

    if (filter === 'Prescriptions' && ev.medications) {
      for (const med of ev.medications) {
        items.push({ kind: 'medication', name: med.name, dosage: med.dosage, frequency: med.frequency, relatedFlags: matchFlags(flags, med.name), relatedSections: matchSections(sections, med.name), ...base });
      }
    } else if (filter === 'Lab Results' && ev.lab_values) {
      for (const [name, lv] of Object.entries(ev.lab_values)) {
        items.push({ kind: 'lab_value', name, value: lv.value, unit: lv.unit, date: lv.date, relatedFlags: matchFlags(flags, name), relatedSections: matchSections(sections, name), ...base });
      }
    } else if (filter === 'Vaccines' && ev.vaccines) {
      for (const vax of ev.vaccines) {
        items.push({ kind: 'vaccine', name: vax.name, dateGiven: vax.date_given, nextDue: vax.next_due, relatedFlags: matchFlags(flags, vax.name), relatedSections: matchSections(sections, vax.name), ...base });
      }
    }
  }

  return items;
}

type VaccineStatus = 'overdue' | 'upcoming' | 'current' | null;

function getVaccineStatus(nextDue: string | undefined): VaccineStatus {
  if (!nextDue) return null;
  const now = new Date();
  const dueDate = new Date(nextDue);
  if (isNaN(dueDate.getTime())) return null;
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (dueDate < now) return 'overdue';
  if (dueDate < thirtyDaysFromNow) return 'upcoming';
  return 'current';
}

const VACCINE_STATUS_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string }> = {
  overdue: { icon: 'alert-circle', color: Colors.error, bg: Colors.errorLight, label: 'Overdue' },
  upcoming: { icon: 'time', color: Colors.warning, bg: Colors.warningLight, label: 'Due Soon' },
  current: { icon: 'checkmark-circle', color: Colors.success, bg: Colors.successLight, label: 'Up to Date' },
};

function FlagDetails({ flags }: { flags: FlaggedItem[] }) {
  return (
    <>
      {flags.map((flag, i) => (
        <View key={i} style={{ marginTop: i > 0 ? Spacing.sm : 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Badge label={flag.severity} variant={flag.severity} size="sm" />
            {flag.normal_range ? (
              <Text style={[Typography.caption, { color: Colors.textMuted }]}>
                Normal: {flag.normal_range}
              </Text>
            ) : null}
          </View>
          <Text style={[Typography.secondary, { color: Colors.textBody, marginTop: Spacing.xs }]}>
            {flag.explanation}
          </Text>
        </View>
      ))}
    </>
  );
}

function MedicationCard({ item, index }: { item: MedicationItem; index: number }) {
  const animStyle = useStaggeredEntrance(index);
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable onPress={toggle}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <View
              style={{
                width: IconTile.standard,
                height: IconTile.standard,
                borderRadius: BorderRadius.button,
                backgroundColor: Colors.successLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="medkit" size={IconSize.md} color={Colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>
                {item.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs }}>
                {item.dosage ? (
                  <View
                    style={{
                      backgroundColor: Colors.successLight,
                      borderRadius: BorderRadius.pill,
                      paddingHorizontal: Spacing.sm,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={[Typography.caption, { color: Colors.success }]}>
                      {item.dosage}
                    </Text>
                  </View>
                ) : null}
                {item.frequency ? (
                  <Text style={[Typography.secondary, { color: Colors.textBody }]}>
                    {item.frequency}
                  </Text>
                ) : null}
              </View>
              <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: Spacing.xs }]}>
                {formatDate(item.sourceRecordDate)}
              </Text>
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
          </View>
          {expanded && (
            <View style={{ marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border }}>
              {item.relatedFlags.length > 0 ? (
                <FlagDetails flags={item.relatedFlags} />
              ) : item.relatedSections.length > 0 ? (
                <Text style={[Typography.secondary, { color: Colors.textBody }]} numberOfLines={6}>
                  {item.relatedSections[0]}
                </Text>
              ) : (
                <Text style={[Typography.caption, { color: Colors.textMuted }]}>No additional notes</Text>
              )}
            </View>
          )}
        </Card>
      </Pressable>
    </Animated.View>
  );
}

function LabValueCard({ item, index }: { item: LabValueItem; index: number }) {
  const animStyle = useStaggeredEntrance(index);
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable onPress={toggle}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <View
              style={{
                width: IconTile.standard,
                height: IconTile.standard,
                borderRadius: BorderRadius.button,
                backgroundColor: Colors.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="flask" size={IconSize.md} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>
                {item.name}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: Spacing.xs,
                  marginTop: Spacing.xs,
                }}
              >
                <View
                  style={{
                    backgroundColor: Colors.primaryLight,
                    borderRadius: BorderRadius.sm,
                    paddingHorizontal: Spacing.sm,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: '600', color: Colors.primaryDark }}>
                    {item.value}
                  </Text>
                </View>
                <Text style={[Typography.secondary, { color: Colors.textMuted }]}>
                  {item.unit}
                </Text>
              </View>
              <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: Spacing.xs }]}>
                {item.date ? formatDate(item.date) : formatDate(item.sourceRecordDate)}
              </Text>
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
          </View>
          {expanded && (
            <View style={{ marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border }}>
              {item.relatedFlags.length > 0 ? (
                <FlagDetails flags={item.relatedFlags} />
              ) : item.relatedSections.length > 0 ? (
                <Text style={[Typography.secondary, { color: Colors.textBody }]} numberOfLines={6}>
                  {item.relatedSections[0]}
                </Text>
              ) : (
                <Text style={[Typography.caption, { color: Colors.textMuted }]}>Within expected parameters</Text>
              )}
            </View>
          )}
        </Card>
      </Pressable>
    </Animated.View>
  );
}

function getVaccineExpandedText(nextDue: string | undefined, status: VaccineStatus): string {
  if (!nextDue || !status) return 'No follow-up date recorded';
  const now = new Date();
  const dueDate = new Date(nextDue);
  const diffMs = dueDate.getTime() - now.getTime();
  const diffDays = Math.abs(Math.round(diffMs / (1000 * 60 * 60 * 24)));
  switch (status) {
    case 'overdue':
      return `Overdue by ${diffDays} day${diffDays !== 1 ? 's' : ''} — contact your vet to schedule`;
    case 'upcoming':
      return `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    case 'current':
      return `Next due ${formatDate(nextDue)}`;
  }
}

function VaccineCard({ item, index }: { item: VaccineItem; index: number }) {
  const animStyle = useStaggeredEntrance(index);
  const [expanded, setExpanded] = useState(false);
  const status = getVaccineStatus(item.nextDue);
  const statusConfig = status ? VACCINE_STATUS_CONFIG[status] : null;

  const iconBg = statusConfig ? statusConfig.bg : Colors.successLight;
  const iconColor = statusConfig ? statusConfig.color : Colors.success;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable onPress={toggle}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <View
              style={{
                width: IconTile.standard,
                height: IconTile.standard,
                borderRadius: BorderRadius.button,
                backgroundColor: iconBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="shield-checkmark" size={IconSize.md} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>
                {item.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs, flexWrap: 'wrap' }}>
                {item.dateGiven ? (
                  <View
                    style={{
                      backgroundColor: Colors.successLight,
                      borderRadius: BorderRadius.pill,
                      paddingHorizontal: Spacing.sm,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={[Typography.caption, { color: Colors.success }]}>
                      Given: {formatDate(item.dateGiven)}
                    </Text>
                  </View>
                ) : null}
                {item.nextDue ? (
                  <View
                    style={{
                      backgroundColor: statusConfig?.bg ?? Colors.primaryLight,
                      borderRadius: BorderRadius.pill,
                      paddingHorizontal: Spacing.sm,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={[Typography.caption, { color: statusConfig?.color ?? Colors.primary }]}>
                      Due: {formatDate(item.nextDue)}
                    </Text>
                  </View>
                ) : null}
              </View>
              {statusConfig && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs }}>
                  <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
                  <Text style={[Typography.caption, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              )}
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
          </View>
          {expanded && (
            <View style={{ marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border }}>
              {status ? (
                <Text style={[Typography.secondary, { color: status === 'overdue' ? Colors.error : Colors.textBody }]}>
                  {getVaccineExpandedText(item.nextDue, status)}
                </Text>
              ) : item.relatedSections.length > 0 ? (
                <Text style={[Typography.secondary, { color: Colors.textBody }]} numberOfLines={6}>
                  {item.relatedSections[0]}
                </Text>
              ) : (
                <Text style={[Typography.caption, { color: Colors.textMuted }]}>No follow-up date recorded</Text>
              )}
            </View>
          )}
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const FILTER_EMPTY_STATES: Record<string, { title: string; subtitle: string }> = {
  Prescriptions: {
    title: 'No prescriptions found',
    subtitle: 'Scan a vet record or prescription to see medications here.',
  },
  'Lab Results': {
    title: 'No lab results found',
    subtitle: 'Scan lab work to see individual values and trends here.',
  },
  Vaccines: {
    title: 'No vaccines found',
    subtitle: 'Scan a vaccine record to track your pet\'s immunizations here.',
  },
};

const recordIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  lab_results: 'flask',
  vet_visit: 'medkit',
  vaccine: 'shield-checkmark',
  prescription: 'document',
  other: 'document-text',
};

function RecordCard({ record, onPress, onDelete, index }: { record: HealthRecord; onPress: () => void; onDelete: (record: HealthRecord) => void; index: number }) {
  const animStyle = useStaggeredEntrance(index);

  return (
    <Animated.View style={animStyle}>
      <SwipeableRow onDelete={() => onDelete(record)}>
        <Card onPress={onPress}>
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
              style={{ width: 40, height: 40, borderRadius: BorderRadius.button, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name={recordIconMap[record.record_type] || 'document-text'} size={20} color={Colors.textOnPrimary} />
            </LinearGradient>

            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text style={[Typography.buttonPrimary, { fontFamily: Fonts.semiBold, color: Colors.textHeading }]}>
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
              <Text style={[Typography.secondary, { color: Colors.textBody }]}>{formatDate(record.record_date)}</Text>
              {record.interpretation?.summary && (
                <Text style={[Typography.secondary, { color: Colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
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
      </SwipeableRow>
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

  const isContentFilter = (CONTENT_FILTERS as readonly string[]).includes(activeFilter);

  const filteredRecords = useMemo(() => {
    if (activeFilter === 'All') return records;
    return records.filter((r) => recordMatchesFilter(r, activeFilter));
  }, [records, activeFilter]);

  const contentItems = useMemo(() => {
    if (!isContentFilter) return [];
    return flattenContentItems(records, activeFilter);
  }, [records, activeFilter, isContentFilter]);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <CurvedHeaderPage
        headerProps={{ title: 'Health Records' }}
        contentStyle={{ paddingHorizontal: 0 }}
      >
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm }}>
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
      <View style={{ flex: 1, paddingHorizontal: Spacing.lg }}>
        {fetchError && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.sm,
              backgroundColor: Colors.errorLight,
              borderRadius: BorderRadius.button,
              padding: Spacing.md,
              marginBottom: Spacing.md,
            }}
          >
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <Text style={[Typography.secondary, { color: Colors.error, flex: 1 }]}>
              {fetchError}
            </Text>
          </View>
        )}

        {activePet && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: Spacing.md }}>
            <Badge label={activePet.name} variant="primary" />
          </View>
        )}

        {isContentFilter ? (
          contentItems.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title={FILTER_EMPTY_STATES[activeFilter]?.title ?? `No ${activeFilter.toLowerCase()} found`}
              subtitle={FILTER_EMPTY_STATES[activeFilter]?.subtitle ?? 'Try selecting a different filter.'}
            />
          ) : (
            <FlashList
              data={contentItems}
              renderItem={({ item, index }) => {
                switch (item.kind) {
                  case 'medication':
                    return <MedicationCard item={item} index={index} />;
                  case 'lab_value':
                    return <LabValueCard item={item} index={index} />;
                  case 'vaccine':
                    return <VaccineCard item={item} index={index} />;
                }
              }}
              keyExtractor={(item, index) => `${item.kind}-${item.sourceRecordId}-${item.name}-${index}`}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
              }
            />
          )
        ) : filteredRecords.length === 0 ? (
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
                onDelete={handleDeleteRecord}
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

    </CurvedHeaderPage>
  );
}
