# BACKEND_STRUCTURE.md — PawLogix Database & API

## Supabase Project: SHARED MULTI-TENANT

This Supabase project (zeskhorwddxyjhhnpgsa) is shared with other apps.
ALL PawLogix resources use the `pl_` prefix (tables) and `pl-` prefix (storage/functions).

**CRITICAL: Never create, modify, or drop tables without the `pl_` prefix.**

```
Mobile App (Expo)
    │
    ├──► Supabase Auth (anonymous sign-in on first launch, optional email/password linking — SHARED auth.users table)
    ├──► Supabase Database (pl_ prefixed tables)
    ├──► Supabase Storage (pl- prefixed buckets)
    └──► Supabase Edge Functions (pl- prefixed functions)
            ├── pl-interpret-record (Claude API vision + interpretation)
            └── pl-health-chat (Claude API follow-up Q&A)
```

### Anonymous Auth Flow
1. **First launch:** App calls `supabase.auth.signInAnonymously()` — creates a real user in auth.users with `is_anonymous = true`
2. **All features work normally** — anonymous user has a valid JWT, valid user_id, RLS policies work identically
3. **Optional account linking (from Settings):** User enters email + password → app calls `supabase.auth.updateUser({ email, password })` → same user_id, `is_anonymous` flips to `false`, all data stays intact
4. **Supabase handles this natively** — no custom migration or sync logic needed
5. **Enable anonymous sign-ins** in Supabase Dashboard → Authentication → Settings → Anonymous Sign-Ins: ON

### Auth Note
The auth.users table is shared across all apps. PawLogix uses its own `pl_profiles` table
to extend auth.users with app-specific data. The trigger that creates a pl_profiles row
should check that the signup originated from PawLogix (via app_metadata or a signup source field)
to avoid creating PawLogix profiles for Saint Match users.

For anonymous users: the trigger fires on anonymous sign-in too. The profile is created with
email = NULL and is_anonymous = true. When the user links their account via updateUser(),
the profile's email and is_anonymous fields are updated via a separate trigger on auth.users update.

---

## Database Schema

### Table: pl_profiles
Extends Supabase auth.users with PawLogix-specific data.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, FK → auth.users(id) ON DELETE CASCADE | |
| display_name | text | | User's display name (set during optional signup) |
| email | text | | NULL for anonymous users, populated on account linking |
| is_anonymous | boolean | DEFAULT true | Flipped to false when user links email/password |
| avatar_url | text | | Profile photo URL |
| notification_med_reminders | boolean | DEFAULT true | |
| notification_vax_reminders | boolean | DEFAULT true | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**RLS Policies:**
```sql
ALTER TABLE pl_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON pl_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON pl_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON pl_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON pl_profiles FOR DELETE USING (auth.uid() = id);
```

**Trigger (INSERT):** Auto-create pl_profiles row on auth.users insert when app source is PawLogix. Set is_anonymous = true for anonymous signups, false for email signups.
**Trigger (UPDATE):** When auth.users row is updated (account linking), update pl_profiles email and set is_anonymous = false.

---

### Table: pl_pets

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | FK → pl_profiles(id) ON DELETE CASCADE, NOT NULL | |
| name | text | NOT NULL | |
| species | text | NOT NULL, CHECK (species IN ('dog', 'cat')) | MVP: dogs and cats only |
| breed | text | | From breed dropdown |
| date_of_birth | date | | Exact or approximate |
| weight_kg | numeric(5,2) | | Current weight |
| photo_url | text | | Pet profile photo in Storage |
| notes | text | | Owner notes |
| is_active | boolean | DEFAULT true | Soft delete |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**RLS Policies:**
```sql
ALTER TABLE pl_pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own pets" ON pl_pets FOR ALL USING (auth.uid() = user_id);
```

---

