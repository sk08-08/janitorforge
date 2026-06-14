-- ============================================================================
-- JanitorForge - Forms Improvements Migration
-- Run this file to add: conditional fields, form templates,
-- audit log, honeypot anti-bot, in-app notifications
-- ============================================================================

-- ============================================================================
-- 1. CONDITIONAL FIELDS: Add `conditions` column to form sections/fields
-- ============================================================================
-- The existing `sections` column in request_forms is JSONB storing an array
-- of sections, each with a `fields` array. We add `conditions` to fields
-- as an optional JSONB property. No schema change needed since it's JSONB.
-- However, we add a comment for documentation:
COMMENT ON COLUMN request_forms.sections IS
  'JSONB array of sections. Each section has: id, title, description, fields[], custom{}. '
  'Each field may include a `conditions` array: [{fieldId, operator, value}] '
  'where operator is one of: equals, not_equals, contains, is_not_empty, is_empty';

-- ============================================================================
-- 2. FORM TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',  -- general, bot_request, feedback, commission, custom
  icon TEXT DEFAULT 'FileText',               -- lucide icon name
  is_builtin BOOLEAN DEFAULT false,           -- true = system template, false = user-created
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL for built-in
  sections JSONB NOT NULL DEFAULT '[]',       -- same format as request_forms.sections
  appearance JSONB,                           -- optional appearance preset
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for form_templates
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can read built-in templates
CREATE POLICY "Anyone can view built-in templates"
  ON form_templates FOR SELECT
  USING (is_builtin = true);

-- Owners can view their own templates
CREATE POLICY "Users can view own templates"
  ON form_templates FOR SELECT
  USING (auth.uid() = owner_id);

-- Owners can create templates
CREATE POLICY "Users can create templates"
  ON form_templates FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Owners can update their own templates
CREATE POLICY "Users can update own templates"
  ON form_templates FOR UPDATE
  USING (auth.uid() = owner_id);

-- Owners can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON form_templates FOR DELETE
  USING (auth.uid() = owner_id);

-- Index for fast lookup
CREATE INDEX idx_form_templates_owner ON form_templates(owner_id);
CREATE INDEX idx_form_templates_builtin ON form_templates(is_builtin) WHERE is_builtin = true;
CREATE INDEX idx_form_templates_category ON form_templates(category);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_form_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER form_templates_updated_at
  BEFORE UPDATE ON form_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_form_templates_updated_at();

