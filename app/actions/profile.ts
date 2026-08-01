"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import { friendlySupabaseError } from "@/lib/error-utils";
import {
  PROFILE_ASSETS_BUCKET,
  extractStorageObjectPathFromPublicUrl,
  getStoragePublicUrl,
} from "@/lib/storage-assets";

const ALLOWED_PROFILE_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
];
const ALLOWED_PROFILE_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "heic",
  "heif",
];
const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function getSafeImageExtension(file: File) {
  const byName = String(file.name || "")
    .split(".")
    .pop()
    ?.toLowerCase()
    .trim();
  if (byName && ALLOWED_PROFILE_IMAGE_EXTENSIONS.includes(byName)) {
    return byName;
  }

  const byMime =
    String(file.type || "")
      .toLowerCase()
      .split("/")[1] || "";
  if (byMime && ALLOWED_PROFILE_IMAGE_EXTENSIONS.includes(byMime)) {
    return byMime;
  }

  return "jpg";
}

function withRawErrorDetails(err: unknown, fallback: string) {
  const friendly = friendlySupabaseError(err, fallback);
  const rawMessage =
    typeof err === "object" && err !== null && "message" in (err as any)
      ? String((err as any).message || "").trim()
      : "";

  if (!rawMessage) return friendly;
  if (friendly.toLowerCase().includes(rawMessage.toLowerCase())) {
    return friendly;
  }
  return `${friendly} (${rawMessage})`;
}

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
    .select(
      `
      *,
      active_profile_featured_bots (
        sort_order,
        bot:active_bots (*)
      )
    `,
    )
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
      `
      id, username, display_name, bio, tagline, avatar_url, banner_url, social_links, theme, slug, created_at, pronouns, location, website_url, specialties, status_message, visibility, profile_badges, profile_completeness,
      active_profile_featured_bots (
        sort_order,
        bot:active_bots (*)
      )
    `,
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
  featuredBotIds?: string[];
  profile_badges?: Array<Record<string, string>>;
  custom_css?: string;
}

export async function updateProfile(input: UpdateProfileInput) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }
  const userId = access.user.id;

  const requestedFeaturedBotIds = input.featuredBotIds;

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
      .neq("id", userId)
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
  if (input.profile_badges !== undefined)
    payload.profile_badges = input.profile_badges;
  if (input.custom_css !== undefined) payload.custom_css = input.custom_css;

  if (
    Object.keys(payload).length === 0 &&
    requestedFeaturedBotIds === undefined
  ) {
    return { success: false, error: "Nothing to update" };
  }

  let existingAssets: {
    avatar_url: string | null;
    banner_url: string | null;
  } | null = null;
  if (input.avatar_url !== undefined || input.banner_url !== undefined) {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, banner_url")
      .eq("id", userId)
      .maybeSingle();
    existingAssets = data ?? null;
  }

  if (Object.keys(payload).length > 0) {
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  if (requestedFeaturedBotIds !== undefined) {
    const normalizedFeaturedBotIds = Array.from(
      new Set((requestedFeaturedBotIds || []).filter(Boolean)),
    );

    const { error: clearError } = await supabase
      .from("profile_featured_bots")
      .delete()
      .eq("profile_id", userId);

    if (clearError) {
      return { success: false, error: clearError.message };
    }

    if (normalizedFeaturedBotIds.length > 0) {
      const { error: insertError } = await supabase
        .from("profile_featured_bots")
        .insert(
          normalizedFeaturedBotIds.map((botId, index) => ({
            profile_id: userId,
            bot_id: botId,
            sort_order: index,
          })),
        );

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }
  }

  if (existingAssets) {
    if (input.avatar_url !== undefined) {
      const oldAvatarPath = extractStorageObjectPathFromPublicUrl(
        existingAssets.avatar_url,
        PROFILE_ASSETS_BUCKET,
      );
      const newAvatarPath = extractStorageObjectPathFromPublicUrl(
        String(input.avatar_url ?? ""),
        PROFILE_ASSETS_BUCKET,
      );
      if (oldAvatarPath && oldAvatarPath !== newAvatarPath) {
        await supabase.storage
          .from(PROFILE_ASSETS_BUCKET)
          .remove([oldAvatarPath]);
      }
    }

    if (input.banner_url !== undefined) {
      const oldBannerPath = extractStorageObjectPathFromPublicUrl(
        existingAssets.banner_url,
        PROFILE_ASSETS_BUCKET,
      );
      const newBannerPath = extractStorageObjectPathFromPublicUrl(
        String(input.banner_url ?? ""),
        PROFILE_ASSETS_BUCKET,
      );
      if (oldBannerPath && oldBannerPath !== newBannerPath) {
        await supabase.storage
          .from(PROFILE_ASSETS_BUCKET)
          .remove([oldBannerPath]);
      }
    }
  }

  return { success: true };
}

