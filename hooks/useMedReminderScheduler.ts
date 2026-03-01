import { useCallback } from 'react';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import {
  scheduleNotification,
  cancelNotification,
  getScheduledNotifications,
  saveScheduledNotifications,
  getMedReminderSchedules,
  saveMedReminderSchedule,
  removeMedReminderSchedule,
  type ScheduledNotification,
  type MedReminderSchedule,
} from '@/lib/notifications';

export function useMedReminderScheduler() {
  const getSchedule = useCallback(
    async (petId: string, medicationName: string): Promise<MedReminderSchedule | null> => {
      const schedules = await getMedReminderSchedules();
      return (
        schedules.find(
          (s) => s.petId === petId && s.medicationName === medicationName
        ) ?? null
      );
    },
    []
  );

  const setReminder = useCallback(
    async ({
      petId,
      petName,
      medicationName,
      dosage,
      times,
    }: {
      petId: string;
      petName: string;
      medicationName: string;
      dosage: string;
      times: Array<{ hour: number; minute: number }>;
    }): Promise<void> => {
      // Cancel existing notifications for this medication
      const stored = await getScheduledNotifications();
      const medKey = medicationName.toLowerCase().trim();
      const toCancel = stored.filter(
        (n) =>
          n.type === 'med_reminder' &&
          n.petId === petId &&
          n.dedupKey.startsWith(`med_${petId}_${medKey}_`)
      );

      for (const n of toCancel) {
        await cancelNotification(n.notificationId).catch(() => {});
      }

      // Remove cancelled from stored list
      const remaining = stored.filter(
        (n) =>
          !(
            n.type === 'med_reminder' &&
            n.petId === petId &&
            n.dedupKey.startsWith(`med_${petId}_${medKey}_`)
          )
      );

      // Schedule new daily repeaters
      const newNotifications: ScheduledNotification[] = [];
      for (const time of times) {
        const dedupKey = `med_${petId}_${medKey}_${time.hour}:${time.minute}`;

        const notificationId = await scheduleNotification({
          title: `Time for ${petName}'s ${medicationName}`,
          body: [dosage].filter(Boolean).join(' · '),
          data: { type: 'med_reminder', petId },
          trigger: {
            type: SchedulableTriggerInputTypes.DAILY,
            hour: time.hour,
            minute: time.minute,
          },
        });

        newNotifications.push({
          notificationId,
          type: 'med_reminder',
          petId,
          petName,
          itemName: medicationName,
          triggerDate: `daily:${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`,
          dedupKey,
        });
      }

      await saveScheduledNotifications([...remaining, ...newNotifications]);

      // Save the schedule for reconciliation
      await saveMedReminderSchedule({
        petId,
        petName,
        medicationName,
        dosage,
        times,
      });
    },
    []
  );

  const removeReminder = useCallback(
    async (petId: string, medicationName: string): Promise<void> => {
      const medKey = medicationName.toLowerCase().trim();

      // Cancel OS notifications
      const stored = await getScheduledNotifications();
      const toCancel = stored.filter(
        (n) =>
          n.type === 'med_reminder' &&
          n.petId === petId &&
          n.dedupKey.startsWith(`med_${petId}_${medKey}_`)
      );

      for (const n of toCancel) {
        await cancelNotification(n.notificationId).catch(() => {});
      }

      // Remove from stored list
      const remaining = stored.filter(
        (n) =>
          !(
            n.type === 'med_reminder' &&
            n.petId === petId &&
            n.dedupKey.startsWith(`med_${petId}_${medKey}_`)
          )
      );
      await saveScheduledNotifications(remaining);

      // Remove schedule
      await removeMedReminderSchedule(petId, medicationName);
    },
    []
  );

  return { getSchedule, setReminder, removeReminder };
}
