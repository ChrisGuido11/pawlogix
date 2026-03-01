import { getRecordTypeLabel } from '@/lib/utils';
import { Colors } from '@/constants/Colors';
import type { HealthRecord, FlaggedItem, InterpretedSection } from '@/types';

// --- Content item types for flattened filter views ---

export type ContentItemBase = {
  sourceRecordId: string;
  sourceRecordType: HealthRecord['record_type'];
  sourceRecordDate: string;
  relatedFlags: FlaggedItem[];
  relatedSections: string[];
};

export type MedicationItem = ContentItemBase & {
  kind: 'medication';
  name: string;
  dosage: string;
  frequency: string;
};

export type LabValueItem = ContentItemBase & {
  kind: 'lab_value';
  name: string;
  value: number;
  unit: string;
  date: string;
};

export type VaccineItem = ContentItemBase & {
  kind: 'vaccine';
  name: string;
  dateGiven: string;
  nextDue: string;
};

export type ContentItem = MedicationItem | LabValueItem | VaccineItem;

export const FILTER_OPTIONS = ['All', 'Lab Results', 'Vet Records', 'Prescriptions', 'Vaccines'] as const;
export const CONTENT_FILTERS = ['Prescriptions', 'Lab Results', 'Vaccines'] as const;

export const FALLBACK_PATTERNS: Record<string, RegExp> = {
  Prescriptions: /medicat|prescript|drug|dosage|rx/i,
  'Lab Results': /lab|blood|chem|panel|CBC|urinalysis|thyroid|glucose/i,
  Vaccines: /vaccin|immuniz|rabies|dhpp|bordetella|parvo|distemper/i,
};

