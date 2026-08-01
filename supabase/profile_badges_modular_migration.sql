-- ============================================================================
-- JanitorForge - Modular Profile Badges Migration
-- Extends normalized badges with modular metadata and admin-only management.
-- ============================================================================

-- ============================================================================
-- 1) Helper: current user admin check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_admin = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- ============================================================================
-- 2) Extend badge_definitions for modular growth
-- ============================================================================

ALTER TABLE public.badge_definitions
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS rarity TEXT NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS group_key TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS emoji TEXT,
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_manual_only BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'badge_definitions_visibility_check'
  ) THEN
    ALTER TABLE public.badge_definitions
      ADD CONSTRAINT badge_definitions_visibility_check
      CHECK (visibility IN ('public', 'private'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'badge_definitions_rarity_check'
  ) THEN
    ALTER TABLE public.badge_definitions
      ADD CONSTRAINT badge_definitions_rarity_check
      CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_badge_definitions_visibility_active
  ON public.badge_definitions(visibility, is_active, category, sort_order);

CREATE INDEX IF NOT EXISTS idx_badge_definitions_group_key
  ON public.badge_definitions(group_key);

CREATE INDEX IF NOT EXISTS idx_badge_definitions_metadata_gin
  ON public.badge_definitions USING GIN (metadata);

-- ============================================================================
-- 3) RLS: admin-only badge management
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view active badges" ON public.badge_definitions;
DROP POLICY IF EXISTS "Public can view visible active badges" ON public.badge_definitions;
DROP POLICY IF EXISTS "Admins can manage badge definitions" ON public.badge_definitions;

CREATE POLICY "Public can view visible active badges"
  ON public.badge_definitions FOR SELECT
  USING (
    (is_active = TRUE AND visibility = 'public')
    OR public.is_current_user_admin()
  );

CREATE POLICY "Admins can manage badge definitions"
  ON public.badge_definitions FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Users can manage their own badge awards" ON public.profile_badge_awards;
DROP POLICY IF EXISTS "Admins can manage badge awards" ON public.profile_badge_awards;

CREATE POLICY "Admins can manage badge awards"
  ON public.profile_badge_awards FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- ============================================================================
-- 4) Secure management functions (normalized source of truth)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_active_badge_definitions()
RETURNS SETOF public.badge_definitions AS $$
  SELECT *
  FROM public.badge_definitions
  WHERE is_active = TRUE
    AND visibility = 'public'
  ORDER BY sort_order ASC, label ASC;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_badge_definitions_admin(
  p_include_inactive BOOLEAN DEFAULT TRUE
)
RETURNS SETOF public.badge_definitions
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.badge_definitions
  WHERE (p_include_inactive OR is_active = TRUE)
  ORDER BY sort_order ASC, label ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_profile_badge(
  p_profile_id UUID,
  p_badge_slug TEXT,
  p_awarded_by UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.profile_badge_awards (
    profile_id,
    badge_slug,
    awarded_by,
    awarded_at,
    note,
    metadata
  )
  VALUES (
    p_profile_id,
    p_badge_slug,
    COALESCE(p_awarded_by, auth.uid()),
    now(),
    p_note,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (profile_id, badge_slug)
  DO UPDATE SET
    awarded_by = COALESCE(EXCLUDED.awarded_by, profile_badge_awards.awarded_by),
    awarded_at = now(),
    note = COALESCE(EXCLUDED.note, profile_badge_awards.note),
    metadata = profile_badge_awards.metadata || EXCLUDED.metadata,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.revoke_profile_badge(
  p_profile_id UUID,
  p_badge_slug TEXT
)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.profile_badge_awards
  WHERE profile_id = p_profile_id
    AND badge_slug = p_badge_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_profile_badges(p_profile_id UUID)
RETURNS JSONB AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', d.slug,
        'slug', d.slug,
        'label', d.label,
        'description', d.description,
        'icon', d.icon,
        'color', d.color,
        'category', d.category,
        'rarity', d.rarity,
        'visibility', d.visibility,
        'emoji', d.emoji,
        'image_url', d.image_url,
        'metadata', COALESCE(a.metadata, '{}'::jsonb) || COALESCE(d.metadata, '{}'::jsonb),
        'awardedAt', a.awarded_at,
        'note', a.note
      )
      ORDER BY a.awarded_at ASC, d.sort_order ASC, d.label ASC
    ),
    '[]'::jsonb
  )
  FROM public.profile_badge_awards a
  JOIN public.badge_definitions d ON d.slug = a.badge_slug
  WHERE a.profile_id = p_profile_id
    AND (
      (d.is_active = TRUE AND d.visibility = 'public')
      OR public.is_current_user_admin()
      OR auth.uid() = p_profile_id
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- 5) Notes
-- ============================================================================
-- - profiles.profile_badges can remain as compatibility cache, but reads/writes
--   should migrate to normalized functions and tables.
-- - badge_definitions is now extensible and admin-managed.
-- - profile_badge_awards management is admin-only by policy and function guard.
