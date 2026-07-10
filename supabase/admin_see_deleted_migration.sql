-- ============================================================================
-- Admin: Bypass deleted_at filter in RLS
-- Admins can see ALL records (including soft-deleted) for moderation purposes.
-- ============================================================================

-- Requests: admin sees everything (including deleted)
DROP POLICY IF EXISTS "Admins can view all requests" ON public.requests;
CREATE POLICY "Admins can view all requests"
  ON public.requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Request Forms: admin sees everything (including deleted)
DROP POLICY IF EXISTS "Admins can view all forms" ON public.request_forms;
CREATE POLICY "Admins can view all forms"
  ON public.request_forms FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Bots: admin sees everything (including deleted)
DROP POLICY IF EXISTS "Admins can view all bots" ON public.bots;
CREATE POLICY "Admins can view all bots"
  ON public.bots FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
