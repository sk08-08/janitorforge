-- ============================================================================
-- Admin: Delete User Account (admin-initiated)
-- Allows admins to permanently delete another user's account and all data.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_as_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  -- Verify caller is authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is an admin
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_caller_id;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden: caller is not an admin';
  END IF;

  -- Prevent self-deletion via this function
  IF v_caller_id = target_user_id THEN
    RAISE EXCEPTION 'Use delete_user_account() to delete your own account';
  END IF;

  -- Delete Atlas data
  DELETE FROM public.atlas_entries WHERE user_id = target_user_id;
  DELETE FROM public.atlas_lorebooks WHERE user_id = target_user_id;
  DELETE FROM public.atlas_worlds WHERE user_id = target_user_id;

  -- Delete collaboration records
  DELETE FROM public.bot_collaborators WHERE user_id = target_user_id;

  -- Delete flagged_requests for submissions owned by this user
  DELETE FROM public.flagged_requests
  WHERE request_id IN (SELECT id FROM public.requests WHERE user_id = target_user_id);

  -- Delete requests and forms
  DELETE FROM public.requests WHERE user_id = target_user_id;
  DELETE FROM public.request_forms WHERE user_id = target_user_id;

  -- Delete bots
  DELETE FROM public.bots WHERE user_id = target_user_id;

  -- Delete notifications
  DELETE FROM public.notifications WHERE user_id = target_user_id;

  -- Delete feedback
  DELETE FROM public.feedback_submissions WHERE user_id = target_user_id;

  -- Delete creator pages
  DELETE FROM public.creator_page_sections WHERE page_id IN (
    SELECT id FROM public.creator_pages WHERE user_id = target_user_id
  );
  DELETE FROM public.creator_pages WHERE user_id = target_user_id;

  -- Delete profile follows
  DELETE FROM public.profile_follows
  WHERE follower_id = target_user_id OR following_id = target_user_id;

  -- Delete profile
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Delete auth user (requires service role or SECURITY DEFINER with proper grants)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant to authenticated users (the function internally enforces admin check)
GRANT EXECUTE ON FUNCTION public.delete_user_as_admin(UUID) TO authenticated;
