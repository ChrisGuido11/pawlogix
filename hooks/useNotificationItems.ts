import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePets } from '@/lib/pet-context';
import { getVaccineStatus, type VaccineStatus } from '@/lib/record-filters';
import type { HealthRecord, RecordInterpretation, PetProfile } from '@/types';

export type NotificationItemType = 'vaccine_overdue' | 'vaccine_upcoming' | 'med_reminder' | 'urgent_flag' | 'preventive_care_overdue' | 'preventive_care_upcoming';

export interface NotificationItem {
  id: string;
  type: NotificationItemType;
  title: string;
  body: string;
  petId: string;
  petName: string;
  recordId?: string;
  severity: 'urgent' | 'warning' | 'info';
  date?: string;
}

const SEVERITY_ORDER: Record<string, number> = { urgent: 0, warning: 1, info: 2 };

export function useNotificationItems() {
  const { pets } = usePets();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (pets.length === 0) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const fetchItems = async () => {
      setIsLoading(true);
      const allItems: NotificationItem[] = [];

      for (const pet of pets) {
        const { data, error } = await supabase
          .from('pl_health_records')
          .select('id, pet_id, record_date, interpretation, has_urgent_flags, flagged_items_count')
          .eq('pet_id', pet.id)
          .eq('processing_status', 'completed');

        if (error || !data) continue;

        for (const record of data) {
          const interp = record.interpretation as RecordInterpretation | null;
          if (!interp) continue;

          // Vaccine alerts
          const vaccines = interp.extracted_values?.vaccines;
          if (Array.isArray(vaccines)) {
            for (const vax of vaccines) {
              if (!vax.name || !vax.next_due) continue;
              const status = getVaccineStatus(vax.next_due);
              if (status === 'overdue') {
                const dueDate = new Date(vax.next_due);
                const daysPast = Math.round((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                allItems.push({
                  id: `vax_overdue_${pet.id}_${vax.name}`,
                  type: 'vaccine_overdue',
                  title: `${vax.name} Overdue`,
                  body: `${pet.name}'s ${vax.name} vaccine is ${daysPast} day${daysPast !== 1 ? 's' : ''} overdue. Schedule a vet visit.`,
                  petId: pet.id,
                  petName: pet.name,
                  recordId: record.id,
                  severity: 'urgent',
                  date: vax.next_due,
                });
              } else if (status === 'upcoming') {
                const dueDate = new Date(vax.next_due);
                const daysUntil = Math.round((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                allItems.push({
                  id: `vax_upcoming_${pet.id}_${vax.name}`,
                  type: 'vaccine_upcoming',
                  title: `${vax.name} Due Soon`,
                  body: `${pet.name}'s ${vax.name} vaccine is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`,
                  petId: pet.id,
                  petName: pet.name,
                  recordId: record.id,
                  severity: 'warning',
                  date: vax.next_due,
                });
              }
            }
          }

          // Urgent flagged items
          const flags = interp.flagged_items;
          if (Array.isArray(flags)) {
            for (const flag of flags) {
              if (flag.severity === 'urgent') {
                allItems.push({
                  id: `flag_${record.id}_${flag.item}`,
                  type: 'urgent_flag',
                  title: `${flag.item} — Needs Attention`,
                  body: flag.explanation || `Discuss ${flag.item} with your vet.`,
                  petId: pet.id,
                  petName: pet.name,
                  recordId: record.id,
                  severity: 'urgent',
                  date: record.record_date,
                });
              }
            }
          }

          // Preventive care alerts
          const preventiveCare = interp.extracted_values?.preventive_care;
          if (Array.isArray(preventiveCare)) {
            for (const item of preventiveCare) {
              if (!item.name || !item.date_due) continue;
              const status = getVaccineStatus(item.date_due);
              if (status === 'overdue') {
                const dueDate = new Date(item.date_due);
                const daysPast = Math.round((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                allItems.push({
                  id: `pc_overdue_${pet.id}_${item.name}`,
                  type: 'preventive_care_overdue',
                  title: `${item.name} Overdue`,
                  body: `${pet.name}'s ${item.name} is ${daysPast} day${daysPast !== 1 ? 's' : ''} overdue. Schedule a vet visit.`,
                  petId: pet.id,
                  petName: pet.name,
                  recordId: record.id,
                  severity: 'warning',
                  date: item.date_due,
                });
              } else if (status === 'upcoming') {
                const dueDate = new Date(item.date_due);
                const daysUntil = Math.round((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                allItems.push({
                  id: `pc_upcoming_${pet.id}_${item.name}`,
                  type: 'preventive_care_upcoming',
                  title: `${item.name} Due Soon`,
                  body: `${pet.name}'s ${item.name} is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`,
                  petId: pet.id,
                  petName: pet.name,
                  recordId: record.id,
                  severity: 'info',
                  date: item.date_due,
                });
              }
            }
          }

          // Active medications (info-level reminder)
          const meds = interp.extracted_values?.medications;
          if (Array.isArray(meds)) {
            for (const med of meds) {
              if (!med.name) continue;
              allItems.push({
                id: `med_${pet.id}_${med.name}`,
                type: 'med_reminder',
                title: `${med.name}`,
                body: `${pet.name}: ${[med.dosage, med.frequency].filter(Boolean).join(' — ') || 'Active medication'}`,
                petId: pet.id,
                petName: pet.name,
                recordId: record.id,
                severity: 'info',
              });
            }
          }
        }
      }

      // Deduplicate by id (keep first occurrence)
      const seen = new Set<string>();
      const deduped = allItems.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      // Sort: urgent first, then warning, then info
      deduped.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2));

      setItems(deduped);
      setIsLoading(false);
    };

    fetchItems();
  }, [pets]);

  const urgentCount = items.filter((i) => i.severity === 'urgent' || i.severity === 'warning').length;

  return { items, isLoading, urgentCount };
}
