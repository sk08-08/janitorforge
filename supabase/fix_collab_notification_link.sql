-- ============================================================================
-- Fix: Collaboration invite notification link
-- Sets link to NULL so the SPA handles navigation via metadata instead of
-- an incorrect /dashboard?view=bots URL that causes 404.
-- Run this in Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_collaborator_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot_name TEXT;
  v_inviter_name TEXT;
BEGIN
  -- Don't notify if the inviter is the same as the invited user
  IF NEW.invited_by = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get bot name
  SELECT name INTO v_bot_name FROM public.bots WHERE id = NEW.bot_id;

  -- Get inviter display name
  SELECT COALESCE(display_name, username) INTO v_inviter_name
  FROM public.profiles WHERE id = NEW.invited_by;

  -- Create notification for the invited user
  -- Link is NULL: the SPA reads metadata.bot_id to navigate client-side
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.user_id,
    'collaboration_invite',
    'Collaboration Invite',
    COALESCE(v_inviter_name, 'Someone') || ' invited you to collaborate on "' || COALESCE(v_bot_name, 'a bot') || '"',
    NULL,
    jsonb_build_object(
      'bot_id', NEW.bot_id,
      'bot_name', v_bot_name,
      'invited_by', NEW.invited_by,
      'inviter_name', v_inviter_name,
      'role', NEW.role,
      'collaborator_id', NEW.id
    )
  );

  -- Log activity
  INSERT INTO public.bot_activity_log (bot_id, user_id, action, details)
  VALUES (
    NEW.bot_id,
    NEW.invited_by,
    'collaborator_invited',
    jsonb_build_object(
      'invited_user_id', NEW.user_id,
      'role', NEW.role
    )
  );

  RETURN NEW;
END;
$$;