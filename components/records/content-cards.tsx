import { useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { formatDate } from '@/lib/utils';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius, IconSize, IconTile } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';
import type { FlaggedItem } from '@/types';
import type { MedicationItem, LabValueItem, VaccineItem } from '@/lib/record-filters';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function FlagDetails({ flags }: { flags: FlaggedItem[] }) {
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

type VaccineStatus = 'overdue' | 'upcoming' | 'current' | null;

export function getVaccineStatus(nextDue: string | undefined): VaccineStatus {
  if (!nextDue) return null;
  const now = new Date();
  const dueDate = new Date(nextDue);
  if (isNaN(dueDate.getTime())) return null;
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (dueDate < now) return 'overdue';
  if (dueDate < thirtyDaysFromNow) return 'upcoming';
  return 'current';
}

export const VACCINE_STATUS_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string }> = {
  overdue: { icon: 'alert-circle', color: Colors.error, bg: Colors.errorLight, label: 'Overdue' },
  upcoming: { icon: 'time', color: Colors.warning, bg: Colors.warningLight, label: 'Due Soon' },
  current: { icon: 'checkmark-circle', color: Colors.success, bg: Colors.successLight, label: 'Up to Date' },
};

export function getVaccineExpandedText(nextDue: string | undefined, status: VaccineStatus): string {
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

export function MedicationCard({ item, index }: { item: MedicationItem; index: number }) {
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

export function LabValueCard({ item, index }: { item: LabValueItem; index: number }) {
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
              {(item.value !== 0 || item.unit) ? (
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
              ) : null}
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

export function VaccineCard({ item, index }: { item: VaccineItem; index: number }) {
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
