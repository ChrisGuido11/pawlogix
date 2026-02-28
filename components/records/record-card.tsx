import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { getRecordTypeLabel, formatDate } from '@/lib/utils';
import { severityColor } from '@/lib/record-filters';
import { Colors, Gradients } from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';
import type { HealthRecord } from '@/types';

const recordIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  lab_results: 'flask',
  vet_visit: 'medkit',
  vaccine: 'shield-checkmark',
  prescription: 'document',
  other: 'document-text',
};

export function RecordCard({
  record,
  onPress,
  onDelete,
  index,
}: {
  record: HealthRecord;
  onPress: () => void;
  onDelete: (record: HealthRecord) => void;
  index: number;
}) {
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