export const FILTER_EMPTY_STATES: Record<string, { title: string; subtitle: string }> = {
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

// --- Vaccine status utilities (shared with content-cards.tsx) ---

export type VaccineStatus = 'overdue' | 'upcoming' | 'current' | null;

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

export function recordMatchesFilter(record: HealthRecord, filter: string): boolean {
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

export function matchFlags(flaggedItems: FlaggedItem[], name: string): FlaggedItem[] {
  if (!name) return [];
  const lower = name.toLowerCase();
  return flaggedItems.filter((f) => {
    const item = f.item?.toLowerCase();
    return item ? (item.includes(lower) || lower.includes(item)) : false;
  });
}

export function matchSections(sections: InterpretedSection[], name: string): string[] {
  if (!name) return [];
  const lower = name.toLowerCase();
  return sections
    .filter((s) => (s.title?.toLowerCase()?.includes(lower)) || (s.plain_english_content?.toLowerCase()?.includes(lower)))
    .map((s) => s.plain_english_content ?? '');
}

export const severityColor = (record: HealthRecord) => {
  if (record.has_urgent_flags) return Colors.error;
  if (record.flagged_items_count > 0) return Colors.warning;
  return Colors.primary;
};

export function flattenContentItems(records: HealthRecord[], filter: string): ContentItem[] {
  const items: ContentItem[] = [];

  for (const record of records) {
    if (record.processing_status !== 'completed' || !record.interpretation) continue;
    if (!recordMatchesFilter(record, filter)) continue;

    const ev = record.interpretation.extracted_values;
    const flags = record.interpretation.flagged_items ?? [];
    const sections = record.interpretation.interpreted_sections ?? [];
    const base = {
      sourceRecordId: record.id,
      sourceRecordType: record.record_type,
      sourceRecordDate: record.record_date,
    };

    let addedItems = false;

    // Primary extraction from extracted_values
    if (filter === 'Prescriptions' && ev?.medications) {
      for (const med of ev.medications) {
        if (!med.name) continue;
        items.push({ kind: 'medication', name: med.name, dosage: med.dosage ?? '', frequency: med.frequency ?? '', relatedFlags: matchFlags(flags, med.name), relatedSections: matchSections(sections, med.name), ...base });
        addedItems = true;
      }
    } else if (filter === 'Lab Results' && ev?.lab_values) {
      for (const [name, lv] of Object.entries(ev.lab_values)) {
        if (!lv) continue;
        items.push({ kind: 'lab_value', name, value: lv.value ?? 0, unit: lv.unit ?? '', date: lv.date ?? record.record_date, relatedFlags: matchFlags(flags, name), relatedSections: matchSections(sections, name), ...base });
        addedItems = true;
      }
    } else if (filter === 'Vaccines' && ev?.vaccines) {
      for (const vax of ev.vaccines) {
        if (!vax.name) continue;
        items.push({ kind: 'vaccine', name: vax.name, dateGiven: vax.date_given ?? '', nextDue: vax.next_due ?? '', relatedFlags: matchFlags(flags, vax.name), relatedSections: matchSections(sections, vax.name), ...base });
        addedItems = true;
      }
    }

    // Fallback: synthesize cards from interpreted_sections and flagged_items
    if (!addedItems) {
      const pattern = FALLBACK_PATTERNS[filter];
      if (pattern) {
        for (const section of sections) {
          const title = section.title ?? '';
          const content = section.plain_english_content ?? '';
          if (pattern.test(title) || pattern.test(content)) {
            if (filter === 'Prescriptions') {
              items.push({ kind: 'medication', name: title || 'Medication Info', dosage: '', frequency: '', relatedFlags: matchFlags(flags, title), relatedSections: [content], ...base });
              addedItems = true;
            } else if (filter === 'Lab Results') {
              items.push({ kind: 'lab_value', name: title || 'Lab Results', value: 0, unit: '', date: record.record_date, relatedFlags: matchFlags(flags, title), relatedSections: [content], ...base });
              addedItems = true;
            } else if (filter === 'Vaccines') {
              items.push({ kind: 'vaccine', name: title || 'Vaccine Info', dateGiven: record.record_date, nextDue: '', relatedFlags: matchFlags(flags, title), relatedSections: [content], ...base });
              addedItems = true;
            }
          }
        }

        for (const flag of flags) {
          const flagName = flag.item ?? '';
          const flagExplanation = flag.explanation ?? '';
          if (pattern.test(flagName) || pattern.test(flagExplanation)) {
            if (filter === 'Prescriptions') {
              items.push({ kind: 'medication', name: flagName || 'Flagged Medication', dosage: flag.value || '', frequency: '', relatedFlags: [flag], relatedSections: [flagExplanation], ...base });
              addedItems = true;
            } else if (filter === 'Lab Results') {
              items.push({ kind: 'lab_value', name: flagName || 'Flagged Lab Value', value: 0, unit: flag.value || '', date: record.record_date, relatedFlags: [flag], relatedSections: [flagExplanation], ...base });
              addedItems = true;
            } else if (filter === 'Vaccines') {
              items.push({ kind: 'vaccine', name: flagName || 'Flagged Vaccine', dateGiven: record.record_date, nextDue: '', relatedFlags: [flag], relatedSections: [flagExplanation], ...base });
              addedItems = true;
            }
          }
        }
      }

      // Last resort: create a summary card from the record
      if (!addedItems && record.interpretation.summary) {
        if (filter === 'Prescriptions') {
          items.push({ kind: 'medication', name: getRecordTypeLabel(record.record_type), dosage: '', frequency: '', relatedFlags: flags, relatedSections: [record.interpretation.summary], ...base });
        } else if (filter === 'Lab Results') {
          items.push({ kind: 'lab_value', name: getRecordTypeLabel(record.record_type), value: 0, unit: '', date: record.record_date, relatedFlags: flags, relatedSections: [record.interpretation.summary], ...base });
        } else if (filter === 'Vaccines') {
          items.push({ kind: 'vaccine', name: getRecordTypeLabel(record.record_type), dateGiven: record.record_date, nextDue: '', relatedFlags: flags, relatedSections: [record.interpretation.summary], ...base });
        }
      }
    }
  }

  // Post-processing: deduplicate vaccines by name
  if (filter === 'Vaccines') {
    const deduped = new Map<string, VaccineItem>();
    for (const item of items as VaccineItem[]) {
      const key = item.name.toLowerCase().trim();
      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, item);
      } else {
        // Keep the entry with the latest nextDue date
        if (item.nextDue && (!existing.nextDue || new Date(item.nextDue) > new Date(existing.nextDue))) {
          deduped.set(key, item);
        }
      }
    }
    return Array.from(deduped.values());
  }

  return items;
}
