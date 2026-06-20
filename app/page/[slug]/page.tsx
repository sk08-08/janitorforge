// ============================================================================
// JanitorForge - Public Creator Page
// Accessible at /page/[slug] for published creator pages
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CreatorPageView } from "@/components/creator-pages/creator-page-view";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: creatorPage } = await supabase
    .from("creator_pages")
    .select("title, description, user_id")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!creatorPage) {
    return { title: "Page Not Found — JanitorForge" };
  }

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

export default async function CreatorPagePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Find published creator page by slug
  const { data: creatorPage } = await supabase
    .from("creator_pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!creatorPage) {
    notFound();
  }

  // Fetch the owner's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, tagline, avatar_url, banner_url, slug, theme, created_at, pronouns, location, website_url, specialties, status_message, social_links, visibility, featured_bot_ids, profile_badges, profile_completeness",
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

  // Fetch sections for this page
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
    <CreatorPageView
      creator={{
        id: creatorPage.user_id,
        username: profile?.username || null,
        display_name: profile?.display_name || null,
        avatar_url: profile?.avatar_url || null,
      }}
      page={{
        id: creatorPage.id,
        slug: creatorPage.slug,
        title: creatorPage.title,
        description: creatorPage.description,
        layout: creatorPage.layout || "grid",
        is_published: creatorPage.is_published,
      }}
      sections={(sections || []).map((s: any) => ({
        id: s.id,
        page_id: s.page_id,
        kind: s.kind,
        title: s.title,
        config: s.config || {},
        position: s.position,
      }))}
      bots={(bots || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        short_description: b.short_description,
        tags: b.tags || [],
        rating: b.rating,
        image_url: b.image_url,
        created_at: b.created_at,
      }))}
      worlds={(worlds || []).map((w: any) => ({
        id: w.id,
        title: w.title,
        slug: w.slug,
        kind: w.kind,
        status: w.status,
        description: w.description,
        bot_ids: w.bot_ids || [],
      }))}
      allPages={(allPages || []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        layout: p.layout,
        is_published: p.is_published,
      }))}
      pageConfig={(creatorPage.config as Record<string, string>) || {}}
    />
  );
}
