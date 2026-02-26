import { useCallback } from 'react';
import { deleteRecord } from '@/lib/delete-record';
import { toast } from '@/lib/toast';
import type { HealthRecord } from '@/types';

export function useDeleteRecord(
  setRecords: React.Dispatch<React.SetStateAction<HealthRecord[]>>,
) {
  return useCallback(async (record: HealthRecord) => {
    try {
      await deleteRecord(record);
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      toast({ title: 'Record deleted', preset: 'done' });
    } catch (error: any) {
      toast({ title: 'Delete failed', message: error.message, preset: 'error' });
    }
  }, [setRecords]);
}