### Table: pl_health_records

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| pet_id | uuid | FK → pl_pets(id) ON DELETE CASCADE, NOT NULL | |
| user_id | uuid | FK → pl_profiles(id) ON DELETE CASCADE, NOT NULL | Denormalized for RLS |
| record_type | text | CHECK (record_type IN ('lab_results', 'vet_visit', 'vaccine', 'prescription', 'other')) | |
| record_date | date | DEFAULT CURRENT_DATE | Date on the record |
| image_urls | text[] | NOT NULL | Array of Storage URLs |
| raw_text_extracted | text | | OCR output from AI |
| interpretation | jsonb | | Full AI interpretation (see schema below) |
| flagged_items_count | integer | DEFAULT 0 | Quick count for dashboard |
| has_urgent_flags | boolean | DEFAULT false | For notification triggers |
| processing_status | text | DEFAULT 'pending', CHECK (status IN ('pending', 'processing', 'completed', 'failed')) | |
| processing_error | text | | Error message if failed |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**interpretation JSONB schema:**
```json
{
  "summary": "Plain English summary paragraph",
  "interpreted_sections": [
    {
      "title": "Complete Blood Count",
      "plain_english_content": "Your dog's blood cell counts are..."
    }
  ],
  "flagged_items": [
    {
      "item": "BUN (Blood Urea Nitrogen)",
      "value": "45 mg/dL",
      "normal_range": "10-30 mg/dL",
      "severity": "watch",
      "explanation": "This is slightly elevated, which could indicate..."
    }
  ],
  "extracted_values": {
    "weight_kg": 25.5,
    "lab_values": {
      "BUN": { "value": 45, "unit": "mg/dL", "date": "2026-02-10" },
      "creatinine": { "value": 1.2, "unit": "mg/dL", "date": "2026-02-10" }
    },
    "vaccines": [
      { "name": "Rabies", "date_given": "2026-01-15", "next_due": "2027-01-15" }
    ],
    "medications": [
      { "name": "Apoquel", "dosage": "16mg", "frequency": "once daily" }
    ]
  },
  "suggested_vet_questions": [
    "Should we retest BUN in 4 weeks to monitor the trend?",
    "Are there dietary changes that could help support kidney function?"
  ]
}
```

**RLS Policies:**
```sql
ALTER TABLE pl_health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own records" ON pl_health_records FOR ALL USING (auth.uid() = user_id);
```

---

### Table: pl_record_chats

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| health_record_id | uuid | FK → pl_health_records(id) ON DELETE CASCADE, NOT NULL | |
| user_id | uuid | FK → pl_profiles(id) ON DELETE CASCADE, NOT NULL | |
| role | text | NOT NULL, CHECK (role IN ('user', 'assistant')) | |
| content | text | NOT NULL | |
| created_at | timestamptz | DEFAULT now() | |

**RLS Policies:**
```sql
ALTER TABLE pl_record_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own chats" ON pl_record_chats FOR ALL USING (auth.uid() = user_id);
```

---

### Table: pl_usage_tracking (BUILT BUT NOT ENFORCED IN BETA)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | FK → pl_profiles(id) ON DELETE CASCADE, NOT NULL | |
| feature_name | text | NOT NULL | 'record_interpretation', 'health_chat' |
| usage_count | integer | DEFAULT 0 | |
| period | text | DEFAULT 'monthly' | |
| reset_at | timestamptz | NOT NULL | When counter resets |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**RLS:**
```sql
ALTER TABLE pl_usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" ON pl_usage_tracking FOR SELECT USING (auth.uid() = user_id);
```

---

## Supabase Storage Buckets

### Bucket: pl-pet-photos
- Public: false
- File size limit: 5MB
- Allowed MIME: image/jpeg, image/png, image/webp
- RLS: Users can only upload/read their own files (path prefix: {user_id}/)

### Bucket: pl-record-images
- Public: false
- File size limit: 10MB
- Allowed MIME: image/jpeg, image/png, image/webp, application/pdf
- RLS: Users can only upload/read their own files (path prefix: {user_id}/)

---

## Supabase Edge Functions

### pl-interpret-record
- **Trigger:** POST from mobile app after image upload
- **Auth:** Requires valid Supabase JWT
- **Input:** `{ record_id: string, image_urls: string[], pet_species: string, pet_breed: string, record_type: string }`
- **Process:**
  1. Validate user auth
  2. Download images from Supabase Storage
  3. Convert to base64 for Claude API
  4. Send to Anthropic Claude API (claude-sonnet-4-5-20250514) with vision + structured system prompt
  5. Parse response into interpretation JSON schema
  6. Update pl_health_records row with interpretation + status
  7. Increment pl_usage_tracking counter (tracking only, not enforcing)
