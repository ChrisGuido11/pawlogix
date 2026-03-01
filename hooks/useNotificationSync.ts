import { useEffect, useRef } from 'react';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { usePets } from '@/lib/pet-context';
import { getVaccineStatus } from '@/lib/record-filters';
import {
  requestNotificationPermissions,
  scheduleNotification,
  cancelNotification,
  cancelNotificationsByType,
  reconcileWithOS,
  getScheduledNotifications,
  saveScheduledNotifications,
  getMedReminderSchedules,
  type ScheduledNotification,
} from '@/lib/notifications';
import type { HealthRecord, RecordInterpretation } from '@/types';

const SYNC_COOLDOWN_MS = 30_000;
const DAY_MS = 24 * 60 * 60 * 1000;

interface VaccineNotificationIntent {
  dedupKey: string;
  petId: string;
  petName: string;
  vaccineName: string;
  triggerDate: Date;
  triggerType: 'before' | 'day_of' | 'after';
  title: string;
  body: string;
}

function buildVaccineIntents(
  petId: string,
  petName: string,
  vaccines: Array<{ name: string; date_given: string; next_due: string }>
): VaccineNotificationIntent[] {
  const intents: VaccineNotificationIntent[] = [];
  const now = new Date();
  const sixtyDaysOut = new Date(now.getTime() + 60 * DAY_MS);

  // Deduplicate vaccines by name, keeping latest next_due
  const byName = new Map<string, { name: string; next_due: string }>();
  for (const vax of vaccines) {
    if (!vax.name || !vax.next_due) continue;
    const key = vax.name.toLowerCase().trim();
    const existing = byName.get(key);
    if (!existing || new Date(vax.next_due) > new Date(existing.next_due)) {
      byName.set(key, vax);
    }
  }

  for (const vax of byName.values()) {
    const dueDate = new Date(vax.next_due);
    if (isNaN(dueDate.getTime())) continue;

    const sevenBefore = new Date(dueDate.getTime() - 7 * DAY_MS);
    sevenBefore.setHours(9, 0, 0, 0);
    const dayOf = new Date(dueDate);
    dayOf.setHours(9, 0, 0, 0);
    const dayAfter = new Date(dueDate.getTime() + DAY_MS);
    dayAfter.setHours(9, 0, 0, 0);

    const isFarOut = dueDate > sixtyDaysOut;

    // 7 days before — always schedule if future
    if (sevenBefore > now) {
      intents.push({
        dedupKey: `vax_${petId}_${vax.name.toLowerCase().trim()}_before`,
        petId,
        petName,
        vaccineName: vax.name,
        triggerDate: sevenBefore,
        triggerType: 'before',
        title: `${petName}: ${vax.name} Due Soon`,
        body: `${vax.name} is due in 7 days. Schedule a vet appointment.`,
      });
    }

    // Day of — only for vaccines within 60 days (iOS limit mitigation)
    if (!isFarOut && dayOf > now) {
      intents.push({
        dedupKey: `vax_${petId}_${vax.name.toLowerCase().trim()}_day_of`,
        petId,
        petName,
        vaccineName: vax.name,
        triggerDate: dayOf,
        triggerType: 'day_of',
        title: `${petName}: ${vax.name} Due Today`,
        body: `${vax.name} is due today. Don't forget the appointment!`,
      });
    }

    // Day after — only for vaccines within 60 days
    if (!isFarOut && dayAfter > now) {
      intents.push({
        dedupKey: `vax_${petId}_${vax.name.toLowerCase().trim()}_after`,
        petId,
        petName,
        vaccineName: vax.name,
        triggerDate: dayAfter,
        triggerType: 'after',
        title: `${petName}: ${vax.name} Overdue`,
        body: `${vax.name} was due yesterday. Please schedule an appointment soon.`,
      });
    }
  }

  return intents;
}

