import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { useNotificationItems, type NotificationItem, type NotificationItemType } from '@/hooks/useNotificationItems';
import { formatDate } from '@/lib/utils';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius, IconTile, IconSize } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';

const TYPE_CONFIG: Record<NotificationItemType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  vaccine_overdue: { icon: 'alert-circle', color: Colors.error, bg: Colors.errorLight },
  vaccine_upcoming: { icon: 'time', color: Colors.warning, bg: Colors.warningLight },
  med_reminder: { icon: 'medkit', color: Colors.success, bg: Colors.successLight },
  urgent_flag: { icon: 'warning', color: Colors.error, bg: Colors.errorLight },
  preventive_care_overdue: { icon: 'calendar', color: Colors.warning, bg: Colors.warningLight },
  preventive_care_upcoming: { icon: 'calendar-outline', color: Colors.primary, bg: Colors.primaryLight },
};

function NotificationCard({ item, index }: { item: NotificationItem; index: number }) {
  const router = useRouter();
  const animStyle = useStaggeredEntrance(index);
  const config = TYPE_CONFIG[item.type];

  const handlePress = () => {
    if (item.recordId) {
      router.push(`/record/${item.recordId}` as any);
    } else {
      router.push(`/pet/${item.petId}` as any);
    }
  };

  return (
    <Animated.View style={animStyle}>
      <Card onPress={handlePress}>
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <View
            style={{
              width: IconTile.standard,
              height: IconTile.standard,
              borderRadius: BorderRadius.button,
              backgroundColor: config.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={config.icon} size={IconSize.md} color={config.color} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 }}>
              <Text style={[Typography.cardTitle, { color: Colors.textHeading, flex: 1 }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Badge
                label={item.severity === 'urgent' ? 'Urgent' : item.severity === 'warning' ? 'Soon' : 'Active'}
                variant={item.severity === 'urgent' ? 'urgent' : item.severity === 'warning' ? 'watch' : 'info'}
                size="sm"
              />
            </View>
            <Text style={[Typography.secondary, { color: Colors.textBody }]} numberOfLines={2}>
              {item.body}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs }}>
              <Ionicons name="paw" size={12} color={Colors.textMuted} />
              <Text style={[Typography.caption, { color: Colors.textMuted }]}>
                {item.petName}
                {item.date ? ` · ${formatDate(item.date)}` : ''}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const { items, isLoading, urgentCount } = useNotificationItems();

  const urgentItems = items.filter((i) => i.severity === 'urgent');
  const warningItems = items.filter((i) => i.severity === 'warning');
  const infoItems = items.filter((i) => i.severity === 'info');

  if (isLoading) {
    return (
      <CurvedHeaderPage headerProps={{ title: 'Notifications', showBack: true }}>
        <View style={{ gap: Spacing.md }}>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <Skeleton width={44} height={44} className="rounded-lg" />
                <View style={{ flex: 1, gap: Spacing.sm }}>
                  <Skeleton height={16} className="w-3/4 rounded" />
                  <Skeleton height={14} className="w-full rounded" />
                  <Skeleton height={12} className="w-1/2 rounded" />
                </View>
              </View>
            </Card>
          ))}
        </View>
      </CurvedHeaderPage>
    );
  }

  if (items.length === 0) {
    return (
      <CurvedHeaderPage headerProps={{ title: 'Notifications', showBack: true }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="notifications-off"
            title="All clear!"
            subtitle="No upcoming reminders or alerts. We'll notify you when something needs attention."
          />
        </View>
      </CurvedHeaderPage>
    );
  }

  const sections: Array<{ title: string; data: NotificationItem[] }> = [];
  if (urgentItems.length > 0) sections.push({ title: 'Needs Attention', data: urgentItems });
  if (warningItems.length > 0) sections.push({ title: 'Coming Up', data: warningItems });
  if (infoItems.length > 0) sections.push({ title: 'Reminders', data: infoItems });

  // Flatten with section headers for FlashList
  type ListItem = { type: 'header'; title: string } | { type: 'notification'; item: NotificationItem; globalIndex: number };
  const listData: ListItem[] = [];
  let globalIndex = 0;
  for (const section of sections) {
    listData.push({ type: 'header', title: section.title });
    for (const item of section.data) {
      listData.push({ type: 'notification', item, globalIndex });
      globalIndex++;
    }
  }

  return (
    <CurvedHeaderPage headerProps={{ title: 'Notifications', showBack: true }}>
      <FlashList
        data={listData}
        renderItem={({ item: listItem }) => {
          if (listItem.type === 'header') {
            return (
              <View style={{ paddingTop: Spacing.md, paddingBottom: Spacing.sm }}>
                <Text style={[Typography.sectionHeading, { color: Colors.textHeading }]}>
                  {listItem.title}
                </Text>
              </View>
            );
          }
          return (
            <View style={{ marginBottom: Spacing.md }}>
              <NotificationCard item={listItem.item} index={listItem.globalIndex} />
            </View>
          );
        }}
        getItemType={(item) => item.type}
        keyExtractor={(item, index) =>
          item.type === 'header' ? `header-${item.title}` : `notif-${item.item.id}`
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}
      />
    </CurvedHeaderPage>
  );
}
