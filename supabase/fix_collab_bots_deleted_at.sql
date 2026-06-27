-- ============================================================================
-- Fix: Filter soft-deleted bots from collaborative bots list
-- Adds AND b.deleted_at IS NULL to the get_collaborative_bots function.
-- Run this in Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_collaborative_bots(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  chat_name TEXT,
  short_description TEXT,
  personality TEXT,
  first_message TEXT,
  alternate_greetings TEXT[],
  scenario TEXT,
  example_dialogues TEXT,
  tags TEXT[],
  rating TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  collaborator_role TEXT,
  collaborator_status TEXT,
  owner_username TEXT,
  owner_display_name TEXT,
  owner_avatar_url TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.user_id,
    b.name,
    b.chat_name,
    b.short_description,
    b.personality,
    b.first_message,
    b.alternate_greetings,
    b.scenario,
    b.example_dialogues,
    b.tags,
    b.rating,
    b.image_url,
    b.created_at,
    b.updated_at,
    bc.role AS collaborator_role,
    bc.status AS collaborator_status,
    p_owner.username AS owner_username,
    p_owner.display_name AS owner_display_name,
    p_owner.avatar_url AS owner_avatar_url
  FROM public.bot_collaborators bc
  JOIN public.bots b ON b.id = bc.bot_id
  LEFT JOIN public.profiles p_owner ON p_owner.id = b.user_id
  WHERE bc.user_id = p_user_id
    AND bc.status = 'accepted'
    AND b.deleted_at IS NULL
  ORDER BY b.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_collaborative_bots(UUID) TO authenticated;