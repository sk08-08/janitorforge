-- ============================================================================
-- Migration: Add deactivated_message column to request_forms
-- Allows creators to set a custom message shown when a form is deactivated
-- ============================================================================

-- Add the columns (nullable, defaults to empty string)
ALTER TABLE request_forms
ADD COLUMN IF NOT EXISTS deactivated_message TEXT DEFAULT '';

ALTER TABLE request_forms
ADD COLUMN IF NOT EXISTS deactivated_redirect_url TEXT DEFAULT '';

ALTER TABLE request_forms
ADD COLUMN IF NOT EXISTS deactivated_redirect_label TEXT DEFAULT '';

ALTER TABLE request_forms
ADD COLUMN IF NOT EXISTS deactivated_accent_color TEXT DEFAULT '#7c3aed';

-- Update the get_public_request_form RPC to include the new column
-- (Only if the RPC exists - it may not be deployed yet)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_public_request_form'
  ) THEN
    -- Drop and recreate with the new column
    DROP FUNCTION IF EXISTS get_public_request_form(text);

    CREATE OR REPLACE FUNCTION get_public_request_form(p_shareable_link text)
    RETURNS TABLE (
      id uuid,
      user_id uuid,
      title text,
      description text,
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
    AS $$
      SELECT
        rf.id,
        rf.user_id,
        rf.title,
        rf.description,
        rf.sections,
        rf.appearance,
        rf.is_active,
        rf.deactivated_message,
        rf.deactivated_redirect_url,
        rf.deactivated_redirect_label,
        rf.deactivated_accent_color
      FROM request_forms rf
      WHERE rf.shareable_link = p_shareable_link
        AND rf.deleted_at IS NULL
      LIMIT 1;
    $$;

    -- Re-grant execution to anonymous and authenticated users
    GRANT EXECUTE ON FUNCTION get_public_request_form(text) TO anon, authenticated;
  END IF;
END $$;