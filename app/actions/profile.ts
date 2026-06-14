"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";

// ---------------------------------------------------------------------------
// Get own profile
// ---------------------------------------------------------------------------

export async function getOwnProfile() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", profile: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", access.user.id)
    .single();

  if (error) {
    return { success: false, error: error.message, profile: null };
  }
  return { success: true, profile: data };
}

// ---------------------------------------------------------------------------
// Get public profile by slug
// ---------------------------------------------------------------------------

export async function getPublicProfile(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, tagline, avatar_url, banner_url, social_links, theme, slug, created_at, pronouns, location, website_url, specialties, status_message, visibility, featured_bot_ids, profile_badges, profile_completeness",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: "Profile not found", profile: null };
  }
  return { success: true, profile: data };
}

// ---------------------------------------------------------------------------
// Update profile
// ---------------------------------------------------------------------------

interface UpdateProfileInput {
  display_name?: string;
  bio?: string;
  tagline?: string;
  avatar_url?: string;
  banner_url?: string;
  social_links?: Record<string, string>;
  theme?: Record<string, unknown>;
  slug?: string;
  pronouns?: string;
  location?: string;
  website_url?: string;
  specialties?: string[];
  status_message?: string;
  visibility?: string;
  featured_bot_ids?: string[];
  profile_badges?: Array<Record<string, string>>;
  custom_css?: string;
}

export async function updateProfile(input: UpdateProfileInput) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate slug format if provided
  if (input.slug !== undefined) {
    const cleanSlug = input.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (!cleanSlug || cleanSlug.length < 2) {
      return {
        success: false,
        error: "Slug must be at least 2 characters (letters, numbers, hyphens)",
      };
    }

    // Check slug uniqueness
    const { data: existingSlug } = await supabase
      .from("profiles")
      .select("id")
      .eq("slug", cleanSlug)
      .neq("id", access.user.id)
      .maybeSingle();

    if (existingSlug) {
      return { success: false, error: "This slug is already taken" };
    }
    input.slug = cleanSlug;
  }

  const payload: Record<string, unknown> = {};
  if (input.display_name !== undefined)
    payload.display_name = input.display_name.trim();
  if (input.bio !== undefined) payload.bio = input.bio.trim();
  if (input.tagline !== undefined) payload.tagline = input.tagline.trim();
  if (input.avatar_url !== undefined) payload.avatar_url = input.avatar_url;
  if (input.banner_url !== undefined) payload.banner_url = input.banner_url;
  if (input.social_links !== undefined)
    payload.social_links = input.social_links;
  if (input.theme !== undefined) payload.theme = input.theme;
  if (input.slug !== undefined) payload.slug = input.slug;
  if (input.pronouns !== undefined) payload.pronouns = input.pronouns.trim();
  if (input.location !== undefined) payload.location = input.location.trim();
  if (input.website_url !== undefined)
    payload.website_url = input.website_url.trim();
  if (input.specialties !== undefined) payload.specialties = input.specialties;
  if (input.status_message !== undefined)
    payload.status_message = input.status_message.trim();
  if (input.visibility !== undefined) payload.visibility = input.visibility;
  if (input.featured_bot_ids !== undefined)
    payload.featured_bot_ids = input.featured_bot_ids;
  if (input.profile_badges !== undefined)
    payload.profile_badges = input.profile_badges;
  if (input.custom_css !== undefined) payload.custom_css = input.custom_css;

  if (Object.keys(payload).length === 0) {
    return { success: false, error: "Nothing to update" };
  }

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", access.user.id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// Follow / Unfollow
// ---------------------------------------------------------------------------

export async function followUser(targetUserId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { success: false, error: "Not authenticated" };
  if (access.user.id === targetUserId)
    return { success: false, error: "Cannot follow yourself" };

  const { error } = await supabase
    .from("profile_follows")
    .insert({ follower_id: access.user.id, following_id: targetUserId });

  if (error) {
    if (error.code === "23505")
      return { success: false, error: "Already following" };
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function unfollowUser(targetUserId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("profile_follows")
    .delete()
    .eq("follower_id", access.user.id)
    .eq("following_id", targetUserId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getFollowCounts(userId: string) {
  const supabase = await createClient();

  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from("profile_follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("profile_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  return { followers: followers || 0, following: following || 0 };
}

export async function checkIsFollowing(targetUserId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { isFollowing: false };

  const { data } = await supabase
    .from("profile_follows")
    .select("follower_id")
    .eq("follower_id", access.user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  return { isFollowing: !!data };
}

// ---------------------------------------------------------------------------
// Get followers/following lists with profile info
// ---------------------------------------------------------------------------

export async function getFollowers(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_follows")
    .select(
      "follower_id, created_at, profiles!profile_follows_follower_id_fkey(id, display_name, username, avatar_url, slug, tagline)",
    )
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { users: [] as Array<Record<string, unknown>> };
  return {
    users: (data || []).map((r: any) => ({
      ...r.profiles,
      followed_at: r.created_at,
    })),
  };
}

export async function getFollowing(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_follows")
    .select(
      "following_id, created_at, profiles!profile_follows_following_id_fkey(id, display_name, username, avatar_url, slug, tagline)",
    )
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { users: [] as Array<Record<string, unknown>> };
  return {
    users: (data || []).map((r: any) => ({
      ...r.profiles,
      followed_at: r.created_at,
    })),
  };
}
