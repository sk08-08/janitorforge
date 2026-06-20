// ============================================================================
// JanitorForge - Public Creator Page
// Accessible at /[slug] for published creator pages and profiles
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicCreatorPage } from "@/app/[slug]/public-creator-page";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  // Try creator page first
  const { data: creatorPage } = await supabase
    .from("creator_pages")
    .select("title, description, user_id")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (creatorPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("id", creatorPage.user_id)
      .maybeSingle();

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
        type: "profile",
        images: profile?.avatar_url ? [profile.avatar_url] : [],
      },
    };
  }

  // Try profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, tagline, avatar_url, bio, visibility")
    .eq("slug", slug)
    .maybeSingle();

  if (profile && profile.visibility !== "private") {
    const title = profile.display_name || profile.username || slug;
    const description =
      profile.tagline ||
      profile.bio?.slice(0, 160) ||
      `Profile page of ${title} on JanitorForge`;

    return {
      title: `${title} — JanitorForge`,
      description: description.slice(0, 160),
      openGraph: {
        title,
        description: description.slice(0, 160),
        type: "profile",
        images: profile.avatar_url ? [profile.avatar_url] : [],
      },
    };
  }

  return {
    title: "Page Not Found — JanitorForge",
  };
}

export default async function CreatorPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Try to find a published creator page by slug
  const { data: creatorPage } = await supabase
    .from("creator_pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  // If no creator page, try to find a profile by slug
  if (!creatorPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, bio, tagline, avatar_url, banner_url, slug, theme, created_at, pronouns, location, website_url, specialties, status_message, social_links, visibility, featured_bot_ids, profile_badges, profile_completeness",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (!profile) {
      notFound();
    }

    // Check visibility — private profiles are hidden
    if (profile.visibility === "private") {
      notFound();
    }

    // Also check for followers-only visibility (block non-authenticated users)
    if (profile.visibility === "followers") {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        notFound();
      }
    }

    // Fetch their published creator pages
    const { data: pages } = await supabase
      .from("creator_pages")
      .select("*")
      .eq("user_id", profile.id)
      .eq("is_published", true)
      .order("updated_at", { ascending: false });

    // Fetch their public bots
    const { data: bots } = await supabase
      .from("bots")
      .select(
        "id, name, short_description, tags, rating, image_url, created_at",
      )
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(20);

    // Fetch worlds
    const { data: worlds } = await supabase
      .from("atlas_worlds")
      .select("id, title, slug, kind, status, description, bot_ids")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false });

    // Fetch follow counts
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase
        .from("profile_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id),
      supabase
        .from("profile_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id),
    ]);

    return (
      <PublicCreatorPage
        profile={
          {
            ...(profile as Record<string, unknown>),
            _followers: followers || 0,
            _following: following || 0,
          } as any
        }
        creatorPages={pages || []}
        bots={bots || []}
        activePage={null}
        sections={[]}
        worlds={worlds || []}
        pageLayout="grid"
        pageConfig={{}}
      />
    );
  }

  // We have a creator page - fetch the profile and sections
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, tagline, avatar_url, banner_url, slug, theme, created_at, visibility",
    )
    .eq("id", creatorPage.user_id)
    .maybeSingle();

  // Check owner's profile visibility
  if (profile?.visibility === "private") {
    notFound();
  }
  if (profile?.visibility === "followers") {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      notFound();
    }
  }

  const { data: sections } = await supabase
    .from("creator_page_sections")
    .select("*")
    .eq("page_id", creatorPage.id)
    .order("position", { ascending: true });

  // Fetch bots for this creator
  const { data: bots } = await supabase
    .from("bots")
    .select("id, name, short_description, tags, rating, image_url, created_at")
    .eq("user_id", creatorPage.user_id)
    .order("updated_at", { ascending: false })
    .limit(50);

  // Fetch all published pages for this creator (for navigation)
  const { data: allPages } = await supabase
    .from("creator_pages")
    .select("id, slug, title, description, layout, is_published")
    .eq("user_id", creatorPage.user_id)
    .eq("is_published", true);

  // Fetch worlds for this creator
  const { data: worlds } = await supabase
    .from("atlas_worlds")
    .select("id, title, slug, kind, status, description, bot_ids")
    .eq("user_id", creatorPage.user_id)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  return (
    <PublicCreatorPage
      profile={profile}
      creatorPages={allPages || []}
      bots={bots || []}
      activePage={creatorPage}
      sections={sections || []}
      worlds={worlds || []}
      pageLayout={creatorPage.layout || "grid"}
      pageConfig={(creatorPage.config as Record<string, string>) || {}}
    />
  );
}
