-- ============================================================================
-- JanitorForge - Notifications v2
--
-- Goals:
-- - Keep notifications for important events only
-- - Keep detailed collaborator activity in bot_activity_log
-- - Stop notification spam for normal form submissions
-- - Add real Social / Collaboration / Moderation notification producers
-- ============================================================================


-- ============================================================================
-- 1. Extend notification preferences
-- ============================================================================

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS social BOOLEAN NOT NULL DEFAULT true;

-- NOTE:
-- submissions and updates are intentionally NOT removed yet.
-- Settings still references them and will be migrated in the next wave.


-- ============================================================================
-- 2. Central notification preference resolver
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_notification_type_enabled(
  p_user_id UUID,
  p_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_social BOOLEAN := true;
  v_collaborations BOOLEAN := true;
  v_moderation BOOLEAN := true;
BEGIN
  SELECT
    social,
    collaborations,
    moderation
  INTO
    v_social,
    v_collaborations,
    v_moderation
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  -- No preference row = notifications enabled by default.
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  CASE p_type

    -- ------------------------------------------------------------------------
    -- Social
    -- ------------------------------------------------------------------------

    WHEN 'new_follower' THEN
      RETURN v_social;


    -- ------------------------------------------------------------------------
    -- Collaboration
    -- ------------------------------------------------------------------------

    WHEN 'collaboration_invite' THEN
      RETURN v_collaborations;

    WHEN 'collaboration_accepted' THEN
      RETURN v_collaborations;

    WHEN 'collaboration_declined' THEN
      RETURN v_collaborations;

    WHEN 'collaboration_role_changed' THEN
      RETURN v_collaborations;

    WHEN 'collaborator_removed' THEN
      RETURN v_collaborations;

    WHEN 'change_request_created' THEN
      RETURN v_collaborations;

    WHEN 'change_request_approved' THEN
      RETURN v_collaborations;

    WHEN 'change_request_rejected' THEN
      RETURN v_collaborations;


    -- ------------------------------------------------------------------------
    -- Moderation
    -- ------------------------------------------------------------------------

    WHEN 'flagged_submission' THEN
      RETURN v_moderation;


    -- Unknown types remain enabled until explicitly classified.
    ELSE
      RETURN true;

  END CASE;
END;
$$;


-- ============================================================================
-- 3. Stop normal submission notifications
-- ============================================================================

-- Normal submissions already have their own unread/count indicator in the
-- Submissions area. Duplicating every submission in the notification bell
-- creates unnecessary noise.

DROP TRIGGER IF EXISTS on_new_request_notify_owner
  ON public.requests;

-- Keep the function for historical migration compatibility, but nothing will
-- call it anymore.


-- The status-change notification had already been removed previously.
-- Repeating this safely ensures older environments are also corrected.

DROP TRIGGER IF EXISTS on_request_status_change_notify
  ON public.requests;

DROP FUNCTION IF EXISTS public.notify_on_request_status_change();


-- ============================================================================
-- 4. Hide old noisy submission notifications
-- ============================================================================

UPDATE public.notifications
SET deleted_at = now()
WHERE deleted_at IS NULL
  AND type IN (
    'new_request',
    'new_submission',
    'request_status_change'
  );


-- ============================================================================
-- 5. Collaboration invite response notifications
--
-- When the invited user accepts or declines, notify the bot owner/inviter.
-- The activity log remains the detailed history.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_collaborator_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot_name TEXT;
  v_bot_owner UUID;
  v_actor_name TEXT;
BEGIN
  -- Only care about pending -> accepted/declined.
  IF OLD.status <> 'pending'
     OR NEW.status NOT IN ('accepted', 'declined') THEN
    RETURN NEW;
  END IF;

  SELECT
    b.name,
    b.user_id
  INTO
    v_bot_name,
    v_bot_owner
  FROM public.bots b
  WHERE b.id = NEW.bot_id;

  SELECT COALESCE(p.display_name, p.username, 'Someone')
  INTO v_actor_name
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  IF v_bot_owner IS NULL OR v_bot_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    )
    VALUES (
      v_bot_owner,
      'collaboration_accepted',
      'Collaboration invite accepted',
      COALESCE(v_actor_name, 'Someone')
        || ' accepted your invitation to collaborate on "'
        || COALESCE(v_bot_name, 'a bot')
        || '".',
      NULL,
      jsonb_build_object(
        'bot_id', NEW.bot_id,
        'collaborator_id', NEW.id,
        'collaborator_user_id', NEW.user_id
      )
    );

  ELSIF NEW.status = 'declined' THEN

    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    )
    VALUES (
      v_bot_owner,
      'collaboration_declined',
      'Collaboration invite declined',
      COALESCE(v_actor_name, 'Someone')
        || ' declined your invitation to collaborate on "'
        || COALESCE(v_bot_name, 'a bot')
        || '".',
      NULL,
      jsonb_build_object(
        'bot_id', NEW.bot_id,
        'collaborator_id', NEW.id,
        'collaborator_user_id', NEW.user_id
      )
    );

  END IF;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS on_collaborator_response_notify
  ON public.bot_collaborators;

CREATE TRIGGER on_collaborator_response_notify
  AFTER UPDATE OF status
  ON public.bot_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_collaborator_response();