export async function uploadProfileAssetAction(formData: FormData) {
  try {
    const kind = String(formData.get("kind") || "").trim();
    if (kind !== "avatar" && kind !== "banner") {
      return { success: false, error: "Invalid asset kind" };
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, error: "No image file provided" };
    }

    const fileType = String(file.type || "").toLowerCase();
    const fileExt = getSafeImageExtension(file);
    if (
      fileType &&
      !ALLOWED_PROFILE_IMAGE_TYPES.includes(fileType) &&
      !ALLOWED_PROFILE_IMAGE_EXTENSIONS.includes(fileExt)
    ) {
      return {
        success: false,
        error:
          "Unsupported image type. Use PNG, JPG, WEBP, AVIF, GIF, HEIC or HEIF",
      };
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
      return { success: false, error: "Image is too large (max 5MB)" };
    }

    const supabase = await createClient();
    const access = await getCurrentUserAccess(supabase);
    if (!access.user) {
      return { success: false, error: "Not authenticated" };
    }

    const column = kind === "avatar" ? "avatar_url" : "banner_url";
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("avatar_url, banner_url")
      .eq("id", access.user.id)
      .maybeSingle();

    if (profileError) {
      return {
        success: false,
        error: withRawErrorDetails(profileError, "Failed to load profile"),
        raw: profileError,
      };
    }

    const existingUrl = String((profile as any)?.[column] || "").trim();
    const existingPath = extractStorageObjectPathFromPublicUrl(
      existingUrl,
      PROFILE_ASSETS_BUCKET,
    );
    const targetPath = `${access.user.id}/${kind}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_ASSETS_BUCKET)
      .upload(targetPath, file, {
        upsert: true,
        contentType: fileType || undefined,
        cacheControl: "3600",
      });

    if (uploadError) {
      return {
        success: false,
        error: withRawErrorDetails(uploadError, "Failed to upload image"),
        raw: uploadError,
      };
    }

    if (existingPath && existingPath !== targetPath) {
      await supabase.storage.from(PROFILE_ASSETS_BUCKET).remove([existingPath]);
    }

    const publicUrl = getStoragePublicUrl(PROFILE_ASSETS_BUCKET, targetPath);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ [column]: publicUrl })
      .eq("id", access.user.id);

    if (updateError) {
      return {
        success: false,
        error: withRawErrorDetails(updateError, "Failed to save image"),
        raw: updateError,
      };
    }

    return { success: true, url: publicUrl, path: targetPath, kind };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while uploading image";
    return { success: false, error: message };
  }
}

export async function removeProfileAssetAction(kind: "avatar" | "banner") {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const column = kind === "avatar" ? "avatar_url" : "banner_url";
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url, banner_url")
    .eq("id", access.user.id)
    .maybeSingle();

  const currentUrl = String((profile as any)?.[column] || "").trim();
  const currentPath = extractStorageObjectPathFromPublicUrl(
    currentUrl,
    PROFILE_ASSETS_BUCKET,
  );

  if (currentPath) {
    await supabase.storage.from(PROFILE_ASSETS_BUCKET).remove([currentPath]);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ [column]: null })
    .eq("id", access.user.id);

  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to remove image"),
      raw: error,
    };
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
