-- PawLogix Database Schema
-- MULTI-TENANT: All tables prefixed with pl_ to avoid collisions with other apps

-- ============================================
-- TABLE: pl_profiles
-- Extends Supabase auth.users with PawLogix-specific data
-- ============================================
CREATE TABLE IF NOT EXISTS pl_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  avatar_url TEXT,
  notification_med_reminders BOOLEAN DEFAULT true,
  notification_vax_reminders BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pl_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON pl_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON pl_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON pl_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON pl_profiles
  FOR DELETE USING (auth.uid() = id);

-- ============================================
-- TABLE: pl_pets
-- ============================================
CREATE TABLE IF NOT EXISTS pl_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES pl_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  breed TEXT,
  date_of_birth DATE,
  weight_kg NUMERIC(5,2),
  photo_url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pl_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own pets" ON pl_pets
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TABLE: pl_health_records
-- ============================================
CREATE TABLE IF NOT EXISTS pl_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pl_pets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES pl_profiles(id) ON DELETE CASCADE,
  record_type TEXT CHECK (record_type IN ('lab_results', 'vet_visit', 'vaccine', 'prescription', 'other')),
  record_date DATE DEFAULT CURRENT_DATE,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  raw_text_extracted TEXT,
  interpretation JSONB,
  flagged_items_count INTEGER DEFAULT 0,
  has_urgent_flags BOOLEAN DEFAULT false,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pl_health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own records" ON pl_health_records
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TABLE: pl_record_chats
-- ============================================
CREATE TABLE IF NOT EXISTS pl_record_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_record_id UUID NOT NULL REFERENCES pl_health_records(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES pl_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pl_record_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own chats" ON pl_record_chats
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TABLE: pl_usage_tracking (built, not enforced in beta)
-- ============================================
CREATE TABLE IF NOT EXISTS pl_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES pl_profiles(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  period TEXT DEFAULT 'monthly',
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pl_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON pl_usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS: Auto-create pl_profiles on auth signup
-- ============================================

-- Function to create a PawLogix profile when a new user signs up
CREATE OR REPLACE FUNCTION public.pl_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile for PawLogix users (check app metadata)
  -- Anonymous users and users with app='pawlogix' metadata get profiles
  IF NEW.is_anonymous = true OR
     (NEW.raw_app_meta_data->>'app' = 'pawlogix') OR
     (NEW.raw_user_meta_data->>'app' = 'pawlogix') THEN
    INSERT INTO public.pl_profiles (id, email, is_anonymous)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.is_anonymous, false)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users INSERT
DROP TRIGGER IF EXISTS pl_on_auth_user_created ON auth.users;
CREATE TRIGGER pl_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.pl_handle_new_user();

-- Function to sync profile when user links account
CREATE OR REPLACE FUNCTION public.pl_handle_user_updated()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile when account is linked (anonymous -> email)
  IF OLD.is_anonymous = true AND NEW.is_anonymous = false THEN
    UPDATE public.pl_profiles
    SET
      email = NEW.email,
      is_anonymous = false,
      updated_at = now()
    WHERE id = NEW.id;
  END IF;

  -- Sync email changes
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.pl_profiles
    SET
      email = NEW.email,
      updated_at = now()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users UPDATE
DROP TRIGGER IF EXISTS pl_on_auth_user_updated ON auth.users;
CREATE TRIGGER pl_on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.pl_handle_user_updated();

-- ============================================
-- TRIGGERS: Auto-update updated_at columns
-- ============================================
CREATE OR REPLACE FUNCTION public.pl_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pl_profiles_updated_at
  BEFORE UPDATE ON pl_profiles
  FOR EACH ROW EXECUTE FUNCTION public.pl_update_updated_at();

CREATE TRIGGER pl_pets_updated_at
  BEFORE UPDATE ON pl_pets
  FOR EACH ROW EXECUTE FUNCTION public.pl_update_updated_at();

CREATE TRIGGER pl_health_records_updated_at
  BEFORE UPDATE ON pl_health_records
  FOR EACH ROW EXECUTE FUNCTION public.pl_update_updated_at();

CREATE TRIGGER pl_usage_tracking_updated_at
  BEFORE UPDATE ON pl_usage_tracking
  FOR EACH ROW EXECUTE FUNCTION public.pl_update_updated_at();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pl_pets_user_id ON pl_pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pl_health_records_pet_id ON pl_health_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_pl_health_records_user_id ON pl_health_records(user_id);
CREATE INDEX IF NOT EXISTS idx_pl_record_chats_health_record_id ON pl_record_chats(health_record_id);
CREATE INDEX IF NOT EXISTS idx_pl_record_chats_user_id ON pl_record_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_pl_usage_tracking_user_id ON pl_usage_tracking(user_id);
