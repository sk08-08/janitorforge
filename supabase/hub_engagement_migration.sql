-- ============================================================================
-- JanitorForge Hub Engagement Migration
-- Adds views, likes/dislikes, and comments for Logs and Resources
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Logs: views
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hub_log_post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.hub_log_posts(id) ON DELETE CASCADE,
  viewer_fingerprint TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, viewer_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_hub_log_post_views_post_id
  ON public.hub_log_post_views(post_id);

ALTER TABLE public.hub_log_post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view log post views" ON public.hub_log_post_views;
CREATE POLICY "Anyone can view log post views"
  ON public.hub_log_post_views FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- Logs: reactions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hub_log_post_reactions (
  post_id UUID NOT NULL REFERENCES public.hub_log_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction SMALLINT NOT NULL CHECK (reaction IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hub_log_post_reactions_post_id
  ON public.hub_log_post_reactions(post_id);

ALTER TABLE public.hub_log_post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view log post reactions" ON public.hub_log_post_reactions;
CREATE POLICY "Anyone can view log post reactions"
  ON public.hub_log_post_reactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own log reaction" ON public.hub_log_post_reactions;
CREATE POLICY "Users can insert own log reaction"
  ON public.hub_log_post_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own log reaction" ON public.hub_log_post_reactions;
CREATE POLICY "Users can update own log reaction"
  ON public.hub_log_post_reactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own log reaction" ON public.hub_log_post_reactions;
CREATE POLICY "Users can delete own log reaction"
  ON public.hub_log_post_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Logs: comments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hub_log_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.hub_log_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hub_log_post_comments_post_id
  ON public.hub_log_post_comments(post_id);

ALTER TABLE public.hub_log_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view log post comments" ON public.hub_log_post_comments;
CREATE POLICY "Anyone can view log post comments"
  ON public.hub_log_post_comments FOR SELECT
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert own log comments" ON public.hub_log_post_comments;
CREATE POLICY "Users can insert own log comments"
  ON public.hub_log_post_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own log comments" ON public.hub_log_post_comments;
CREATE POLICY "Users can update own log comments"
  ON public.hub_log_post_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own log comments" ON public.hub_log_post_comments;
CREATE POLICY "Users can delete own log comments"
  ON public.hub_log_post_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete log comments" ON public.hub_log_post_comments;
CREATE POLICY "Admins can delete log comments"
  ON public.hub_log_post_comments FOR DELETE
  USING (public.is_admin_user(auth.uid()));

-- ---------------------------------------------------------------------------
-- Resources: views
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hub_resource_entry_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.hub_resource_entries(id) ON DELETE CASCADE,
  viewer_fingerprint TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, viewer_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_hub_resource_entry_views_entry_id
  ON public.hub_resource_entry_views(entry_id);

ALTER TABLE public.hub_resource_entry_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view resource entry views" ON public.hub_resource_entry_views;
CREATE POLICY "Anyone can view resource entry views"
  ON public.hub_resource_entry_views FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- Resources: reactions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hub_resource_entry_reactions (
  entry_id UUID NOT NULL REFERENCES public.hub_resource_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction SMALLINT NOT NULL CHECK (reaction IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hub_resource_entry_reactions_entry_id
  ON public.hub_resource_entry_reactions(entry_id);

ALTER TABLE public.hub_resource_entry_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view resource entry reactions" ON public.hub_resource_entry_reactions;
CREATE POLICY "Anyone can view resource entry reactions"
  ON public.hub_resource_entry_reactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own resource reaction" ON public.hub_resource_entry_reactions;
CREATE POLICY "Users can insert own resource reaction"
  ON public.hub_resource_entry_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own resource reaction" ON public.hub_resource_entry_reactions;
CREATE POLICY "Users can update own resource reaction"
  ON public.hub_resource_entry_reactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own resource reaction" ON public.hub_resource_entry_reactions;
CREATE POLICY "Users can delete own resource reaction"
  ON public.hub_resource_entry_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Resources: comments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hub_resource_entry_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.hub_resource_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hub_resource_entry_comments_entry_id
  ON public.hub_resource_entry_comments(entry_id);

ALTER TABLE public.hub_resource_entry_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view resource entry comments" ON public.hub_resource_entry_comments;
CREATE POLICY "Anyone can view resource entry comments"
  ON public.hub_resource_entry_comments FOR SELECT
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert own resource comments" ON public.hub_resource_entry_comments;
CREATE POLICY "Users can insert own resource comments"
  ON public.hub_resource_entry_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own resource comments" ON public.hub_resource_entry_comments;
CREATE POLICY "Users can update own resource comments"
  ON public.hub_resource_entry_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own resource comments" ON public.hub_resource_entry_comments;
CREATE POLICY "Users can delete own resource comments"
  ON public.hub_resource_entry_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete resource comments" ON public.hub_resource_entry_comments;
CREATE POLICY "Admins can delete resource comments"
  ON public.hub_resource_entry_comments FOR DELETE
  USING (public.is_admin_user(auth.uid()));

-- ---------------------------------------------------------------------------
-- Shared updated_at triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_hub_interaction_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_hub_log_post_reactions_updated_at ON public.hub_log_post_reactions;
CREATE TRIGGER trg_set_hub_log_post_reactions_updated_at
  BEFORE UPDATE ON public.hub_log_post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_hub_interaction_updated_at();

DROP TRIGGER IF EXISTS trg_set_hub_log_post_comments_updated_at ON public.hub_log_post_comments;
CREATE TRIGGER trg_set_hub_log_post_comments_updated_at
  BEFORE UPDATE ON public.hub_log_post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_hub_interaction_updated_at();

DROP TRIGGER IF EXISTS trg_set_hub_resource_entry_reactions_updated_at ON public.hub_resource_entry_reactions;
CREATE TRIGGER trg_set_hub_resource_entry_reactions_updated_at
  BEFORE UPDATE ON public.hub_resource_entry_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_hub_interaction_updated_at();

DROP TRIGGER IF EXISTS trg_set_hub_resource_entry_comments_updated_at ON public.hub_resource_entry_comments;
CREATE TRIGGER trg_set_hub_resource_entry_comments_updated_at
  BEFORE UPDATE ON public.hub_resource_entry_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_hub_interaction_updated_at();

-- ---------------------------------------------------------------------------
-- View recorder RPCs (supports anon + authenticated unique view counting)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_hub_log_post_view(
  p_post_id UUID,
  p_viewer_fingerprint TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_post_id IS NULL OR p_viewer_fingerprint IS NULL OR btrim(p_viewer_fingerprint) = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.hub_log_post_views (post_id, viewer_fingerprint, user_id, viewed_at)
  VALUES (p_post_id, btrim(p_viewer_fingerprint), p_user_id, now())
  ON CONFLICT (post_id, viewer_fingerprint)
  DO UPDATE
  SET
    user_id = COALESCE(EXCLUDED.user_id, public.hub_log_post_views.user_id),
    viewed_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_hub_log_post_view(UUID, TEXT, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_hub_resource_entry_view(
  p_entry_id UUID,
  p_viewer_fingerprint TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_entry_id IS NULL OR p_viewer_fingerprint IS NULL OR btrim(p_viewer_fingerprint) = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.hub_resource_entry_views (entry_id, viewer_fingerprint, user_id, viewed_at)
  VALUES (p_entry_id, btrim(p_viewer_fingerprint), p_user_id, now())
  ON CONFLICT (entry_id, viewer_fingerprint)
  DO UPDATE
  SET
    user_id = COALESCE(EXCLUDED.user_id, public.hub_resource_entry_views.user_id),
    viewed_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_hub_resource_entry_view(UUID, TEXT, UUID) TO anon, authenticated;
