-- ============================================================================
-- JanitorForge - Delete User Account RPC
-- Allows users to permanently delete their own account and all associated data.
-- This is a destructive, irreversible operation.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Guard: must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete Atlas data (entries → lorebooks → worlds)
  DELETE FROM public.atlas_entries WHERE user_id = v_user_id;
  DELETE FROM public.atlas_lorebooks WHERE user_id = v_user_id;
  DELETE FROM public.atlas_worlds WHERE user_id = v_user_id;

  -- Delete collaboration records
  DELETE FROM public.bot_collaborators WHERE user_id = v_user_id;

  -- Delete requests and forms
  DELETE FROM public.requests WHERE user_id = v_user_id;
  DELETE FROM public.request_forms WHERE owner_id = v_user_id;

  -- Delete bots
  DELETE FROM public.bots WHERE user_id = v_user_id;

  -- Delete notifications
  DELETE FROM public.notifications WHERE user_id = v_user_id;

  -- Delete feedback
  DELETE FROM public.feedback_submissions WHERE user_id = v_user_id;

  -- Delete creator pages
  DELETE FROM public.creator_page_sections WHERE page_id IN (
    SELECT id FROM public.creator_pages WHERE user_id = v_user_id
  );
  DELETE FROM public.creator_pages WHERE user_id = v_user_id;

  -- Delete profile follows
  DELETE FROM public.profile_follows WHERE follower_id = v_user_id OR following_id = v_user_id;

  -- Delete profile
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- Delete the auth user (this signs them out and removes the account)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- Only authenticated users can call this function
REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;