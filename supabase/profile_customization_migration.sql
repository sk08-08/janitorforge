-- ============================================================================
-- JanitorForge - Profile Customization Migration
-- Rich profile customization: social links, theme, badges, specialties,
-- featured bots, visibility, followers/following system
-- ============================================================================

-- ============================================================================
-- 1. EXTEND PROFILES TABLE
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pronouns TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_message TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS featured_bot_ids UUID[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_badges JSONB DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_css TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0;

-- Ensure social_links has proper default
ALTER TABLE profiles ALTER COLUMN social_links SET DEFAULT '{}';
-- Ensure theme has extended default
ALTER TABLE profiles ALTER COLUMN theme SET DEFAULT '{"primaryColor":"#7c3aed","accentColor":"#a78bfa","layout":"grid","cardStyle":"default","fontFamily":"default","profileBackground":"default","showStats":true,"showBadges":true,"showFeatured":true}';

COMMENT ON COLUMN profiles.pronouns IS 'User pronouns, e.g. he/him, she/her, they/them, or custom';
COMMENT ON COLUMN profiles.location IS 'User location (city/country)';
COMMENT ON COLUMN profiles.website_url IS 'Personal website URL';
COMMENT ON COLUMN profiles.specialties IS 'Array of creator specialties/interests';
COMMENT ON COLUMN profiles.status_message IS 'Short status message (max 128 chars)';
COMMENT ON COLUMN profiles.visibility IS 'Profile visibility: public, followers, private';
COMMENT ON COLUMN profiles.featured_bot_ids IS 'Array of bot IDs to feature on profile';
COMMENT ON COLUMN profiles.profile_badges IS 'JSON array of badge objects: [{"id","label","icon","color","awardedAt"}]';
COMMENT ON COLUMN profiles.custom_css IS 'Custom CSS for advanced profile styling';
COMMENT ON COLUMN profiles.profile_completeness IS 'Auto-calculated profile completeness percentage';

-- ============================================================================
-- 2. FOLLOWERS / FOLLOWING SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS profile_follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE profile_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can see follows (for public profiles)
CREATE POLICY "Anyone can view follows"
  ON profile_follows FOR SELECT
  USING (true);

-- Users can follow others
CREATE POLICY "Users can follow"
  ON profile_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
  ON profile_follows FOR DELETE
  USING (auth.uid() = follower_id);

CREATE INDEX idx_follows_follower ON profile_follows(follower_id);
CREATE INDEX idx_follows_following ON profile_follows(following_id);

-- ============================================================================
-- 3. PROFILE BADGES SEED (built-in badges)
-- ============================================================================
-- Badges are stored in profile_badges JSONB column
-- Format: [{"id":"early_adopter","label":"Early Adopter","icon":"Star","color":"#f59e0b","awardedAt":"2025-01-01"}]
-- We'll award badges via a function based on activity

-- ============================================================================
-- 4. FUNCTION: Calculate profile completeness
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_profile_completeness(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_profile RECORD;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF v_profile IS NULL THEN RETURN 0; END IF;

  -- Each field adds points (total = 100)
  IF v_profile.display_name IS NOT NULL AND v_profile.display_name != '' THEN v_score := v_score + 10; END IF;
  IF v_profile.username IS NOT NULL AND v_profile.username != '' THEN v_score := v_score + 10; END IF;
  IF v_profile.slug IS NOT NULL AND v_profile.slug != '' THEN v_score := v_score + 5; END IF;
  IF v_profile.avatar_url IS NOT NULL AND v_profile.avatar_url != '' THEN v_score := v_score + 15; END IF;
  IF v_profile.banner_url IS NOT NULL AND v_profile.banner_url != '' THEN v_score := v_score + 10; END IF;
  IF v_profile.tagline IS NOT NULL AND v_profile.tagline != '' THEN v_score := v_score + 5; END IF;
  IF v_profile.bio IS NOT NULL AND v_profile.bio != '' THEN v_score := v_score + 10; END IF;
  IF v_profile.pronouns IS NOT NULL AND v_profile.pronouns != '' THEN v_score := v_score + 3; END IF;
  IF v_profile.location IS NOT NULL AND v_profile.location != '' THEN v_score := v_score + 3; END IF;
  IF v_profile.website_url IS NOT NULL AND v_profile.website_url != '' THEN v_score := v_score + 4; END IF;
  IF v_profile.specialties IS NOT NULL AND array_length(v_profile.specialties, 1) > 0 THEN v_score := v_score + 5; END IF;
  IF v_profile.social_links IS NOT NULL AND v_profile.social_links != '{}'::jsonb THEN v_score := v_score + 10; END IF;
  IF v_profile.theme IS NOT NULL AND v_profile.theme != '{}'::jsonb THEN v_score := v_score + 5; END IF;
  IF v_profile.featured_bot_ids IS NOT NULL AND array_length(v_profile.featured_bot_ids, 1) > 0 THEN v_score := v_score + 5; END IF;

  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. TRIGGER: Auto-update profile_completeness on profile change
-- ============================================================================
CREATE OR REPLACE FUNCTION update_profile_completeness()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completeness := calculate_profile_completeness(NEW.id);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_update_completeness ON profiles;
CREATE TRIGGER on_profile_update_completeness
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completeness();

-- ============================================================================
-- 6. FUNCTION: Get follower count
-- ============================================================================
CREATE OR REPLACE FUNCTION get_follower_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM profile_follows WHERE following_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- 7. FUNCTION: Get following count
-- ============================================================================
CREATE OR REPLACE FUNCTION get_following_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM profile_follows WHERE follower_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- 8. FUNCTION: Check if user follows another
-- ============================================================================
CREATE OR REPLACE FUNCTION is_following(p_follower UUID, p_following UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM profile_follows
    WHERE follower_id = p_follower AND following_id = p_following
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- 9. NOTIFICATION: Notify on new follower
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  v_follower_name TEXT;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO v_follower_name
  FROM profiles WHERE id = NEW.follower_id;

  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.following_id,
    'new_follower',
    'New follower',
    v_follower_name || ' started following you',
    '/dashboard',
    jsonb_build_object('follower_id', NEW.follower_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_notify ON profile_follows;
CREATE TRIGGER on_follow_notify
  AFTER INSERT ON profile_follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_follow();

-- ============================================================================
-- 10. AWARD BADGES FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION award_badge(p_user_id UUID, p_badge_id TEXT, p_label TEXT, p_icon TEXT DEFAULT 'Award', p_color TEXT DEFAULT '#7c3aed')
RETURNS VOID AS $$
BEGIN
  -- Only award if not already present
  UPDATE profiles
  SET profile_badges = profile_badges || jsonb_build_object(
    'id', p_badge_id,
    'label', p_label,
    'icon', p_icon,
    'color', p_color,
    'awardedAt', now()::text
  )
  WHERE id = p_user_id
  AND NOT (profile_badges @> jsonb_build_array(jsonb_build_object('id', p_badge_id)));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Award "Early Adopter" badge to all existing users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM profiles LOOP
    PERFORM award_badge(r.id, 'early_adopter', 'Early Adopter', 'Star', '#f59e0b');
  END LOOP;
END $$;

-- ============================================================================
-- DONE. Summary:
-- ============================================================================
-- Extended profiles table with: pronouns, location, website_url, specialties,
-- status_message, visibility, featured_bot_ids, profile_badges, custom_css,
-- profile_completeness
--
-- New table: profile_follows (follower_id, following_id)
-- New functions: calculate_profile_completeness, get_follower_count,
--   get_following_count, is_following, award_badge
-- New trigger: on_follow_notify (notifies on new follow)
-- Seed: Early Adopter badge for all existing users