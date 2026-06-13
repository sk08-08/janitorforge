// ============================================================================
// JanitorForge - Public Creator Page
// Accessible at /[slug] for published creator pages and profiles
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PublicCreatorPage } from "@/app/[slug]/public-creator-page";

interface PageProps {
  params: Promise<{ slug: string }>;
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
        "id, username, display_name, bio, tagline, avatar_url, banner_url, slug, theme, created_at",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (!profile) {
      notFound();
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

    return (
      <PublicCreatorPage
        profile={profile}
        creatorPages={pages || []}
        bots={bots || []}
        activePage={null}
        sections={[]}
        pageLayout="grid"
        pageConfig={{}}
      />
    );
  }

  // We have a creator page - fetch the profile and sections
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, tagline, avatar_url, banner_url, slug, theme, created_at",
    )
    .eq("id", creatorPage.user_id)
    .maybeSingle();

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
