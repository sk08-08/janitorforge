// ============================================================================
// JanitorForge - Creator Page Shared Data Fetching
// Server-side utility to fetch all data needed to render a creator page.
// Used by both /page/[slug] (dedicated route) and /[slug] (catch-all).
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreatorPageData,
  CreatorPageSection,
  CreatorInfo,
  BotPreview,
  WorldPreview,
  CreatorPageConfig,
} from "./types";

export interface CreatorPageLoadResult {
  creatorPage: {
    id: string;
    user_id: string;
    slug: string;
    title: string;
    description: string;
    layout: string;
    is_published: boolean;
    config: Record<string, string>;
  };
  profile: {
    id: string;
    username: string | null;
    display_name: string | null;
    bio: string | null;
    tagline: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    slug: string | null;
    theme: string | null;
    created_at: string;
    pronouns: string | null;
    location: string | null;
    website_url: string | null;
    specialties: string[] | null;
    status_message: string | null;
    social_links: unknown;
    visibility: string | null;
    profile_badges: unknown;
    profile_completeness: number | null;
  } | null;
  sections: CreatorPageSection[];
  bots: BotPreview[];
  worlds: WorldPreview[];
  allPages: CreatorPageData[];
}

/**
 * Fetches all data needed to render a creator page.
 * Returns null if the page is not found or not published.
 * Returns { redirect: "/profile/..." } if the profile is private/followers-only
 * and the viewer doesn't have access.
 */
export async function fetchCreatorPageData(
  supabase: SupabaseClient,
  slug: string,
): Promise<CreatorPageLoadResult | null> {
  // Find published creator page by slug
  const { data: creatorPage } = await supabase
    .from("active_creator_pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!creatorPage) return null;

  // Fetch the owner's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, tagline, avatar_url, banner_url, slug, theme, created_at, pronouns, location, website_url, specialties, status_message, social_links, visibility, profile_badges, profile_completeness",
    )
    .eq("id", creatorPage.user_id)
    .maybeSingle();

  // Check owner's profile visibility
  if (profile?.visibility === "private") return null;
  if (profile?.visibility === "followers") {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return null;
  }

  // Fetch sections, bots, all pages, and worlds in parallel
  const [
    { data: sections },
    { data: bots },
    { data: allPages },
    { data: worlds },
  ] = await Promise.all([
    supabase
      .from("active_creator_page_sections")
      .select("*")
      .eq("page_id", creatorPage.id)
      .order("position", { ascending: true }),
    supabase
      .from("active_bots")
      .select(
        "id, name, short_description, tags, rating, image_url, created_at, hide_sensitive_fields",
      )
      .eq("user_id", creatorPage.user_id)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("active_creator_pages")
      .select("id, slug, title, description, layout, is_published")
      .eq("user_id", creatorPage.user_id)
      .eq("is_published", true),
    supabase
      .from("active_atlas_worlds")
      .select(
        "id, title, slug, kind, status, description, active_atlas_world_bots(bot_id)",
      )
      .eq("user_id", creatorPage.user_id)
      .eq("status", "active")
      .order("updated_at", { ascending: false }),
  ]);

  return {
    creatorPage,
    profile,
    sections: ((sections || []) as CreatorPageSection[]).map((s) => ({
      id: s.id,
      page_id: s.page_id,
      kind: s.kind,
      title: s.title,
      config: s.config || {},
      position: s.position,
    })),
    bots: (bots || []).map((b: Record<string, unknown>) => ({
      id: b.id as string,
      name: b.name as string,
      short_description: (b.short_description as string) || "",
      tags: (b.tags as string[]) || [],
      rating: b.rating as string,
      image_url: (b.image_url as string) || null,
      created_at: b.created_at as string,
      hide_sensitive_fields: b.hide_sensitive_fields === true,
    })),
    worlds: (worlds || []).map((w: Record<string, unknown>) => ({
      id: w.id as string,
      title: w.title as string,
      slug: w.slug as string,
      kind: w.kind as string,
      status: w.status as string,
      description: (w.description as string) || "",
      bot_ids: (
        (w.active_atlas_world_bots as Array<{ bot_id: string }> | null) || []
      ).map((rel) => rel.bot_id),
    })),
    allPages: (allPages || []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      slug: p.slug as string,
      title: p.title as string,
      description: (p.description as string) || "",
      layout: ((p.layout as string) || "grid") as import("./types").PageLayout,
      is_published: p.is_published as boolean,
    })),
  };
}

/**
 * Generates SEO metadata for a creator page.
 */
export function buildCreatorPageMeta(
  creatorPage: { title: string; description: string },
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null,
  slug: string,
) {
  const title = creatorPage.title || profile?.display_name || slug;
  const description =
    creatorPage.description ||
    `Creator page by ${profile?.display_name || profile?.username || "Unknown"}`;

  return {
    title: `${title} — JanitorForge`,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 160),
      type: "profile" as const,
      images: profile?.avatar_url ? [profile.avatar_url] : [],
    },
  };
}
