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
      "id, username, display_name, bio, tagline, avatar_url, banner_url, social_links, theme, slug, created_at",
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
  theme?: Record<string, string>;
  slug?: string;
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
