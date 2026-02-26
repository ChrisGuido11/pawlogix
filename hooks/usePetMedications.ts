import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AggregatedMedication, HealthRecord, RecordInterpretation } from '@/types';

export function usePetMedications(petId: string | undefined) {
  const [medications, setMedications] = useState<AggregatedMedication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!petId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('pl_health_records')
        .select('id, record_type, record_date, interpretation')
        .eq('pet_id', petId)
        .eq('processing_status', 'completed')
        .order('record_date', { ascending: false });

      if (queryError) throw queryError;

      const allMeds: AggregatedMedication[] = [];
      for (const record of (data ?? []) as Pick<HealthRecord, 'id' | 'record_type' | 'record_date' | 'interpretation'>[]) {
        const interp = record.interpretation as RecordInterpretation | null;
        const meds = interp?.extracted_values?.medications;
        if (!meds?.length) continue;
        for (const med of meds) {
          allMeds.push({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            sourceRecordId: record.id,
            sourceRecordType: record.record_type,
            sourceRecordDate: record.record_date,
          });
        }
      }

      // Deduplicate by name+dosage (case-insensitive), keeping most recent
      const seen = new Map<string, AggregatedMedication>();
      for (const med of allMeds) {
        const key = `${med.name.toLowerCase()}|${(med.dosage ?? '').toLowerCase()}`;
        if (!seen.has(key)) {
          seen.set(key, med);
        }
      }

      setMedications(Array.from(seen.values()));
    } catch (err: any) {
      console.error('Error fetching medications:', err);
      setError(err.message ?? 'Failed to load medications');
    } finally {
      setIsLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    if (!petId) {
      setIsLoading(false);
      return;
    }
    refresh();
  }, [refresh, petId]);

  return { medications, isLoading, error, refresh };
}
