-- ============================================================================
-- JanitorForge - Collaboration Overhaul Migration
-- Fixes: pending invite visibility, notifications on invite, activity log
-- Run AFTER profiles_migration.sql and fix_collaboration_rls.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Bot Activity Log (tracks collaborator actions)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bot_activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'created', 'edited', 'exported', 'forked',
    'collaborator_invited', 'collaborator_accepted', 'collaborator_declined',
    'collaborator_removed', 'role_changed', 'commented'
  )),
  details JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bot_activity_log_bot_id_idx ON public.bot_activity_log(bot_id);
CREATE INDEX IF NOT EXISTS bot_activity_log_user_id_idx ON public.bot_activity_log(user_id);
CREATE INDEX IF NOT EXISTS bot_activity_log_created_at_idx ON public.bot_activity_log(created_at DESC);

ALTER TABLE public.bot_activity_log ENABLE ROW LEVEL SECURITY;

-- Activity log visible to bot owner and accepted collaborators
CREATE POLICY "Bot owners and collaborators can view activity log"
  ON public.bot_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE id = bot_id AND user_id = auth.uid()
    )
    OR public.is_bot_collaborator(bot_id, auth.uid())
  );

-- Only authenticated users can insert activity (server actions handle this)
CREATE POLICY "Authenticated users can insert activity"
  ON public.bot_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. Bot Comments (collaborator feedback/notes)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bot_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.bot_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bot_comments_bot_id_idx ON public.bot_comments(bot_id);
CREATE INDEX IF NOT EXISTS bot_comments_parent_id_idx ON public.bot_comments(parent_id);

ALTER TABLE public.bot_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bot owners and collaborators can view comments"
  ON public.bot_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE id = bot_id AND user_id = auth.uid()
    )
    OR public.is_bot_collaborator(bot_id, auth.uid())
  );

CREATE POLICY "Collaborators can insert comments"
  ON public.bot_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.bots
        WHERE id = bot_id AND user_id = auth.uid()
      )
      OR public.is_bot_collaborator(bot_id, auth.uid())
    )
  );

CREATE POLICY "Comment authors can update their comments"
  ON public.bot_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Comment authors and bot owners can delete comments"
  ON public.bot_comments FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.bots
      WHERE id = bot_id AND user_id = auth.uid()
    )
  );

-- Updated_at trigger for comments
CREATE OR REPLACE FUNCTION public.set_bot_comments_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_set_bot_comments_updated_at ON public.bot_comments;
CREATE TRIGGER trg_set_bot_comments_updated_at
  BEFORE UPDATE ON public.bot_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_bot_comments_updated_at();

