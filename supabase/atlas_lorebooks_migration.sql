-- ============================================================================
-- JanitorForge - Atlas incremental migration (Lorebooks vs Entries)
-- Apply this on top of an existing Atlas schema.
-- This file is idempotent-safe for most statements.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1) Worlds: move from featured_entry_ids -> featured_lorebook_ids
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.atlas_worlds
  ADD COLUMN IF NOT EXISTS featured_lorebook_ids UUID[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'atlas_worlds'
      AND column_name = 'featured_entry_ids'
  ) THEN
    UPDATE public.atlas_worlds
    SET featured_lorebook_ids = COALESCE(featured_entry_ids, '{}')
    WHERE (featured_lorebook_ids IS NULL OR cardinality(featured_lorebook_ids) = 0)
      AND featured_entry_ids IS NOT NULL;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2) Create atlas_lorebooks (new first-class entity)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.atlas_lorebooks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  world_id UUID REFERENCES public.atlas_worlds(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS atlas_lorebooks_user_id_idx
  ON public.atlas_lorebooks(user_id);

CREATE INDEX IF NOT EXISTS atlas_lorebooks_world_id_idx
  ON public.atlas_lorebooks(world_id);

CREATE INDEX IF NOT EXISTS atlas_lorebooks_updated_at_idx
  ON public.atlas_lorebooks(updated_at DESC);

CREATE OR REPLACE FUNCTION public.set_atlas_lorebooks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_atlas_lorebooks_updated_at ON public.atlas_lorebooks;
CREATE TRIGGER trg_set_atlas_lorebooks_updated_at
BEFORE UPDATE ON public.atlas_lorebooks
FOR EACH ROW
EXECUTE FUNCTION public.set_atlas_lorebooks_updated_at();

-- ---------------------------------------------------------------------------
-- 3) Entries now belong to a lorebook
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.atlas_entries
  ADD COLUMN IF NOT EXISTS lorebook_id UUID;

-- Create one fallback lorebook per world that has entries without lorebook_id.
INSERT INTO public.atlas_lorebooks (id, user_id, world_id, title, summary)
SELECT
  uuid_generate_v4(),
  w.user_id,
  w.id,
  w.title || ' Lorebook',
  'Migrated from legacy Atlas entries'
FROM public.atlas_worlds w
WHERE EXISTS (
  SELECT 1
  FROM public.atlas_entries e
  WHERE e.world_id = w.id
    AND e.lorebook_id IS NULL
)
AND NOT EXISTS (
  SELECT 1
  FROM public.atlas_lorebooks l
  WHERE l.world_id = w.id
);

-- Backfill lorebook_id using first lorebook in each world.
UPDATE public.atlas_entries e
SET lorebook_id = (
  SELECT l.id
  FROM public.atlas_lorebooks l
  WHERE l.world_id = e.world_id
  ORDER BY l.created_at ASC
  LIMIT 1
)
WHERE e.lorebook_id IS NULL;

-- Enforce relation and constraints.
ALTER TABLE public.atlas_entries
  ALTER COLUMN lorebook_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'atlas_entries_lorebook_id_fkey'
  ) THEN
    ALTER TABLE public.atlas_entries
      ADD CONSTRAINT atlas_entries_lorebook_id_fkey
      FOREIGN KEY (lorebook_id)
      REFERENCES public.atlas_lorebooks(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS atlas_entries_lorebook_id_idx
  ON public.atlas_entries(lorebook_id);

-- ---------------------------------------------------------------------------
-- 4) RLS for atlas_lorebooks and updated RLS for atlas_entries
-- ---------------------------------------------------------------------------

ALTER TABLE public.atlas_lorebooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own atlas lorebooks" ON public.atlas_lorebooks;
CREATE POLICY "Users can view their own atlas lorebooks"
  ON public.atlas_lorebooks
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.atlas_worlds
      WHERE public.atlas_worlds.id = world_id
        AND public.atlas_worlds.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create their own atlas lorebooks" ON public.atlas_lorebooks;
CREATE POLICY "Users can create their own atlas lorebooks"
  ON public.atlas_lorebooks
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.atlas_worlds
      WHERE public.atlas_worlds.id = world_id
        AND public.atlas_worlds.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own atlas lorebooks" ON public.atlas_lorebooks;
CREATE POLICY "Users can update their own atlas lorebooks"
  ON public.atlas_lorebooks
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.atlas_worlds
      WHERE public.atlas_worlds.id = world_id
        AND public.atlas_worlds.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.atlas_worlds
      WHERE public.atlas_worlds.id = world_id
        AND public.atlas_worlds.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own atlas lorebooks" ON public.atlas_lorebooks;
CREATE POLICY "Users can delete their own atlas lorebooks"
  ON public.atlas_lorebooks
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.atlas_worlds
      WHERE public.atlas_worlds.id = world_id
        AND public.atlas_worlds.user_id = auth.uid()
    )
  );

ALTER TABLE public.atlas_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own atlas entries" ON public.atlas_entries;
CREATE POLICY "Users can view their own atlas entries"
  ON public.atlas_entries
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.atlas_lorebooks
      WHERE public.atlas_lorebooks.id = lorebook_id
        AND public.atlas_lorebooks.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create their own atlas entries" ON public.atlas_entries;
CREATE POLICY "Users can create their own atlas entries"
  ON public.atlas_entries
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.atlas_lorebooks
      WHERE public.atlas_lorebooks.id = lorebook_id
        AND public.atlas_lorebooks.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own atlas entries" ON public.atlas_entries;
CREATE POLICY "Users can update their own atlas entries"
  ON public.atlas_entries
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.atlas_lorebooks
      WHERE public.atlas_lorebooks.id = lorebook_id
        AND public.atlas_lorebooks.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.atlas_lorebooks
      WHERE public.atlas_lorebooks.id = lorebook_id
        AND public.atlas_lorebooks.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own atlas entries" ON public.atlas_entries;
CREATE POLICY "Users can delete their own atlas entries"
  ON public.atlas_entries
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.atlas_lorebooks
      WHERE public.atlas_lorebooks.id = lorebook_id
        AND public.atlas_lorebooks.user_id = auth.uid()
    )
  );

COMMIT;
