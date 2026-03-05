import { supabase } from '@/lib/supabase';
import type { HealthRecord } from '@/types';

export async function deleteRecord(record: HealthRecord): Promise<void> {
  // 1. Delete the record row first — if RLS rejects this, nothing else is lost
  const { error } = await supabase.from('pl_health_records').delete().eq('id', record.id);
  if (error) throw error;

  // 2. Delete associated chat messages (best-effort after record is gone)
  const { error: chatError } = await supabase.from('pl_record_chats').delete().eq('health_record_id', record.id);
  if (chatError) console.warn('Failed to delete chat messages:', chatError.message);

  // 3. Delete images from storage (best-effort)
  if (Array.isArray(record.image_urls) && record.image_urls.length > 0) {
    const { error: storageError } = await supabase.storage.from('pl-record-images').remove(record.image_urls);
    if (storageError) console.warn('Failed to delete images:', storageError.message);
  }
}
