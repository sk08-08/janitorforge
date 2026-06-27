-- ============================================================================
-- Soft Delete Migration
-- Adds deleted_at columns and updates RLS policies to hide soft-deleted rows
-- ============================================================================

-- 1. Add deleted_at to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_requests_deleted_at ON requests(deleted_at) WHERE deleted_at IS NOT NULL;

-- 2. Add deleted_at to request_forms table
ALTER TABLE request_forms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_request_forms_deleted_at ON request_forms(deleted_at) WHERE deleted_at IS NOT NULL;

-- 3. Add deleted_at to bots table
ALTER TABLE bots ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_bots_deleted_at ON bots(deleted_at) WHERE deleted_at IS NOT NULL;

-- 4. Add deleted_at to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON notifications(deleted_at) WHERE deleted_at IS NOT NULL;

-- 5. Add deleted_at to feedback_submissions table
ALTER TABLE feedback_submissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_deleted_at ON feedback_submissions(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- Update RLS policies to exclude soft-deleted rows
-- ============================================================================

-- Requests: exclude soft-deleted from SELECT
DROP POLICY IF EXISTS "Users can view own requests" ON requests;
CREATE POLICY "Users can view own requests"
  ON requests FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admins can view all requests" ON requests;
CREATE POLICY "Admins can view all requests"
  ON requests FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Request Forms: exclude soft-deleted from SELECT
DROP POLICY IF EXISTS "Users can view own forms" ON request_forms;
CREATE POLICY "Users can view own forms"
  ON request_forms FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admins can view all forms" ON request_forms;
CREATE POLICY "Admins can view all forms"
  ON request_forms FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Bots: exclude soft-deleted from SELECT
DROP POLICY IF EXISTS "Users can view own bots" ON bots;
CREATE POLICY "Users can view own bots"
  ON bots FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admins can view all bots" ON bots;
CREATE POLICY "Admins can view all bots"
  ON bots FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Notifications: exclude soft-deleted from SELECT
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- ============================================================================
-- Update DELETE policies to set deleted_at instead of hard delete
-- ============================================================================

-- Requests: convert DELETE to soft delete
DROP POLICY IF EXISTS "Users can delete own requests" ON requests;
CREATE POLICY "Users can soft-delete own requests"
  ON requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Request Forms: convert DELETE to soft delete
DROP POLICY IF EXISTS "Users can delete own forms" ON request_forms;
CREATE POLICY "Users can soft-delete own forms"
  ON request_forms FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete all forms" ON request_forms;
CREATE POLICY "Admins can soft-delete all forms"
  ON request_forms FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Bots: convert DELETE to soft delete
DROP POLICY IF EXISTS "Users can delete own bots" ON bots;
CREATE POLICY "Users can soft-delete own bots"
  ON bots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete all bots" ON bots;
CREATE POLICY "Admins can soft-delete all bots"
  ON bots FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Notifications: convert DELETE to soft delete
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can soft-delete own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Helper: Restore soft-deleted rows (admin only)
-- ============================================================================
CREATE OR REPLACE FUNCTION restore_soft_deleted(p_table TEXT, p_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can restore soft-deleted rows';
  END IF;

  EXECUTE format('UPDATE %I SET deleted_at = NULL WHERE id = $1', p_table)
    USING p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Helper: Permanently purge soft-deleted rows older than 30 days (admin only)
-- ============================================================================
CREATE OR REPLACE FUNCTION purge_old_soft_deleted(p_table TEXT, p_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can purge soft-deleted rows';
  END IF;

  EXECUTE format('DELETE FROM %I WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval %L', p_table, p_days || ' days')
    INTO v_count;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;