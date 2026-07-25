-- ============================================================================
-- Migration: Request form banners (storage + schema + public RPC)
-- Adds first-screen banner support for public forms.
-- ============================================================================

-- 1) Table columns
ALTER TABLE public.request_forms
ADD COLUMN IF NOT EXISTS banner_asset_path TEXT,
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 2) Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-banners',
  'form-banners',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3) Storage policies
DROP POLICY IF EXISTS "Public can view form banner assets" ON storage.objects;
CREATE POLICY "Public can view form banner assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'form-banners');

DROP POLICY IF EXISTS "Users can upload own form banner assets" ON storage.objects;
CREATE POLICY "Users can upload own form banner assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'form-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own form banner assets" ON storage.objects;
CREATE POLICY "Users can update own form banner assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'form-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'form-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own form banner assets" ON storage.objects;
CREATE POLICY "Users can delete own form banner assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'form-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4) Cleanup trigger for banner + section media on hard delete
CREATE OR REPLACE FUNCTION public.cleanup_form_assets_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_section JSONB;
  v_path TEXT;
BEGIN
  FOR v_section IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(OLD.sections, '[]'::jsonb))
  LOOP
    v_path := NULLIF(v_section->'custom'->>'imageAssetPath', '');
    IF v_path IS NOT NULL THEN
      DELETE FROM storage.objects WHERE bucket_id = 'form-assets' AND name = v_path;
    END IF;
  END LOOP;

  IF OLD.banner_asset_path IS NOT NULL AND btrim(OLD.banner_asset_path) <> '' THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'form-banners'
      AND name = OLD.banner_asset_path;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_form_assets_on_delete ON public.request_forms;
CREATE TRIGGER trg_cleanup_form_assets_on_delete
  AFTER DELETE ON public.request_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_form_assets_on_delete();

-- 5) Public RPC includes banner fields
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_public_request_form'
  ) THEN
    DROP FUNCTION IF EXISTS get_public_request_form(text);

    CREATE OR REPLACE FUNCTION get_public_request_form(p_shareable_link text)
    RETURNS TABLE (
      id uuid,
      user_id uuid,
      title text,
      description text,
      banner_asset_path text,
      banner_url text,
      sections jsonb,
      appearance jsonb,
      is_active boolean,
      deactivated_message text,
      deactivated_redirect_url text,
      deactivated_redirect_label text,
      deactivated_accent_color text
    )
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    STABLE
    AS $fn$
      SELECT
        rf.id,
        rf.user_id,
        rf.title,
        rf.description,
        rf.banner_asset_path,
        rf.banner_url,
        rf.sections,
        rf.appearance,
        rf.is_active,
        rf.deactivated_message,
        rf.deactivated_redirect_url,
        rf.deactivated_redirect_label,
        rf.deactivated_accent_color
      FROM public.request_forms rf
      WHERE rf.shareable_link = p_shareable_link
        AND rf.deleted_at IS NULL
      LIMIT 1;
    $fn$;

    GRANT EXECUTE ON FUNCTION get_public_request_form(text) TO anon, authenticated;
  END IF;
END $do$;
