-- ============================================================================
-- JanitorForge - Fix: RLS Infinite Recursion on bots + bot_collaborators
-- Run this AFTER profiles_migration.sql to fix the circular policy reference
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Create SECURITY DEFINER function to check collaborator status
-- This bypasses RLS and prevents infinite recursion
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_bot_collaborator(p_bot_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bot_collaborators
    WHERE bot_id = p_bot_id
      AND user_id = p_user_id
      AND status = 'accepted'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_bot_collaborator(UUID, UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Create function to check collaborator edit access
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_bot_editor(p_bot_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bot_collaborators
    WHERE bot_id = p_bot_id
      AND user_id = p_user_id
      AND status = 'accepted'
      AND role IN ('editor', 'co_owner')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_bot_editor(UUID, UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Drop and recreate bots policies (use functions instead of subqueries)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own bots" ON public.bots;
CREATE POLICY "Users can view their own bots"
  ON public.bots FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_bot_collaborator(id, auth.uid())
  );

DROP POLICY IF EXISTS "Collaborators can view shared bots" ON public.bots;

DROP POLICY IF EXISTS "Users can update their own bots" ON public.bots;
CREATE POLICY "Users can update their own bots"
  ON public.bots FOR UPDATE
  USING (
    auth.uid() = user_id
    OR public.is_bot_editor(id, auth.uid())
  );

DROP POLICY IF EXISTS "Editors can update shared bots" ON public.bots;

-- ---------------------------------------------------------------------------
-- Fix bot_collaborators policies to also use the function
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Bot owners and collaborators can view collaborator records" ON public.bot_collaborators;
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

DROP POLICY IF EXISTS "Bot owners can manage collaborators" ON public.bot_collaborators;
CREATE POLICY "Bot owners can manage collaborators"
  ON public.bot_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE id = bot_id AND user_id = auth.uid()
    )
  );