-- ---------------------------------------------------------------------------
-- 3. SECURITY DEFINER function: Get pending invites with bot info
--    Bypasses RLS so invited users can see bot name/image even before accepting
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_pending_invites_with_bot_info(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  bot_id UUID,
  invited_by UUID,
  role TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  bot_name TEXT,
  bot_image_url TEXT,
  bot_short_description TEXT,
  inviter_username TEXT,
  inviter_display_name TEXT,
  inviter_avatar_url TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    bc.id,
    bc.bot_id,
    bc.invited_by,
    bc.role,
    bc.status,
    bc.created_at,
    b.name AS bot_name,
    b.image_url AS bot_image_url,
    b.short_description AS bot_short_description,
    p_inviter.username AS inviter_username,
    p_inviter.display_name AS inviter_display_name,
    p_inviter.avatar_url AS inviter_avatar_url
  FROM public.bot_collaborators bc
  JOIN public.bots b ON b.id = bc.bot_id
  LEFT JOIN public.profiles p_inviter ON p_inviter.id = bc.invited_by
  WHERE bc.user_id = p_user_id
    AND bc.status = 'pending'
  ORDER BY bc.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_invites_with_bot_info(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. SECURITY DEFINER function: Get collaborative bots for a user
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_collaborative_bots(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  chat_name TEXT,
  short_description TEXT,
  personality TEXT,
  first_message TEXT,
  alternate_greetings TEXT[],
  scenario TEXT,
  example_dialogues TEXT,
  tags TEXT[],
  rating TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  collaborator_role TEXT,
  collaborator_status TEXT,
  owner_username TEXT,
  owner_display_name TEXT,
  owner_avatar_url TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.user_id,
    b.name,
    b.chat_name,
    b.short_description,
    b.personality,
    b.first_message,
    b.alternate_greetings,
    b.scenario,
    b.example_dialogues,
    b.tags,
    b.rating,
    b.image_url,
    b.created_at,
    b.updated_at,
    bc.role AS collaborator_role,
    bc.status AS collaborator_status,
    p_owner.username AS owner_username,
    p_owner.display_name AS owner_display_name,
    p_owner.avatar_url AS owner_avatar_url
  FROM public.bot_collaborators bc
  JOIN public.bots b ON b.id = bc.bot_id
  LEFT JOIN public.profiles p_owner ON p_owner.id = b.user_id
  WHERE bc.user_id = p_user_id
    AND bc.status = 'accepted'
  ORDER BY b.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_collaborative_bots(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. SECURITY DEFINER function: Check if user can manage collaborators
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_bot_owner(p_bot_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bots
    WHERE id = p_bot_id AND user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_bot_owner(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. SECURITY DEFINER function: Get bot activity log
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_bot_activity(p_bot_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  bot_id UUID,
  user_id UUID,
  action TEXT,
  details JSONB,
  created_at TIMESTAMPTZ,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    al.id,
    al.bot_id,
    al.user_id,
    al.action,
    al.details,
    al.created_at,
    p.username,
    p.display_name,
    p.avatar_url
  FROM public.bot_activity_log al
  LEFT JOIN public.profiles p ON p.id = al.user_id
  WHERE al.bot_id = p_bot_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_bot_activity(UUID, INTEGER) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Trigger: Create notification when a collaborator is invited
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_collaborator_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot_name TEXT;
  v_inviter_name TEXT;
BEGIN
  -- Only fire for new pending invites
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get bot name
  SELECT name INTO v_bot_name FROM public.bots WHERE id = NEW.bot_id;

  -- Get inviter display name
  SELECT COALESCE(display_name, username) INTO v_inviter_name
  FROM public.profiles WHERE id = NEW.invited_by;

  -- Create notification for the invited user
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.user_id,
    'collaboration_invite',
    'Collaboration Invite',
    COALESCE(v_inviter_name, 'Someone') || ' invited you to collaborate on "' || COALESCE(v_bot_name, 'a bot') || '"',
    '/dashboard?view=bots',
    jsonb_build_object(
      'bot_id', NEW.bot_id,
      'bot_name', v_bot_name,
      'invited_by', NEW.invited_by,
      'inviter_name', v_inviter_name,
      'role', NEW.role,
      'collaborator_id', NEW.id
    )
  );

  -- Log activity
  INSERT INTO public.bot_activity_log (bot_id, user_id, action, details)
  VALUES (
    NEW.bot_id,
    NEW.invited_by,
    'collaborator_invited',
    jsonb_build_object(
      'invited_user_id', NEW.user_id,
      'role', NEW.role
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_collaborator_invite ON public.bot_collaborators;
CREATE TRIGGER on_collaborator_invite
  AFTER INSERT ON public.bot_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.notify_collaborator_invite();

-- ---------------------------------------------------------------------------
-- 8. Trigger: Log activity when invite is accepted/declined
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_collaborator_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO public.bot_activity_log (bot_id, user_id, action, details)
    VALUES (
      NEW.bot_id,
      NEW.user_id,
      'collaborator_accepted',
      jsonb_build_object('role', NEW.role)
    );
  ELSIF OLD.status = 'pending' AND NEW.status = 'declined' THEN
    INSERT INTO public.bot_activity_log (bot_id, user_id, action, details)
    VALUES (
      NEW.bot_id,
      NEW.user_id,
      'collaborator_declined',
      jsonb_build_object('role', NEW.role)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_collaborator_response ON public.bot_collaborators;
CREATE TRIGGER on_collaborator_response
  AFTER UPDATE ON public.bot_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.log_collaborator_response();

-- ---------------------------------------------------------------------------
-- 9. Allow collaborators to update their own invite response
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Collaborators can respond to their own invites" ON public.bot_collaborators;
CREATE POLICY "Collaborators can respond to their own invites"
  ON public.bot_collaborators FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('accepted', 'declined'));