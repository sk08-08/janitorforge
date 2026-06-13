-- ============================================================================
-- Fix: Allow public viewing of bots for creator pages
-- ============================================================================

DROP POLICY IF EXISTS "Public can view bots on published profiles" ON public.bots;
CREATE POLICY "Public can view bots on published profiles"
  ON public.bots FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_bot_collaborator(id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = bots.user_id
        AND profiles.slug IS NOT NULL
    )
  );