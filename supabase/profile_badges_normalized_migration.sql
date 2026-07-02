-- ============================================================================
-- JanitorForge - Normalized Profile Badges Migration
-- Source of truth moves to badge_definitions + profile_badge_awards.
-- profiles.profile_badges remains as a cached compatibility mirror for the UI.
-- ============================================================================

-- ============================================================================
-- 1. BADGE CATALOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS badge_definitions (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Award',
  color TEXT NOT NULL DEFAULT '#7c3aed',
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badge_definitions_active
  ON badge_definitions(is_active, category, sort_order);

ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active badges" ON badge_definitions;
CREATE POLICY "Anyone can view active badges"
  ON badge_definitions FOR SELECT
  USING (is_active = TRUE);

-- Built-in starting catalog. This can be extended later without schema changes.
INSERT INTO badge_definitions (slug, label, description, icon, color, category, sort_order)
VALUES
  ('early_adopter', 'Early Adopter', 'Joined and supported the platform early.', 'Star', '#f59e0b', 'milestone', 10),
  ('profile_complete', 'Profile Complete', 'Completed the core creator profile fields.', 'BadgeCheck', '#22c55e', 'milestone', 20),
  ('bot_creator', 'Bot Creator', 'Published a first public bot.', 'Crown', '#8b5cf6', 'creation', 30),
  ('atlas_curator', 'Atlas Curator', 'Shared or organized Atlas content.', 'Gem', '#06b6d4', 'creation', 40),
  ('community_helper', 'Community Helper', 'Helped others or contributed to the community.', 'Shield', '#ec4899', 'community', 50)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ============================================================================
-- 2. PROFILE BADGE AWARDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_badge_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_slug TEXT NOT NULL REFERENCES badge_definitions(slug) ON DELETE CASCADE,
  awarded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profile_badge_awards_unique UNIQUE (profile_id, badge_slug)
);

CREATE INDEX IF NOT EXISTS idx_profile_badge_awards_profile
  ON profile_badge_awards(profile_id, awarded_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_badge_awards_badge
  ON profile_badge_awards(badge_slug);

ALTER TABLE profile_badge_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public profile badges" ON profile_badge_awards;
CREATE POLICY "Anyone can view public profile badges"
  ON profile_badge_awards FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = profile_badge_awards.profile_id
        AND (p.visibility = 'public' OR auth.uid() = p.id)
    )
  );

DROP POLICY IF EXISTS "Users can manage their own badge awards" ON profile_badge_awards;
CREATE POLICY "Users can manage their own badge awards"
  ON profile_badge_awards FOR ALL
  USING (auth.uid() = profile_id OR auth.uid() = awarded_by)
  WITH CHECK (auth.uid() = profile_id OR auth.uid() = awarded_by);

-- ============================================================================
-- 3. CACHE SYNCHRONIZATION
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_profile_badges_cache(p_profile_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles p
  SET profile_badges = COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', d.slug,
          'label', d.label,
          'icon', d.icon,
          'color', d.color,
          'awardedAt', a.awarded_at,
          'note', a.note,
          'metadata', a.metadata
        )
        ORDER BY a.awarded_at ASC, d.sort_order ASC, d.label ASC
      )
      FROM profile_badge_awards a
      JOIN badge_definitions d ON d.slug = a.badge_slug
      WHERE a.profile_id = p_profile_id
    ),
    '[]'::jsonb
  )
  WHERE p.id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_profile_badge_award_cache()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM sync_profile_badges_cache(OLD.profile_id);
    RETURN OLD;
  END IF;

  PERFORM sync_profile_badges_cache(NEW.profile_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_badge_awards_cache ON profile_badge_awards;
CREATE TRIGGER on_profile_badge_awards_cache
  AFTER INSERT OR UPDATE OR DELETE ON profile_badge_awards
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_badge_award_cache();

-- ============================================================================
-- 4. MANAGEMENT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION award_profile_badge(
  p_profile_id UUID,
  p_badge_slug TEXT,
  p_awarded_by UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO profile_badge_awards (
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
    p_awarded_by,
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

CREATE OR REPLACE FUNCTION revoke_profile_badge(
  p_profile_id UUID,
  p_badge_slug TEXT
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM profile_badge_awards
  WHERE profile_id = p_profile_id
    AND badge_slug = p_badge_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_profile_badges(p_profile_id UUID)
RETURNS JSONB AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', d.slug,
        'label', d.label,
        'icon', d.icon,
        'color', d.color,
        'awardedAt', a.awarded_at,
        'note', a.note,
        'metadata', a.metadata
      )
      ORDER BY a.awarded_at ASC, d.sort_order ASC, d.label ASC
    ),
    '[]'::jsonb
  )
  FROM profile_badge_awards a
  JOIN badge_definitions d ON d.slug = a.badge_slug
  WHERE a.profile_id = p_profile_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_active_badge_definitions()
RETURNS SETOF badge_definitions AS $$
  SELECT *
  FROM badge_definitions
  WHERE is_active = TRUE
  ORDER BY sort_order ASC, label ASC;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- 5. BACKFILL FROM LEGACY JSONB CACHE
-- ============================================================================

-- If profiles.profile_badges already contains awards, promote them into the new normalized table.
INSERT INTO badge_definitions (slug, label, description, icon, color, category, sort_order, is_active)
SELECT DISTINCT
  COALESCE(badge->>'id', badge->>'slug') AS slug,
  COALESCE(badge->>'label', INITCAP(REPLACE(COALESCE(badge->>'id', badge->>'slug'), '_', ' '))) AS label,
  badge->>'description' AS description,
  COALESCE(badge->>'icon', 'Award') AS icon,
  COALESCE(badge->>'color', '#7c3aed') AS color,
  COALESCE(badge->>'category', 'legacy') AS category,
  1000 AS sort_order,
  TRUE AS is_active
FROM profiles p
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.profile_badges, '[]'::jsonb)) AS badge
WHERE COALESCE(badge->>'id', badge->>'slug') IS NOT NULL
ON CONFLICT (slug) DO NOTHING;

INSERT INTO profile_badge_awards (
  profile_id,
  badge_slug,
  awarded_by,
  awarded_at,
  note,
  metadata
)
SELECT DISTINCT
  p.id AS profile_id,
  COALESCE(badge->>'id', badge->>'slug') AS badge_slug,
  NULL::UUID AS awarded_by,
  COALESCE(
    NULLIF(badge->>'awardedAt', '')::timestamptz,
    p.updated_at,
    p.created_at,
    now()
  ) AS awarded_at,
  badge->>'note' AS note,
  COALESCE(badge->'metadata', '{}'::jsonb) AS metadata
FROM profiles p
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.profile_badges, '[]'::jsonb)) AS badge
WHERE COALESCE(badge->>'id', badge->>'slug') IS NOT NULL
ON CONFLICT (profile_id, badge_slug) DO NOTHING;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT profile_id FROM profile_badge_awards LOOP
    PERFORM sync_profile_badges_cache(r.profile_id);
  END LOOP;
END $$;

-- ============================================================================
-- Notes:
-- - The normalized tables become the source of truth.
-- - profiles.profile_badges stays as a mirror for existing UI until it is retired.
-- - New awards should use award_profile_badge()/revoke_profile_badge().
-- ============================================================================