-- ============================================================================
-- 3. SEED BUILT-IN TEMPLATES
-- ============================================================================
INSERT INTO form_templates (name, description, category, icon, is_builtin, sections) VALUES
-- Template 1: Bot Request
(
  'Bot Request Form',
  'Standard form for requesting custom bots from creators.',
  'bot_request',
  'Bot',
  true,
  '[
    {
      "id": "sec-1",
      "title": "Bot Details",
      "description": "Describe the bot you want.",
      "fields": [
        {"id": "f-1", "type": "text", "label": "Bot Name", "placeholder": "Enter a name for the bot", "required": true},
        {"id": "f-2", "type": "textarea", "label": "Bot Description", "placeholder": "What should this bot do? Describe personality, purpose, etc.", "required": true},
        {"id": "f-3", "type": "tags", "label": "Tags", "placeholder": "Add relevant tags", "required": false},
        {"id": "f-4", "type": "rating-type", "label": "Rating", "required": true}
      ],
      "custom": {"headerAlignment": "left", "collapsible": false}
    },
    {
      "id": "sec-2",
      "title": "Additional Details",
      "description": "Any extra information or references.",
      "fields": [
        {"id": "f-5", "type": "textarea", "label": "Reference Links", "placeholder": "Links to character sheets, lore, etc.", "required": false},
        {"id": "f-6", "type": "select", "label": "Priority", "options": ["Low", "Normal", "High", "Urgent"], "required": false},
        {"id": "f-7", "type": "textarea", "label": "Special Instructions", "placeholder": "Any other details or preferences", "required": false}
      ],
      "custom": {"headerAlignment": "left", "collapsible": true}
    }
  ]'
),
-- Template 2: Bug Report
(
  'Bug Report',
  'Collect bug reports from users with structured details.',
  'general',
  'Bug',
  true,
  '[
    {
      "id": "sec-1",
      "title": "Issue Description",
      "fields": [
        {"id": "f-1", "type": "text", "label": "Summary", "placeholder": "Brief description of the issue", "required": true},
        {"id": "f-2", "type": "textarea", "label": "Steps to Reproduce", "placeholder": "1. Go to...\n2. Click on...\n3. See error...", "required": true},
        {"id": "f-3", "type": "select", "label": "Severity", "options": ["Low", "Medium", "High", "Critical"], "required": true},
        {"id": "f-4", "type": "radio", "label": "Is this reproducible?", "options": ["Yes", "No", "Sometimes"], "required": true}
      ],
      "custom": {"headerAlignment": "left"}
    },
    {
      "id": "sec-2",
      "title": "Environment",
      "fields": [
        {"id": "f-5", "type": "text", "label": "Browser / Device", "placeholder": "e.g., Chrome 120, iPhone 15", "required": false},
        {"id": "f-6", "type": "textarea", "label": "Screenshots / Additional Info", "placeholder": "Paste screenshots or extra details", "required": false}
      ],
      "custom": {"headerAlignment": "left", "collapsible": true}
    }
  ]'
),
-- Template 3: Suggestion
(
  'Suggestion Box',
  'Collect feature suggestions and improvement ideas.',
  'general',
  'Lightbulb',
  true,
  '[
    {
      "id": "sec-1",
      "title": "Your Idea",
      "fields": [
        {"id": "f-1", "type": "text", "label": "Title", "placeholder": "One-line summary of your idea", "required": true},
        {"id": "f-2", "type": "textarea", "label": "Description", "placeholder": "Describe your suggestion in detail. Why is it useful? How should it work?", "required": true},
        {"id": "f-3", "type": "select", "label": "Category", "options": ["UI/UX", "New Feature", "Performance", "Other"], "required": false},
        {"id": "f-4", "type": "radio", "label": "How important is this to you?", "options": ["Nice to have", "Important", "Critical"], "required": false}
      ],
      "custom": {"headerAlignment": "left"}
    }
  ]'
),
-- Template 4: Commission Request
(
  'Commission Request',
  'Detailed commission intake form with pricing tiers.',
  'commission',
  'Paintbrush',
  true,
  '[
    {
      "id": "sec-1",
      "title": "Commission Details",
      "fields": [
        {"id": "f-1", "type": "text", "label": "Commission Title", "placeholder": "Name your commission", "required": true},
        {"id": "f-2", "type": "select", "label": "Type", "options": ["Character Bot", "World/Lore Bot", "Utility Bot", "Other"], "required": true},
        {"id": "f-3", "type": "textarea", "label": "Detailed Description", "placeholder": "Describe everything you want in detail", "required": true},
        {"id": "f-4", "type": "tags", "label": "Keywords / Tags", "placeholder": "Add relevant tags", "required": false}
      ],
      "custom": {"headerAlignment": "center"}
    },
    {
      "id": "sec-2",
      "title": "Budget & Timeline",
      "fields": [
        {"id": "f-5", "type": "radio", "label": "Budget Range", "options": ["Free / Tip only", "$5-15", "$15-30", "$30+", "Negotiable"], "required": true},
        {"id": "f-6", "type": "radio", "label": "Deadline", "options": ["No rush", "Within 1 week", "Within 2 weeks", "ASAP"], "required": false},
        {"id": "f-7", "type": "textarea", "label": "References / Links", "placeholder": "Character sheets, images, etc.", "required": false}
      ],
      "custom": {"headerAlignment": "left", "collapsible": true}
    }
  ]'
);

-- ============================================================================
-- 4. AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS moderation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,            -- 'approve', 'reject', 'block_ip', 'unblock_ip', 'delete_submission', 'change_sensitivity'
  target_type TEXT NOT NULL,       -- 'submission', 'ip', 'flagged_request', 'blocklist'
  target_id TEXT,                  -- ID of the affected record
  details JSONB,                   -- Additional context (notes, reason, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE moderation_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins/moderators can read all audit logs
CREATE POLICY "Admins can view audit logs"
  ON moderation_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.is_moderator = true)
    )
  );

