"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Check if a slug is available for use by a specific user.
 * Checks both profiles and creator_pages tables to prevent conflicts.
 * Returns { available, conflictType } where conflictType indicates what uses the slug.
 */
export async function checkSlugAvailability(
  slug: string,
  currentUserId: string,
  context: "profile" | "creator_page",
  excludeId?: string,
): Promise<{
  available: boolean;
  conflictType: "profile" | "creator_page" | "none";
  message: string;
}> {
  const clean = slug.toLowerCase().trim();

  if (!clean || clean.length < 2) {
    return {
      available: false,
      conflictType: "none",
      message: "Slug must be at least 2 characters",
    };
  }

  if (!/^[a-z0-9-]+$/.test(clean)) {
    return {
      available: false,
      conflictType: "none",
      message: "Only lowercase letters, numbers, and hyphens allowed",
    };
  }

  const supabase = await createClient();

  // Check profiles table
  const { data: profileMatch } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("slug", clean)
    .maybeSingle();

  if (profileMatch && profileMatch.id !== currentUserId) {
    return {
      available: false,
      conflictType: "profile",
      message: `This URL is taken by another user's profile (@${profileMatch.username || "unknown"})`,
    };
  }

  // Also check if this slug matches any username (since /{username} also resolves)
  const { data: usernameMatch } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", clean)
    .maybeSingle();

  if (usernameMatch && usernameMatch.id !== currentUserId) {
    return {
      available: false,
      conflictType: "profile",
      message: `This URL is taken by @${usernameMatch.username}'s profile`,
    };
  }

  // Check creator_pages table
  const { data: pageMatch } = await supabase
    .from("active_creator_pages")
    .select("id, title, user_id")
    .eq("slug", clean)
    .maybeSingle();

  if (pageMatch && pageMatch.user_id === currentUserId) {
    // It's the user's own page
    if (context === "creator_page" && excludeId && pageMatch.id === excludeId) {
      // It's the same page being edited — that's fine
      return {
        available: true,
        conflictType: "none",
        message: "This is your current slug",
      };
    }
    return {
      available: false,
      conflictType: "creator_page",
      message: `You already have a creator page with this URL: "${pageMatch.title || "Untitled"}"`,
    };
  }

  if (pageMatch && pageMatch.user_id !== currentUserId) {
    return {
      available: false,
      conflictType: "creator_page",
      message: "This URL is taken by another creator page",
    };
  }

  // PRIORITY: Profile slugs always take priority over creator page slugs.
  // When creating/editing a creator page, block any slug that matches
  // ANY profile's slug or username (including the current user's own).
  if (context === "creator_page") {
    const { data: anyProfileWithSlug } = await supabase
      .from("profiles")
      .select("id, username, slug")
      .or(`slug.eq.${clean},username.eq.${clean}`)
      .limit(1)
      .maybeSingle();

    if (anyProfileWithSlug) {
      return {
        available: false,
        conflictType: "profile",
        message:
          anyProfileWithSlug.id === currentUserId
            ? `This URL is your own profile slug (@${anyProfileWithSlug.username || "unknown"}). Profile URLs have priority.`
            : `This URL conflicts with an existing profile (@${anyProfileWithSlug.username || "unknown"})`,
      };
    }
  }

  // When editing a profile slug, only block if another user's creator page uses it.
  // The user's own creator pages can be overridden since profile takes priority.
  if (context === "profile") {
    const { data: otherPageWithSlug } = await supabase
      .from("active_creator_pages")
      .select("id, title, user_id")
      .eq("slug", clean)
      .neq("user_id", currentUserId)
      .limit(1)
      .maybeSingle();

    if (otherPageWithSlug) {
      return {
        available: false,
        conflictType: "creator_page",
        message: `This URL is already used by a creator page: "${otherPageWithSlug.title || "Untitled"}"`,
      };
    }
  }

  return {
    available: true,
    conflictType: "none",
    message: `"${clean}" is available`,
  };
}
