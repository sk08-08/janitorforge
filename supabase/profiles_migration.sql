-- ============================================================================
-- JanitorForge - Creator Profiles & Pages Migration
-- Run after schema.sql, atlas.sql, and feedback_admin_migration.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extend profiles with public-facing fields
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '' NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT '' NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}' NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{"primaryColor":"#7c3aed","accentColor":"#a78bfa","layout":"grid"}' NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS profiles_slug_idx ON public.profiles(slug);

-- Allow public read of profiles for creator pages
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- Creator Pages (customizable sub-pages for bot creators)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.creator_pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  layout TEXT NOT NULL DEFAULT 'grid' CHECK (layout IN ('grid', 'showcase', 'timeline', 'list')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT creator_pages_user_slug_unique UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS creator_pages_user_id_idx ON public.creator_pages(user_id);
CREATE INDEX IF NOT EXISTS creator_pages_slug_idx ON public.creator_pages(slug);

-- ---------------------------------------------------------------------------
-- Creator Page Sections (modular content blocks)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.creator_page_sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.creator_pages(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('bot_showcase', 'world_showcase', 'text_block', 'lorebook_gallery', 'banner', 'bot_group')),
  title TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS creator_page_sections_page_id_idx ON public.creator_page_sections(page_id);

-- ---------------------------------------------------------------------------
-- Bot Collaborators (co-creator invites)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bot_collaborators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'co_owner')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bot_collaborators_unique UNIQUE (bot_id, user_id)
);

CREATE INDEX IF NOT EXISTS bot_collaborators_bot_id_idx ON public.bot_collaborators(bot_id);
CREATE INDEX IF NOT EXISTS bot_collaborators_user_id_idx ON public.bot_collaborators(user_id);

-- ---------------------------------------------------------------------------
-- Bot Forks (remix with credit)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bot_forks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  original_bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  forked_bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  forked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fork_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bot_forks_original_idx ON public.bot_forks(original_bot_id);
CREATE INDEX IF NOT EXISTS bot_forks_forked_by_idx ON public.bot_forks(forked_by);

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_creator_pages_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_set_creator_pages_updated_at ON public.creator_pages;
CREATE TRIGGER trg_set_creator_pages_updated_at
  BEFORE UPDATE ON public.creator_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_creator_pages_updated_at();

CREATE OR REPLACE FUNCTION public.set_creator_page_sections_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_set_creator_page_sections_updated_at ON public.creator_page_sections;
CREATE TRIGGER trg_set_creator_page_sections_updated_at
  BEFORE UPDATE ON public.creator_page_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_creator_page_sections_updated_at();

CREATE OR REPLACE FUNCTION public.set_bot_collaborators_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_set_bot_collaborators_updated_at ON public.bot_collaborators;
CREATE TRIGGER trg_set_bot_collaborators_updated_at
  BEFORE UPDATE ON public.bot_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.set_bot_collaborators_updated_at();

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.creator_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_forks ENABLE ROW LEVEL SECURITY;

-- Creator Pages: public read for published, owner CRUD
CREATE POLICY "Published creator pages are viewable by everyone"
  ON public.creator_pages FOR SELECT
  USING (is_published = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own creator pages"
  ON public.creator_pages FOR ALL
  USING (auth.uid() = user_id);

-- Creator Page Sections: follow parent page visibility
CREATE POLICY "Sections visible if page is visible"
  ON public.creator_page_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_pages
      WHERE id = page_id AND (is_published = true OR user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage sections of their own pages"
  ON public.creator_page_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_pages
      WHERE id = page_id AND user_id = auth.uid()
    )
  );

-- Bot Collaborators: owner + collaborator can view
CREATE POLICY "Bot owners and collaborators can view collaborator records"
  ON public.bot_collaborators FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = invited_by
    OR EXISTS (
      SELECT 1 FROM public.bots
      WHERE id = bot_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Bot owners can manage collaborators"
  ON public.bot_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE id = bot_id AND user_id = auth.uid()
    )
  );

-- Bot Collaborators can view/edit shared bots
DROP POLICY IF EXISTS "Collaborators can view shared bots" ON public.bots;
CREATE POLICY "Collaborators can view shared bots"
  ON public.bots FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.bot_collaborators
      WHERE bot_id = bots.id AND user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Editors can update shared bots" ON public.bots;
CREATE POLICY "Editors can update shared bots"
  ON public.bots FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.bot_collaborators
      WHERE bot_id = bots.id AND user_id = auth.uid()
        AND status = 'accepted' AND role IN ('editor', 'co_owner')
    )
  );

-- Bot Forks: public read, authenticated insert
CREATE POLICY "Anyone can view bot forks"
  ON public.bot_forks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create forks"
  ON public.bot_forks FOR INSERT
  WITH CHECK (auth.uid() = forked_by);