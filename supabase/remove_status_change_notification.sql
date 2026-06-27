-- ============================================================================
-- Remove status change notification trigger
-- The creator moves requests between kanban columns themselves,
-- so notifying them about their own actions is unnecessary spam.
-- ============================================================================

DROP TRIGGER IF EXISTS on_request_status_change_notify ON requests;
DROP FUNCTION IF EXISTS notify_on_request_status_change();