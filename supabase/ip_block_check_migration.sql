-- ============================================================================
-- IP Block Check RPC for Public Form Submissions
-- SECURITY DEFINER so public (unauthenticated) submissions can check blocks
-- ============================================================================

-- Drop existing function if it exists (idempotent)
DROP FUNCTION IF EXISTS public.is_ip_blocked_for_form(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.is_ip_blocked_for_form(
  p_form_id UUID,
  p_ip_address TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.blocked_ips
    WHERE form_id = p_form_id
      AND ip_address = p_ip_address
  );
END;
$$;

-- Grant execute to anon and authenticated roles so public form submissions work
GRANT EXECUTE ON FUNCTION public.is_ip_blocked_for_form(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.is_ip_blocked_for_form(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.is_ip_blocked_for_form IS 'Checks if an IP address is blocked for a specific form. SECURITY DEFINER to allow public submissions to check.';