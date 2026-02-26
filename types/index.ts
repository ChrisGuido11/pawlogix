export interface PetProfile {
  id: string;
  user_id: string;
  name: string;
  species: 'dog' | 'cat';
  breed: string | null;
  date_of_birth: string | null;
  weight_kg: number | null;
  photo_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HealthRecord {
  id: string;
  pet_id: string;
  user_id: string;
  record_type: 'lab_results' | 'vet_visit' | 'vaccine' | 'prescription' | 'other';
  record_date: string;
  image_urls: string[];
  raw_text_extracted: string | null;
  interpretation: RecordInterpretation | null;
  flagged_items_count: number;
  has_urgent_flags: boolean;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecordInterpretation {
  summary: string;
  interpreted_sections: InterpretedSection[];
  flagged_items: FlaggedItem[];
  extracted_values: ExtractedValues;
  suggested_vet_questions: string[];
}

export interface InterpretedSection {
  title: string;
  plain_english_content: string;
}

export interface FlaggedItem {
  item: string;
  value: string;
  normal_range: string;
  severity: 'info' | 'watch' | 'urgent';
  explanation: string;
}

export interface ExtractedValues {
  weight_kg?: number;
  lab_values?: Record<string, {
    value: number;
    unit: string;
    date: string;
  }>;
  vaccines?: Array<{
    name: string;
    date_given: string;
    next_due: string;
  }>;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
}

export interface AggregatedMedication {
  name: string;
  dosage: string;
  frequency: string;
  sourceRecordId: string;
  sourceRecordType: HealthRecord['record_type'];
  sourceRecordDate: string;
}

export interface RecordChat {
  id: string;
  health_record_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  is_anonymous: boolean;
  avatar_url: string | null;
  notification_med_reminders: boolean;
  notification_vax_reminders: boolean;
  created_at: string;
  updated_at: string;
}
