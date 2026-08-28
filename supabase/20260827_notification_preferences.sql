-- ============================================================================
-- JanitorForge - Notification Preferences
-- Persistent per-user notification categories + centralized delivery filter
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Notification preferences
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  collaborations BOOLEAN NOT NULL DEFAULT true,
  submissions BOOLEAN NOT NULL DEFAULT true,
  moderation BOOLEAN NOT NULL DEFAULT true,
  updates BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users may only read their own preferences.
DROP POLICY IF EXISTS "Users can view own notification preferences"
  ON public.notification_preferences;

CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users may create only their own preference row.
DROP POLICY IF EXISTS "Users can create own notification preferences"
  ON public.notification_preferences;

CREATE POLICY "Users can create own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users may update only their own preference row.
DROP POLICY IF EXISTS "Users can update own notification preferences"
  ON public.notification_preferences;

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy on purpose.
-- Preferences should remain attached to the account until the account is deleted.


-- ----------------------------------------------------------------------------
-- 2. Keep updated_at current
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_notification_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_notification_preferences_updated_at
  ON public.notification_preferences;

CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_notification_preferences_updated_at();


-- ----------------------------------------------------------------------------
-- 3. Resolve whether a notification type is enabled
--
-- Existing categories:
--
-- collaborations
--   collaboration_invite
--   collaboration_role_change
--   collaboration_change_request
--
-- submissions
--   new_request
--   new_submission
--   request_status_change
--
-- moderation
--   flagged_submission
--   moderation_update
--
-- updates
--   platform_update
--   announcement
--   release_notes
--
-- Types not listed here remain enabled by default.
-- For example: new_follower.
-- ----------------------------------------------------------------------------

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
  v_preferences public.notification_preferences%ROWTYPE;
BEGIN
  SELECT *
  INTO v_preferences
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  -- No preference row yet = default everything to enabled.
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  CASE p_type
    WHEN 'collaboration_invite' THEN
      RETURN v_preferences.collaborations;

    WHEN 'collaboration_role_change' THEN
      RETURN v_preferences.collaborations;

    WHEN 'collaboration_change_request' THEN
      RETURN v_preferences.collaborations;


    WHEN 'new_request' THEN
      RETURN v_preferences.submissions;

    WHEN 'new_submission' THEN
      RETURN v_preferences.submissions;

    WHEN 'request_status_change' THEN
      RETURN v_preferences.submissions;


    WHEN 'flagged_submission' THEN
      RETURN v_preferences.moderation;

    WHEN 'moderation_update' THEN
      RETURN v_preferences.moderation;


    WHEN 'platform_update' THEN
      RETURN v_preferences.updates;

    WHEN 'announcement' THEN
      RETURN v_preferences.updates;

    WHEN 'release_notes' THEN
      RETURN v_preferences.updates;


    ELSE
      -- Unknown/new notification types remain enabled until explicitly mapped.
      RETURN true;
  END CASE;
END;
$$;


-- ----------------------------------------------------------------------------
-- 4. Central notification delivery filter
--
-- Every INSERT into notifications passes through this.
-- Returning NULL from a BEFORE INSERT trigger cancels that notification.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.apply_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_notification_type_enabled(NEW.user_id, NEW.type) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_notification_preferences
  ON public.notifications;

CREATE TRIGGER apply_notification_preferences
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_notification_preferences();


-- ----------------------------------------------------------------------------
-- 5. Grants
-- ----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE
  ON public.notification_preferences
  TO authenticated;

REVOKE DELETE
  ON public.notification_preferences
  FROM authenticated;

GRANT EXECUTE
  ON FUNCTION public.is_notification_type_enabled(UUID, TEXT)
  TO authenticated;