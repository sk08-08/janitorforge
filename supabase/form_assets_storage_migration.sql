-- ============================================================================
-- JanitorForge - Form Assets Storage Migration
-- Adds a dedicated Storage bucket for form section images.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-assets',
  'form-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view form assets" ON storage.objects;
CREATE POLICY "Public can view form assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'form-assets');

DROP POLICY IF EXISTS "Users can upload own form assets" ON storage.objects;
CREATE POLICY "Users can upload own form assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'form-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own form assets" ON storage.objects;
CREATE POLICY "Users can update own form assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'form-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'form-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own form assets" ON storage.objects;
CREATE POLICY "Users can delete own form assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'form-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMENT ON COLUMN request_forms.sections IS
  'JSONB array of sections. section.custom may include headerAlignment, collapsible, textColor, imageAssetPath, gifUrl.';
