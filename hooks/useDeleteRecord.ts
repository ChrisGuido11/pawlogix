import { useCallback } from 'react';
import { deleteRecord } from '@/lib/delete-record';
import { toast } from '@/lib/toast';
import type { HealthRecord } from '@/types';

export function useDeleteRecord(
  setRecords: React.Dispatch<React.SetStateAction<HealthRecord[]>>,
) {
  return useCallback(async (record: HealthRecord) => {
    // Optimistic delete with rollback on failure
    let previousRecords: HealthRecord[] = [];
    setRecords((prev) => {
      previousRecords = prev;
      return prev.filter((r) => r.id !== record.id);
    });

    try {
      await deleteRecord(record);
      toast({ title: 'Record deleted', preset: 'done' });
    } catch (error: any) {
      // Restore previous state on failure
      setRecords(previousRecords);
      toast({ title: 'Delete failed', message: error.message, preset: 'error' });
    }
  }, [setRecords]);
}
