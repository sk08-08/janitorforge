-- ============================================================================
-- JanitorForge Hub Content Migration
-- Adds editable content tables for Resources and Logs hubs
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Resource sections
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hub_resource_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_resource_sections_sort_order
  ON public.hub_resource_sections(sort_order);

CREATE INDEX IF NOT EXISTS idx_hub_resource_sections_is_published
  ON public.hub_resource_sections(is_published);

CREATE OR REPLACE FUNCTION public.set_hub_resource_sections_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_hub_resource_sections_updated_at ON public.hub_resource_sections;
CREATE TRIGGER trg_set_hub_resource_sections_updated_at
  BEFORE UPDATE ON public.hub_resource_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_hub_resource_sections_updated_at();

-- ---------------------------------------------------------------------------
-- Resource entries
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hub_resource_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.hub_resource_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_resource_entries_section_id
  ON public.hub_resource_entries(section_id);

CREATE INDEX IF NOT EXISTS idx_hub_resource_entries_sort_order
  ON public.hub_resource_entries(sort_order);

CREATE INDEX IF NOT EXISTS idx_hub_resource_entries_is_published
  ON public.hub_resource_entries(is_published);

CREATE OR REPLACE FUNCTION public.set_hub_resource_entries_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_hub_resource_entries_updated_at ON public.hub_resource_entries;
CREATE TRIGGER trg_set_hub_resource_entries_updated_at
  BEFORE UPDATE ON public.hub_resource_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_hub_resource_entries_updated_at();

-- ---------------------------------------------------------------------------
-- Log posts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hub_log_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT,
  label TEXT,
  source_name TEXT,
  source_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_log_posts_sort_order
  ON public.hub_log_posts(sort_order);

CREATE INDEX IF NOT EXISTS idx_hub_log_posts_is_published
  ON public.hub_log_posts(is_published);

CREATE INDEX IF NOT EXISTS idx_hub_log_posts_published_at
  ON public.hub_log_posts(published_at DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.set_hub_log_posts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_hub_log_posts_updated_at ON public.hub_log_posts;
CREATE TRIGGER trg_set_hub_log_posts_updated_at
  BEFORE UPDATE ON public.hub_log_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_hub_log_posts_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.hub_resource_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_resource_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_log_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published resource sections are visible to everyone" ON public.hub_resource_sections;
CREATE POLICY "Published resource sections are visible to everyone"
  ON public.hub_resource_sections FOR SELECT
  USING (is_published = true OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage resource sections" ON public.hub_resource_sections;
CREATE POLICY "Admins can manage resource sections"
  ON public.hub_resource_sections FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Published resource entries are visible to everyone" ON public.hub_resource_entries;
CREATE POLICY "Published resource entries are visible to everyone"
  ON public.hub_resource_entries FOR SELECT
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1
      FROM public.hub_resource_sections
      WHERE id = section_id
        AND is_published = true
    )
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage resource entries" ON public.hub_resource_entries;
CREATE POLICY "Admins can manage resource entries"
  ON public.hub_resource_entries FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Published log posts are visible to everyone" ON public.hub_log_posts;
CREATE POLICY "Published log posts are visible to everyone"
  ON public.hub_log_posts FOR SELECT
  USING (is_published = true OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage log posts" ON public.hub_log_posts;
CREATE POLICY "Admins can manage log posts"
  ON public.hub_log_posts FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));
