-- ============================================================================
-- JanitorForge - Collaboration Enhancements Migration
-- Change Request System + Quick Actions + Workspace Page
-- ============================================================================

-- 1. Add approval_required toggle to bots table
ALTER TABLE bots ADD COLUMN IF NOT EXISTS require_collab_approval BOOLEAN DEFAULT FALSE;

-- 2. Create bot_change_requests table
CREATE TABLE IF NOT EXISTS bot_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  proposed_changes JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_requests_bot_id ON bot_change_requests(bot_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_author_id ON bot_change_requests(author_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON bot_change_requests(status);

-- 3. RLS for change_requests
ALTER TABLE bot_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view own change requests"
  ON bot_change_requests FOR SELECT TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Bot owners can view change requests for their bots"
  ON bot_change_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM bots WHERE bots.id = bot_change_requests.bot_id AND bots.user_id = auth.uid()));

CREATE POLICY "Co-owners can view change requests"
  ON bot_change_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bot_collaborators
    WHERE bot_collaborators.bot_id = bot_change_requests.bot_id
    AND bot_collaborators.user_id = auth.uid()
    AND bot_collaborators.role = 'co_owner' AND bot_collaborators.status = 'accepted'
  ));

CREATE POLICY "Editors can create change requests"
  ON bot_change_requests FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM bot_collaborators WHERE bot_collaborators.bot_id = bot_change_requests.bot_id AND bot_collaborators.user_id = auth.uid() AND bot_collaborators.role IN ('editor', 'co_owner') AND bot_collaborators.status = 'accepted')
      OR EXISTS (SELECT 1 FROM bots WHERE bots.id = bot_change_requests.bot_id AND bots.user_id = auth.uid())
    )
  );

CREATE POLICY "Bot owners can update change requests"
  ON bot_change_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM bots WHERE bots.id = bot_change_requests.bot_id AND bots.user_id = auth.uid()));

-- 4. RPC: Get change requests for a bot
CREATE OR REPLACE FUNCTION get_bot_change_requests(p_bot_id UUID)
RETURNS TABLE (
  id UUID, bot_id UUID, author_id UUID, status TEXT,
  proposed_changes JSONB, description TEXT,
  reviewed_by UUID, reviewed_at TIMESTAMPTZ, rejection_reason TEXT,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  author_username TEXT, author_display_name TEXT, author_avatar_url TEXT,
  reviewer_username TEXT, reviewer_display_name TEXT
) SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT cr.id, cr.bot_id, cr.author_id, cr.status,
    cr.proposed_changes, cr.description,
    cr.reviewed_by, cr.reviewed_at, cr.rejection_reason,
    cr.created_at, cr.updated_at,
    pa.username, pa.display_name, pa.avatar_url,
    pr.username, pr.display_name
  FROM bot_change_requests cr
  LEFT JOIN profiles pa ON pa.id = cr.author_id
  LEFT JOIN profiles pr ON pr.id = cr.reviewed_by
  WHERE cr.bot_id = p_bot_id
  ORDER BY cr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. RPC: Get pending change requests count for owner
CREATE OR REPLACE FUNCTION get_pending_change_requests_count(p_user_id UUID)
RETURNS INTEGER SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM bot_change_requests cr JOIN bots b ON b.id = cr.bot_id
  WHERE b.user_id = p_user_id AND cr.status = 'pending';
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;