-- ============================================================================
-- JanitorForge - Notifications v2 hardening
--
-- Notifications are system-generated records.
-- Authenticated users may read their own notifications, but mutations happen
-- through narrowly-scoped RPCs.
-- ============================================================================


-- ============================================================================
-- 1. Remove legacy broad write access
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated can insert notifications"
  ON public.notifications;

DROP POLICY IF EXISTS "Users can update own notifications"
  ON public.notifications;

DROP POLICY IF EXISTS "Users can delete own notifications"
  ON public.notifications;


REVOKE INSERT, UPDATE, DELETE
  ON public.notifications
  FROM authenticated;


-- ============================================================================
-- 2. Safe mark-as-read RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
  SET is_read = true
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
$$;


-- ============================================================================
-- 3. Safe mark-all-read RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
  SET is_read = true
  WHERE user_id = auth.uid()
    AND is_read = false
    AND deleted_at IS NULL;
$$;


-- ============================================================================
-- 4. Safe dismiss RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dismiss_notification(
  p_notification_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
  SET deleted_at = now()
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
$$;


GRANT EXECUTE
  ON FUNCTION public.mark_notification_read(UUID)
  TO authenticated;

GRANT EXECUTE
  ON FUNCTION public.mark_all_notifications_read()
  TO authenticated;

GRANT EXECUTE
  ON FUNCTION public.dismiss_notification(UUID)
  TO authenticated;


-- ============================================================================
-- 5. Remove obsolete RPC signatures
--
-- Old versions trusted a caller-provided user ID.
-- The new versions always derive the user from auth.uid().
-- ============================================================================

DROP FUNCTION IF EXISTS public.mark_notification_read(UUID, UUID);

DROP FUNCTION IF EXISTS public.mark_all_notifications_read(UUID);


-- ============================================================================
-- 6. Preference helper is internal infrastructure
-- ============================================================================

REVOKE EXECUTE
  ON FUNCTION public.is_notification_type_enabled(UUID, TEXT)
  FROM PUBLIC, authenticated, anon;

REVOKE EXECUTE
  ON FUNCTION public.apply_notification_preferences()
  FROM PUBLIC, authenticated, anon;


-- ============================================================================
-- 7. Harden older notification producer
-- ============================================================================

ALTER FUNCTION public.notify_on_follow()
  SET search_path = public;