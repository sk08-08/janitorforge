-- ============================================================================
-- JanitorForge - Public profile forms RPC
-- Exposes a read-only profile forms summary so public and own profile layouts
-- can render the same sections without a separate dashboard-only view.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_public_profile_forms(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  shareable_link text,
  is_active boolean,
  sections jsonb,
  responses_count bigint,
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    rf.id,
    rf.title,
    rf.description,
    rf.shareable_link,
    rf.is_active,
    rf.sections,
    COUNT(r.id)::bigint AS responses_count,
    rf.updated_at
  FROM request_forms rf
  LEFT JOIN requests r ON r.form_id = rf.id
  WHERE rf.user_id = p_user_id
  GROUP BY rf.id
  ORDER BY rf.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_public_profile_forms(uuid) TO anon, authenticated;
