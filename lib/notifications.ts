import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Types ---

export interface ScheduledNotification {
  notificationId: string;
  type: 'vaccine_reminder' | 'med_reminder';
  petId: string;
  petName: string;
  itemName: string;
  /** ISO date string for one-shot, or "daily:HH:MM" for repeating */
  triggerDate: string;
  /** Dedup key to prevent duplicate scheduling */
  dedupKey: string;
}

export interface MedReminderSchedule {
  petId: string;
  petName: string;
  medicationName: string;
  dosage: string;
  times: Array<{ hour: number; minute: number }>;
}

// --- AsyncStorage keys ---

const SCHEDULED_KEY = 'pl_notifications_scheduled';
const MED_SCHEDULES_KEY = 'pl_notifications_med_schedules';

// --- Permission & Channel Setup ---

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pl-pet-health', {
      name: 'Pet Health Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5BC5F2',
    });
  }
}

// --- Schedule / Cancel ---

export async function scheduleNotification({
  title,
  body,
  data,
  trigger,
}: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  trigger: Notifications.NotificationTriggerInput;
}): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'pl-pet-health' } : {}),
    },
    trigger,
  });
}

export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelNotificationsForPet(
  petId: string,
  type?: 'vaccine_reminder' | 'med_reminder'
): Promise<void> {
  const scheduled = await getScheduledNotifications();
  const toCancel = scheduled.filter(
    (n) => n.petId === petId && (!type || n.type === type)
  );

  for (const n of toCancel) {
    await cancelNotification(n.notificationId).catch(() => {});
  }

  const remaining = scheduled.filter(
    (n) => !(n.petId === petId && (!type || n.type === type))
  );
  await saveScheduledNotifications(remaining);

  // Also clean med schedules if cancelling med reminders or all
  if (!type || type === 'med_reminder') {
    const medSchedules = await getMedReminderSchedules();
    const remainingMeds = medSchedules.filter((s) => s.petId !== petId);
    await saveMedReminderSchedules(remainingMeds);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await saveScheduledNotifications([]);
  await saveMedReminderSchedules([]);
}

export async function cancelNotificationsByType(
  type: 'vaccine_reminder' | 'med_reminder'
): Promise<void> {
  const scheduled = await getScheduledNotifications();
  const toCancel = scheduled.filter((n) => n.type === type);

  for (const n of toCancel) {
    await cancelNotification(n.notificationId).catch(() => {});
  }

  const remaining = scheduled.filter((n) => n.type !== type);
  await saveScheduledNotifications(remaining);

  if (type === 'med_reminder') {
    await saveMedReminderSchedules([]);
  }
}

// --- Reconcile with OS ---

export async function reconcileWithOS(): Promise<string[]> {
  const stored = await getScheduledNotifications();
  if (stored.length === 0) return [];

  const osNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const osIds = new Set(osNotifications.map((n) => n.identifier));

  const missing: ScheduledNotification[] = [];
  const stillActive: ScheduledNotification[] = [];

  for (const n of stored) {
    if (osIds.has(n.notificationId)) {
      stillActive.push(n);
    } else {
      missing.push(n);
    }
  }

  await saveScheduledNotifications(stillActive);

  // Return dedup keys of missing notifications so callers can reschedule
  return missing.map((n) => n.dedupKey);
}

// --- Scheduled Notifications CRUD ---

export async function getScheduledNotifications(): Promise<ScheduledNotification[]> {
  const raw = await AsyncStorage.getItem(SCHEDULED_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ScheduledNotification[];
  } catch {
    return [];
  }
}

export async function saveScheduledNotifications(
  notifications: ScheduledNotification[]
): Promise<void> {
  await AsyncStorage.setItem(SCHEDULED_KEY, JSON.stringify(notifications));
}

// --- Med Reminder Schedules CRUD ---

export async function getMedReminderSchedules(): Promise<MedReminderSchedule[]> {
  const raw = await AsyncStorage.getItem(MED_SCHEDULES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MedReminderSchedule[];
  } catch {
    return [];
  }
}

export async function saveMedReminderSchedules(
  schedules: MedReminderSchedule[]
): Promise<void> {
  await AsyncStorage.setItem(MED_SCHEDULES_KEY, JSON.stringify(schedules));
}

export async function saveMedReminderSchedule(
  schedule: MedReminderSchedule
): Promise<void> {
  const existing = await getMedReminderSchedules();
  const idx = existing.findIndex(
    (s) => s.petId === schedule.petId && s.medicationName === schedule.medicationName
  );
  if (idx >= 0) {
    existing[idx] = schedule;
  } else {
    existing.push(schedule);
  }
  await saveMedReminderSchedules(existing);
}

export async function removeMedReminderSchedule(
  petId: string,
  medicationName: string
): Promise<void> {
  const existing = await getMedReminderSchedules();
  const filtered = existing.filter(
    (s) => !(s.petId === petId && s.medicationName === medicationName)
  );
  await saveMedReminderSchedules(filtered);
}
