-- ============================================================================
-- JanitorForge - Fix owner_id trigger references
-- The request_forms table uses 'user_id', not 'owner_id'
-- Run this SQL in Supabase SQL Editor to fix form submission errors
-- ============================================================================

-- Fix: notify_form_owner_on_new_request trigger
CREATE OR REPLACE FUNCTION notify_form_owner_on_new_request()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_form_title TEXT;
BEGIN
  -- Get form owner and title (column is user_id, not owner_id)
  SELECT user_id, title INTO v_owner_id, v_form_title
  FROM request_forms
  WHERE id = NEW.form_id;

  -- Don't notify yourself
  IF v_owner_id IS NOT NULL AND v_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_owner_id,
      'new_request',
      'New request received',
      COALESCE(NEW.submitter_name, 'Someone') || ' submitted a request for "' || COALESCE(v_form_title, 'your form') || '"',
      '/dashboard',
      jsonb_build_object('request_id', NEW.id, 'form_id', NEW.form_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: notify_on_request_status_change trigger
CREATE OR REPLACE FUNCTION notify_on_request_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_submitter_name TEXT;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Notify the form owner (column is user_id, not owner_id)
  SELECT user_id INTO v_owner_id
  FROM request_forms
  WHERE id = NEW.form_id;

  IF v_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_owner_id,
      'request_status_change',
      'Request status updated',
      'Request from ' || COALESCE(NEW.submitter_name, 'Anonymous') || ' moved to "' || NEW.status || '"',
      '/dashboard',
      jsonb_build_object('request_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;