- **System Prompt for Claude API:**
  ```
  You are a veterinary record interpreter for pet owners. You receive scanned veterinary documents
  and your job is to:
  1. Extract ALL text and data from the document image(s)
  2. Organize the information into clear sections
  3. Translate every medical term, abbreviation, and lab value into plain English
  4. For lab values, indicate if they are within normal range for the species and breed
  5. Flag any values outside normal range with severity: "info" (minor/FYI), "watch" (monitor this), or "urgent" (discuss with vet soon)
  6. Extract numeric values (weight, lab values) into structured data for trend tracking
  7. Extract vaccination dates and medication schedules
  8. Write a "Summary for Pet Parent" in warm, reassuring but honest language
  9. Suggest 2-4 specific questions the owner could ask their vet

  CRITICAL RULES:
  - NEVER diagnose conditions. Only interpret what the document says.
  - ALWAYS recommend consulting the veterinarian for medical decisions.
  - Use warm, empowering language — not clinical or scary.
  - If you cannot read part of the document, say so clearly.
  - Species: {pet_species}, Breed: {pet_breed}

  Respond in JSON matching this schema: [interpretation schema from above]
  ```
- **Secrets:** ANTHROPIC_API_KEY (set via `supabase secrets set`)
- **Error handling:** On failure, update pl_health_records.processing_status to 'failed' with error message

### pl-health-chat
- **Trigger:** POST from AI chat screen
- **Auth:** Requires valid Supabase JWT
- **Input:** `{ health_record_id: string, message: string, chat_history: array }`
- **Process:**
  1. Validate user auth
  2. Fetch the pl_health_records interpretation for context
  3. Send to Claude API with chat history + record context
  4. Save both user message and assistant response to pl_record_chats
  5. Increment pl_usage_tracking counter
- **System Prompt:**
  ```
  You are a friendly veterinary record interpreter helping a pet owner understand their pet's
  health records. You have already interpreted a record for them and they have follow-up questions.

  Here is the interpreted record for context:
  {interpretation_json}

  RULES:
  - Answer questions about the record in plain, warm language
  - If asked about something not in the record, say you can only help with this specific record
  - NEVER diagnose. NEVER prescribe. ALWAYS recommend the vet for medical decisions.
  - Keep responses concise (2-4 paragraphs max)
  - End each response with encouragement, not anxiety
  ```

---

## Environment Variables

### Mobile App (.env / eas.json)
```
EXPO_PUBLIC_SUPABASE_URL=https://zeskhorwddxyjhhnpgsa.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key-from-supabase-dashboard>
```
**NEVER commit .env to git. NEVER paste credentials in chat or screenshots.**
Get the anon key from: Supabase Dashboard → Settings → API → Project API keys → anon/public

### Edge Function Secrets (via CLI — NEVER in code)
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
```

---

## Data Deletion Flow (for Delete Account)
1. Delete all pl_record_chats where user_id = current user
2. Delete all pl_health_records where user_id = current user (cascades to chats)
3. Delete all Storage files in pl-pet-photos/{user_id}/ and pl-record-images/{user_id}/
4. Delete all pl_pets where user_id = current user
5. Delete all pl_usage_tracking where user_id = current user
6. Delete pl_profiles where id = current user
7. Sign out current session (supabase.auth.signOut())
8. Immediately create fresh anonymous session (supabase.auth.signInAnonymously())
9. Navigate to Home Dashboard (will show empty state since new anonymous user has no data)
Note: The orphaned auth.users row will be cleaned up by Supabase's built-in anonymous user cleanup or a future admin script.

## Account Linking Flow (for Optional Signup)
1. User is currently anonymous (supabase.auth.getUser() returns is_anonymous = true)
2. User navigates to /auth/signup from Settings
3. User enters email, password, confirm password, optional display name
4. App calls supabase.auth.updateUser({ email, password, data: { app: 'pawlogix' } })
5. Supabase updates auth.users: is_anonymous → false, email populated
6. Trigger updates pl_profiles: email populated, is_anonymous → false, display_name set
7. All existing data (pets, records, chats) remains intact — same user_id throughout
8. User is now a "linked" user — can log in from any device with email/password
