-- ============================================================================
-- Admin: User Block Field Migration
-- Adds is_blocked column to profiles so admins can block/unblock users.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

-- Index for fast queries filtering out blocked users
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON public.profiles (is_blocked);

-- RLS: Only admins may set is_blocked (SELECT is already open via existing policy)
-- Update policy: allow owner to update own non-admin fields OR admin to update any
-- We create a separate permissive policy for admins updating is_blocked / is_admin.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Admins can update any profile'
  ) THEN
    CREATE POLICY "Admins can update any profile"
      ON public.profiles
      FOR UPDATE
      USING (public.is_admin_user(auth.uid()))
      WITH CHECK (public.is_admin_user(auth.uid()));
  END IF;
END $$;
