-- ============================================================================
-- JanitorForge - Notification Preferences v2 cleanup
-- Removes legacy preference categories no longer used by Notifications v2
-- ============================================================================

ALTER TABLE public.notification_preferences
  DROP COLUMN IF EXISTS submissions,
  DROP COLUMN IF EXISTS updates;

COMMENT ON TABLE public.notification_preferences IS
  'Per-user in-app notification preferences for Social, Collaborations, and Moderation.';