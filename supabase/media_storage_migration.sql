-- ============================================================================
-- JanitorForge Media Storage Migration
-- Buckets and policies for profile and bot images + cleanup triggers
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-assets',
  'profile-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bot-assets',
  'bot-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view profile assets" ON storage.objects;
CREATE POLICY "Public can view profile assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-assets');

DROP POLICY IF EXISTS "Users can upload own profile assets" ON storage.objects;
CREATE POLICY "Users can upload own profile assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own profile assets" ON storage.objects;
CREATE POLICY "Users can update own profile assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own profile assets" ON storage.objects;
CREATE POLICY "Users can delete own profile assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Public can view bot assets" ON storage.objects;
CREATE POLICY "Public can view bot assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bot-assets');

DROP POLICY IF EXISTS "Users can upload own bot assets" ON storage.objects;
CREATE POLICY "Users can upload own bot assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bot-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own bot assets" ON storage.objects;
CREATE POLICY "Users can update own bot assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bot-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'bot-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own bot assets" ON storage.objects;
CREATE POLICY "Users can delete own bot assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bot-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE OR REPLACE FUNCTION public.storage_public_url_to_object_path(
  p_url TEXT,
  p_bucket TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_marker TEXT;
  v_start INTEGER;
  v_path TEXT;
BEGIN
  IF p_url IS NULL OR btrim(p_url) = '' THEN
    RETURN NULL;
  END IF;

  v_marker := '/storage/v1/object/public/' || p_bucket || '/';
  v_start := strpos(p_url, v_marker);
  IF v_start = 0 THEN
    RETURN NULL;
  END IF;

  v_path := substring(p_url from v_start + char_length(v_marker));
  v_path := split_part(v_path, '?', 1);
  IF btrim(v_path) = '' THEN
    RETURN NULL;
  END IF;

  RETURN replace(v_path, '%2F', '/');
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_bot_storage_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path TEXT;
BEGIN
  v_path := public.storage_public_url_to_object_path(OLD.image_url, 'bot-assets');
  IF v_path IS NOT NULL THEN
    DELETE FROM storage.objects WHERE bucket_id = 'bot-assets' AND name = v_path;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_bot_storage_on_delete ON public.bots;
CREATE TRIGGER trg_cleanup_bot_storage_on_delete
  AFTER DELETE ON public.bots
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_bot_storage_on_delete();

CREATE OR REPLACE FUNCTION public.cleanup_profile_storage_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avatar_path TEXT;
  v_banner_path TEXT;
BEGIN
  v_avatar_path := public.storage_public_url_to_object_path(OLD.avatar_url, 'profile-assets');
  v_banner_path := public.storage_public_url_to_object_path(OLD.banner_url, 'profile-assets');

  IF v_avatar_path IS NOT NULL THEN
    DELETE FROM storage.objects WHERE bucket_id = 'profile-assets' AND name = v_avatar_path;
  END IF;

  IF v_banner_path IS NOT NULL THEN
    DELETE FROM storage.objects WHERE bucket_id = 'profile-assets' AND name = v_banner_path;
  END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'profile-assets'
    AND (storage.foldername(name))[1] = OLD.id::text;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_profile_storage_on_delete ON public.profiles;
CREATE TRIGGER trg_cleanup_profile_storage_on_delete
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_profile_storage_on_delete();

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

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_form_assets_on_delete ON public.request_forms;
CREATE TRIGGER trg_cleanup_form_assets_on_delete
  AFTER DELETE ON public.request_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_form_assets_on_delete();