export function useNotificationSync() {
  const { profile } = useAuth();
  const { pets } = usePets();
  const lastSyncRef = useRef(0);

  useEffect(() => {
    const sync = async () => {
      const now = Date.now();
      if (now - lastSyncRef.current < SYNC_COOLDOWN_MS) return;
      lastSyncRef.current = now;

      // Reconcile with OS first — detect cleared notifications
      const missingKeys = await reconcileWithOS();

      // --- Vaccine reminders ---
      if (!profile?.notification_vax_reminders) {
        await cancelNotificationsByType('vaccine_reminder');
      } else {
        const hasPerms = await requestNotificationPermissions();
        if (!hasPerms) return;

        // Gather all vaccine intents across all pets
        const allIntents: VaccineNotificationIntent[] = [];

        for (const pet of pets) {
          const { data } = await supabase
            .from('pl_health_records')
            .select('interpretation')
            .eq('pet_id', pet.id)
            .eq('processing_status', 'completed');

          if (!data) continue;

          const allVaccines: Array<{ name: string; date_given: string; next_due: string }> = [];
          for (const row of data) {
            const interp = row.interpretation as RecordInterpretation | null;
            const vaxes = interp?.extracted_values?.vaccines;
            if (vaxes?.length) {
              allVaccines.push(...vaxes);
            }
          }

          if (allVaccines.length > 0) {
            allIntents.push(...buildVaccineIntents(pet.id, pet.name, allVaccines));
          }
        }

        // Diff against currently scheduled
        const stored = await getScheduledNotifications();
        const storedVax = stored.filter((n) => n.type === 'vaccine_reminder');
        const storedKeys = new Set(storedVax.map((n) => n.dedupKey));
        const intentKeys = new Set(allIntents.map((i) => i.dedupKey));

        // Cancel stale (no longer needed)
        const toCancel = storedVax.filter((n) => !intentKeys.has(n.dedupKey));
        for (const n of toCancel) {
          await cancelNotification(n.notificationId).catch(() => {});
        }

        // Schedule new (not yet scheduled, or was cleared by OS)
        const newNotifications: ScheduledNotification[] = [];
        for (const intent of allIntents) {
          const alreadyScheduled = storedKeys.has(intent.dedupKey) && !missingKeys.includes(intent.dedupKey);
          if (alreadyScheduled) {
            // Keep existing
            const existing = storedVax.find((n) => n.dedupKey === intent.dedupKey);
            if (existing) newNotifications.push(existing);
            continue;
          }

          const notificationId = await scheduleNotification({
            title: intent.title,
            body: intent.body,
            data: { type: 'vaccine_reminder', petId: intent.petId },
            trigger: { type: SchedulableTriggerInputTypes.DATE, date: intent.triggerDate },
          });

          newNotifications.push({
            notificationId,
            type: 'vaccine_reminder',
            petId: intent.petId,
            petName: intent.petName,
            itemName: intent.vaccineName,
            triggerDate: intent.triggerDate.toISOString(),
            dedupKey: intent.dedupKey,
          });
        }

        // Save: keep non-vaccine + updated vaccine list
        const nonVax = stored.filter((n) => n.type !== 'vaccine_reminder');
        await saveScheduledNotifications([...nonVax, ...newNotifications]);
      }

      // --- Med reminders: re-verify daily repeaters ---
      if (profile?.notification_med_reminders) {
        await syncAllMedReminders(missingKeys);
      }
    };

    sync();
  }, [profile?.notification_vax_reminders, profile?.notification_med_reminders, pets]);
}

/**
 * Re-verify and reschedule any med reminders that the OS cleared.
 * Called from useNotificationSync on each sync cycle.
 */
export async function syncAllMedReminders(missingKeys?: string[]): Promise<void> {
  const schedules = await getMedReminderSchedules();
  if (schedules.length === 0) return;

  const stored = await getScheduledNotifications();
  const medStored = stored.filter((n) => n.type === 'med_reminder');
  const nonMed = stored.filter((n) => n.type !== 'med_reminder');

  // Build expected dedup keys from saved schedules
  const expectedKeys = new Set<string>();
  for (const sched of schedules) {
    for (const time of sched.times) {
      const key = `med_${sched.petId}_${sched.medicationName.toLowerCase().trim()}_${time.hour}:${time.minute}`;
      expectedKeys.add(key);
    }
  }

  // Find which keys are missing from OS
  const medStoredKeys = new Set(medStored.map((n) => n.dedupKey));
  const needsReschedule: string[] = [];
  for (const key of expectedKeys) {
    if (!medStoredKeys.has(key) || (missingKeys && missingKeys.includes(key))) {
      needsReschedule.push(key);
    }
  }

  if (needsReschedule.length === 0) return;

  // Reschedule missing med reminders
  const newMedNotifications: ScheduledNotification[] = [
    ...medStored.filter((n) => !needsReschedule.includes(n.dedupKey)),
  ];

  for (const sched of schedules) {
    for (const time of sched.times) {
      const key = `med_${sched.petId}_${sched.medicationName.toLowerCase().trim()}_${time.hour}:${time.minute}`;
      if (!needsReschedule.includes(key)) continue;

      const notificationId = await scheduleNotification({
        title: `Time for ${sched.petName}'s ${sched.medicationName}`,
        body: [sched.dosage].filter(Boolean).join(' · '),
        data: { type: 'med_reminder', petId: sched.petId },
        trigger: {
          type: SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
        },
      });

      newMedNotifications.push({
        notificationId,
        type: 'med_reminder',
        petId: sched.petId,
        petName: sched.petName,
        itemName: sched.medicationName,
        triggerDate: `daily:${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`,
        dedupKey: key,
      });
    }
  }

  await saveScheduledNotifications([...nonMed, ...newMedNotifications]);
}
