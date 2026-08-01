-- ============================================================================
-- Fix profile completeness after featured_bot_ids -> profile_featured_bots migration
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_profile_completeness(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_profile public.profiles%ROWTYPE;
  v_has_featured_bots BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profile_featured_bots pfb
    WHERE pfb.profile_id = p_user_id
  )
  INTO v_has_featured_bots;

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
  IF v_has_featured_bots THEN v_score := v_score + 5; END IF;

  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
