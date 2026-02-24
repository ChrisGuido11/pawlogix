-- PawLogix Storage Buckets
-- Creates pl-pet-photos (public) and pl-record-images (private)
-- Policy names prefixed with "pl:" to avoid collisions on shared Supabase project

-- ============================================
-- BUCKET: pl-pet-photos (public — photo URLs stored in pl_pets.photo_url)
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pl-pet-photos',
  'pl-pet-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- BUCKET: pl-record-images (private — health records are sensitive)
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pl-record-images',
  'pl-record-images',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Clean up any policies from partial previous run (safe to run if they don't exist)
-- ============================================
DROP POLICY IF EXISTS "Public read access for pet photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own pet photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own pet photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own pet photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own record images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own record images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own record images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own record images" ON storage.objects;

-- ============================================
-- RLS POLICIES: pl-pet-photos (prefixed with "pl:" for multi-tenant safety)
-- ============================================

CREATE POLICY "pl: public read pet photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pl-pet-photos');

CREATE POLICY "pl: upload own pet photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pl-pet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "pl: update own pet photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pl-pet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "pl: delete own pet photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pl-pet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- RLS POLICIES: pl-record-images (prefixed with "pl:" for multi-tenant safety)
-- ============================================

CREATE POLICY "pl: view own record images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pl-record-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "pl: upload own record images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pl-record-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "pl: update own record images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pl-record-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "pl: delete own record images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pl-record-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
