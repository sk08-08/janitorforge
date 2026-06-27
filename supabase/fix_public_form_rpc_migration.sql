-- ============================================================================
-- JanitorForge - Fix: Public Form RPC missing SECURITY DEFINER
--
-- PROBLEM: The form_deactivated_message_migration.sql recreated the
-- get_public_request_form function WITHOUT the SECURITY DEFINER clause.
-- Without SECURITY DEFINER, the function executes with the caller's
-- permissions (anon role for unauthenticated visitors). Since RLS policies
-- on request_forms only allow owners and admins to SELECT, anonymous users
-- get zero rows back, resulting in "Form not found."
--
-- FIX: Recreate the function with SECURITY DEFINER so it bypasses RLS,
-- add a deleted_at IS NULL filter (consistency with soft-delete migration),
-- and re-grant EXECUTE to anon/authenticated roles.
--
-- Run this migration on your Supabase project to fix the issue.
-- ============================================================================

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

GRANT EXECUTE ON FUNCTION get_public_request_form(text) TO anon, authenticated;