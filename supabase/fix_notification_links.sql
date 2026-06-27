-- ============================================================================
-- Fix notification links
-- Correct all notification trigger links to point to real routes
-- ============================================================================

-- 1. Fix: New follower notification → link to follower's profile
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  v_follower_name TEXT;
  v_follower_username TEXT;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone'), username
  INTO v_follower_name, v_follower_username
  FROM profiles WHERE id = NEW.follower_id;

  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.following_id,
    'new_follower',
    'New follower',
    v_follower_name || ' started following you',
    CASE WHEN v_follower_username IS NOT NULL
      THEN '/profile/' || v_follower_username
      ELSE NULL
    END,
    jsonb_build_object('follower_id', NEW.follower_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix: New request notification → no hardcoded /dashboard link
-- The link should be NULL since the dashboard is a SPA
CREATE OR REPLACE FUNCTION notify_form_owner_on_new_request()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_form_title TEXT;
BEGIN
  SELECT user_id, title INTO v_owner_id, v_form_title
  FROM request_forms
  WHERE id = NEW.form_id;

  IF v_owner_id IS NOT NULL AND v_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_owner_id,
      'new_request',
      'New request received',
      COALESCE(NEW.submitter_name, 'Someone') || ' submitted a request for "' || COALESCE(v_form_title, 'your form') || '"',
      NULL,
      jsonb_build_object('request_id', NEW.id, 'form_id', NEW.form_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix: Collaboration invite notification link
-- Update the collaboration trigger to link to the bot page if possible
CREATE OR REPLACE FUNCTION notify_collaboration_invite()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_bot_name TEXT;
  v_bot_slug TEXT;
BEGIN
  SELECT user_id, name INTO v_owner_id, v_bot_name
  FROM bots WHERE id = NEW.bot_id;

  -- Get bot slug from the bots table (if slug column exists)
  -- Otherwise just use NULL link
  IF v_owner_id IS NOT NULL AND v_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      NEW.user_id,
      'collaboration_invite',
      'Collaboration invite',
      'You''ve been invited to collaborate on "' || COALESCE(v_bot_name, 'a bot') || '"',
      NULL,
      jsonb_build_object('bot_id', NEW.bot_id, 'role', NEW.role)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;