-- Only authenticated users can insert (moderation actions)
CREATE POLICY "Authenticated can insert audit logs"
  ON moderation_audit_log FOR INSERT
  WITH CHECK (auth.uid() = moderator_id);

CREATE INDEX idx_audit_log_moderator ON moderation_audit_log(moderator_id);
CREATE INDEX idx_audit_log_target ON moderation_audit_log(target_type, target_id);
CREATE INDEX idx_audit_log_created ON moderation_audit_log(created_at DESC);

-- ============================================================================
-- 5. HONEYPOT / ANTI-BOT FIELD
-- ============================================================================
-- Add honeypot tracking to requests table
-- The honeypot field is a hidden field that bots auto-fill but humans don't
ALTER TABLE requests ADD COLUMN IF NOT EXISTS honeypot_value TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS submission_ip TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS submission_user_agent TEXT;

COMMENT ON COLUMN requests.honeypot_value IS
  'If non-empty, the submission was likely from a bot (honeypot triggered).';
COMMENT ON COLUMN requests.submission_ip IS
  'IP address of the submitter for rate limiting and IP blocking.';
COMMENT ON COLUMN requests.submission_user_agent IS
  'User-Agent header of the submitter for bot detection.';

-- ============================================================================
-- 6. IN-APP NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,          -- 'new_request', 'request_status_change', 'new_submission', 'flagged_submission', 'form_shared', 'collaboration_invite'
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,                   -- Optional navigation link (e.g., /dashboard?view=requests)
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,              -- Additional context data
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- System can insert notifications (via triggers or server functions)
CREATE POLICY "Authenticated can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;

-- ============================================================================
-- 7. TRIGGER: Auto-notify form owner on new request
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_form_owner_on_new_request()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_form_title TEXT;
BEGIN
  -- Get form owner and title
  SELECT owner_id, title INTO v_owner_id, v_form_title
  FROM request_forms
  WHERE id = NEW.form_id;

  -- Don't notify yourself
  IF v_owner_id IS NOT NULL AND v_owner_id != NEW.owner_id THEN
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

CREATE TRIGGER on_new_request_notify_owner
  AFTER INSERT ON requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_form_owner_on_new_request();

-- ============================================================================
-- 8. TRIGGER: Auto-notify on request status change
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_on_request_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_submitter_name TEXT;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Notify the form owner
  SELECT owner_id INTO v_owner_id
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

CREATE TRIGGER on_request_status_change_notify
  AFTER UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_request_status_change();

-- ============================================================================
-- 9. FUNCTION: Get unread notification count
-- ============================================================================
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM notifications
  WHERE user_id = p_user_id AND is_read = false;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- 10. FUNCTION: Mark notification as read
-- ============================================================================
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS VOID AS $$
  UPDATE notifications
  SET is_read = true
  WHERE id = p_notification_id AND user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- 11. FUNCTION: Mark all notifications as read
-- ============================================================================
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
  UPDATE notifications
  SET is_read = true
  WHERE user_id = p_user_id AND is_read = false;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- 12. FUNCTION: Increment template usage count
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS VOID AS $$
  UPDATE form_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- 13. IP BLOCKLIST TABLE (for IP blocking from moderation panel)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ip_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT,
  blocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ip_blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage IP blocklist"
  ON ip_blocklist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX idx_ip_blocklist_address ON ip_blocklist(ip_address);

-- ============================================================================
-- DONE. Summary of new tables:
-- ============================================================================
-- form_templates: Pre-built and user-created form templates
-- moderation_audit_log: Activity log for all moderation actions
-- notifications: In-app notification system with auto-triggers
-- ip_blocklist: Blocked IP addresses from moderation panel
--
-- Modified tables:
-- requests: Added honeypot_value, submission_ip, submission_user_agent columns
-- request_forms: Added documentation comment on sections column for conditional fields
--
-- New triggers:
-- on_new_request_notify_owner: Notifies form owner on new submission
-- on_request_status_change_notify: Notifies on status change