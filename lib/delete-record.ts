import { supabase } from '@/lib/supabase';
import type { HealthRecord } from '@/types';

export async function deleteRecord(record: HealthRecord): Promise<void> {
  // 1. Delete associated chat messages
  const { error: chatError } = await supabase.from('pl_record_chats').delete().eq('health_record_id', record.id);
  if (chatError) throw chatError;

  // 2. Delete images from storage
  if (record.image_urls.length > 0) {
    const { error: storageError } = await supabase.storage.from('pl-record-images').remove(record.image_urls);
    if (storageError) throw storageError;
  }

  // 3. Delete the record row
  const { error } = await supabase.from('pl_health_records').delete().eq('id', record.id);
  if (error) throw error;
}
