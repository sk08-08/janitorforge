-- ============================================================================
-- Allow public profiles to expose atlas worlds in read-only mode
-- ============================================================================

DROP POLICY IF EXISTS "Public can view atlas worlds on public profiles" ON public.atlas_worlds;

CREATE POLICY "Public can view atlas worlds on public profiles"
  ON public.atlas_worlds
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = atlas_worlds.user_id
        AND p.visibility = 'public'
    )
  );
