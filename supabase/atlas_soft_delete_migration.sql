-- ============================================================================
-- Atlas Soft Delete Migration
-- Adds deleted_at columns to atlas_worlds, atlas_lorebooks, atlas_entries
-- and updates RLS policies to hide soft-deleted rows.
-- ============================================================================

-- 1. Add deleted_at to atlas_worlds
ALTER TABLE public.atlas_worlds
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_atlas_worlds_deleted_at
  ON public.atlas_worlds(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 2. Add deleted_at to atlas_lorebooks
ALTER TABLE public.atlas_lorebooks
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_atlas_lorebooks_deleted_at
  ON public.atlas_lorebooks(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 3. Add deleted_at to atlas_entries
ALTER TABLE public.atlas_entries
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_atlas_entries_deleted_at
  ON public.atlas_entries(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- Update RLS SELECT policies to exclude soft-deleted rows
-- (INSERT/UPDATE/DELETE policies remain unchanged)
-- ============================================================================

-- atlas_worlds: add deleted_at IS NULL to SELECT
DROP POLICY IF EXISTS "Users can view their own atlas worlds" ON public.atlas_worlds;
CREATE POLICY "Users can view their own atlas worlds"
  ON public.atlas_worlds FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- atlas_lorebooks: add deleted_at IS NULL to SELECT
DROP POLICY IF EXISTS "Users can view their own atlas lorebooks" ON public.atlas_lorebooks;
CREATE POLICY "Users can view their own atlas lorebooks"
  ON public.atlas_lorebooks FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.atlas_worlds
      WHERE public.atlas_worlds.id = world_id
        AND public.atlas_worlds.user_id = auth.uid()
        AND public.atlas_worlds.deleted_at IS NULL
    )
  );

-- atlas_entries: add deleted_at IS NULL to SELECT
DROP POLICY IF EXISTS "Users can view their own atlas entries" ON public.atlas_entries;
CREATE POLICY "Users can view their own atlas entries"
  ON public.atlas_entries FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.atlas_lorebooks
      WHERE public.atlas_lorebooks.id = lorebook_id
        AND public.atlas_lorebooks.user_id = auth.uid()
        AND public.atlas_lorebooks.deleted_at IS NULL
    )
  );
