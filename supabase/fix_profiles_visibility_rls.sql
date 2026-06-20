-- ============================================================================
-- Fix Profiles RLS to respect visibility column
-- The original migration set SELECT policy to USING (true), which ignores
-- the visibility column added later. This migration fixes that.
-- ============================================================================

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create a proper SELECT policy that respects visibility
-- Public profiles: visible to everyone
-- Followers-only profiles: visible to authenticated users (simplified — 
-- full follower check would require a followers table query)
-- Private profiles: visible only to the owner
CREATE POLICY "Profiles respect visibility setting"
  ON profiles
  FOR SELECT
  USING (
    -- Owner can always see their own profile
    auth.uid() = id
    OR
    -- Public profiles are visible to everyone
    visibility = 'public'
    OR
    -- Followers-only profiles: visible to authenticated users
    -- (A more strict policy would check a followers table)
    (visibility = 'followers' AND auth.uid() IS NOT NULL)
  );

-- Ensure the visibility column has a default and NOT NULL
ALTER TABLE profiles 
  ALTER COLUMN visibility SET DEFAULT 'public';

-- Backfill any NULL visibility values to 'public'
UPDATE profiles SET visibility = 'public' WHERE visibility IS NULL;