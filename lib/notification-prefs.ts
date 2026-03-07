import AsyncStorage from '@react-native-async-storage/async-storage';

const ADVANCE_DAYS_KEY = 'pl_notification_advance_days';
const REMINDER_HOUR_KEY = 'pl_notification_reminder_hour';

export const ADVANCE_OPTIONS = [
  { label: '1 day before', value: 1 },
  { label: '3 days before', value: 3 },
  { label: '5 days before', value: 5 },
  { label: '7 days before', value: 7 },
  { label: '14 days before', value: 14 },
] as const;

export const TIME_OPTIONS = [
  { label: '7:00 AM', value: 7 },
  { label: '8:00 AM', value: 8 },
  { label: '9:00 AM', value: 9 },
  { label: '10:00 AM', value: 10 },
  { label: '12:00 PM', value: 12 },
  { label: '3:00 PM', value: 15 },
  { label: '6:00 PM', value: 18 },
  { label: '8:00 PM', value: 20 },
] as const;

export const DEFAULT_ADVANCE_DAYS = 7;
export const DEFAULT_REMINDER_HOUR = 9;

export async function getAdvanceDays(): Promise<number> {
  const raw = await AsyncStorage.getItem(ADVANCE_DAYS_KEY);
  if (!raw) return DEFAULT_ADVANCE_DAYS;
  const val = parseInt(raw, 10);
  return isNaN(val) ? DEFAULT_ADVANCE_DAYS : val;
}

export async function setAdvanceDays(days: number): Promise<void> {
  await AsyncStorage.setItem(ADVANCE_DAYS_KEY, String(days));
}

export async function getReminderHour(): Promise<number> {
  const raw = await AsyncStorage.getItem(REMINDER_HOUR_KEY);
  if (!raw) return DEFAULT_REMINDER_HOUR;
  const val = parseInt(raw, 10);
  return isNaN(val) ? DEFAULT_REMINDER_HOUR : val;
}

export async function setReminderHour(hour: number): Promise<void> {
  await AsyncStorage.setItem(REMINDER_HOUR_KEY, String(hour));
}

export function formatHour(hour: number): string {
  const option = TIME_OPTIONS.find((o) => o.value === hour);
  if (option) return option.label;
  const period = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:00 ${period}`;
}