-- ============================================================================
-- 6. Collaboration role-change notification
--
-- Notify the collaborator whose role changed.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_collaborator_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot_name TEXT;
BEGIN
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;

  -- Only notify real accepted collaborators.
  IF NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT b.name
  INTO v_bot_name
  FROM public.bots b
  WHERE b.id = NEW.bot_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    metadata
  )
  VALUES (
    NEW.user_id,
    'collaboration_role_changed',
    'Collaboration role updated',
    'Your role on "'
      || COALESCE(v_bot_name, 'a bot')
      || '" changed from '
      || COALESCE(OLD.role, 'unknown')
      || ' to '
      || COALESCE(NEW.role, 'unknown')
      || '.',
    NULL,
    jsonb_build_object(
      'bot_id', NEW.bot_id,
      'collaborator_id', NEW.id,
      'old_role', OLD.role,
      'new_role', NEW.role
    )
  );

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS on_collaborator_role_change_notify
  ON public.bot_collaborators;

CREATE TRIGGER on_collaborator_role_change_notify
  AFTER UPDATE OF role
  ON public.bot_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_collaborator_role_change();


-- ============================================================================
-- 7. Collaboration removal notification
--
-- A DELETE trigger is ideal here because removals already happen through
-- bot_collaborators.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_collaborator_removed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot_name TEXT;
BEGIN
  -- Only notify people who had actually accepted the collaboration.
  IF OLD.status <> 'accepted' THEN
    RETURN OLD;
  END IF;

  SELECT b.name
  INTO v_bot_name
  FROM public.bots b
  WHERE b.id = OLD.bot_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    metadata
  )
  VALUES (
    OLD.user_id,
    'collaborator_removed',
    'Collaboration ended',
    'You are no longer a collaborator on "'
      || COALESCE(v_bot_name, 'a bot')
      || '".',
    NULL,
    jsonb_build_object(
      'bot_id', OLD.bot_id,
      'collaborator_id', OLD.id
    )
  );

  RETURN OLD;
END;
$$;


DROP TRIGGER IF EXISTS on_collaborator_removed_notify
  ON public.bot_collaborators;

CREATE TRIGGER on_collaborator_removed_notify
  AFTER DELETE
  ON public.bot_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_collaborator_removed();


-- ============================================================================
-- 8. Change request created
--
-- Notify the bot owner when a collaborator submits a change request.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_change_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot_owner UUID;
  v_bot_name TEXT;
  v_author_name TEXT;
BEGIN
  SELECT
    b.user_id,
    b.name
  INTO
    v_bot_owner,
    v_bot_name
  FROM public.bots b
  WHERE b.id = NEW.bot_id;

  IF v_bot_owner IS NULL OR v_bot_owner = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.display_name, p.username, 'Someone')
  INTO v_author_name
  FROM public.profiles p
  WHERE p.id = NEW.author_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    metadata
  )
  VALUES (
    v_bot_owner,
    'change_request_created',
    'New change request',
    COALESCE(v_author_name, 'Someone')
      || ' submitted changes for "'
      || COALESCE(v_bot_name, 'a bot')
      || '".',
    NULL,
    jsonb_build_object(
      'bot_id', NEW.bot_id,
      'change_request_id', NEW.id,
      'author_id', NEW.author_id
    )
  );

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS on_change_request_created_notify
  ON public.bot_change_requests;

CREATE TRIGGER on_change_request_created_notify
  AFTER INSERT
  ON public.bot_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_change_request_created();


-- ============================================================================
-- 9. Change request reviewed
--
-- Notify the author when their request is approved or rejected.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_change_request_reviewed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot_name TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  SELECT b.name
  INTO v_bot_name
  FROM public.bots b
  WHERE b.id = NEW.bot_id;

  IF NEW.status = 'approved' THEN

    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    )
    VALUES (
      NEW.author_id,
      'change_request_approved',
      'Change request approved',
      'Your changes for "'
        || COALESCE(v_bot_name, 'a bot')
        || '" were approved.',
      NULL,
      jsonb_build_object(
        'bot_id', NEW.bot_id,
        'change_request_id', NEW.id
      )
    );

  ELSE

    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    )
    VALUES (
      NEW.author_id,
      'change_request_rejected',
      'Change request rejected',
      'Your changes for "'
        || COALESCE(v_bot_name, 'a bot')
        || '" were not approved.',
      NULL,
      jsonb_build_object(
        'bot_id', NEW.bot_id,
        'change_request_id', NEW.id
      )
    );

  END IF;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS on_change_request_reviewed_notify
  ON public.bot_change_requests;

CREATE TRIGGER on_change_request_reviewed_notify
  AFTER UPDATE OF status
  ON public.bot_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_change_request_reviewed();


-- ============================================================================
-- 10. Flagged submission notification
--
-- A normal submission does NOT generate a bell notification.
-- A flagged submission does.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_flagged_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form_owner UUID;
  v_form_title TEXT;
BEGIN
  SELECT
    rf.user_id,
    rf.title
  INTO
    v_form_owner,
    v_form_title
  FROM public.request_forms rf
  WHERE rf.id = NEW.form_id;

  IF v_form_owner IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    metadata
  )
  VALUES (
    v_form_owner,
    'flagged_submission',
    'Submission flagged for review',
    'A submission to "'
      || COALESCE(v_form_title, 'your form')
      || '" was flagged for moderation review.',
    NULL,
    jsonb_build_object(
      'form_id', NEW.form_id,
      'request_id', NEW.request_id,
      'flagged_request_id', NEW.id,
      'risk_level', NEW.risk_level
    )
  );

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS on_flagged_submission_notify
  ON public.flagged_requests;

CREATE TRIGGER on_flagged_submission_notify
  AFTER INSERT
  ON public.flagged_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_flagged_submission();


-- ============================================================================
-- Done
-- ============================================================================

COMMENT ON TABLE public.notification_preferences IS
  'Per-user in-app notification preferences. Notifications v2 uses social, collaborations and moderation. Legacy submissions/updates columns remain temporarily for UI migration.';