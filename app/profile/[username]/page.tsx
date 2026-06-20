// ============================================================================
// JanitorForge - Public User Profile
// Accessible at /profile/[username] for viewing other users' profiles
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { PublicProfile } from "@/components/profile/public-profile";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, tagline, avatar_url, bio, visibility")
    .eq("username", username)
    .maybeSingle();

  if (!profile || profile.visibility === "private") {
    return { title: "Profile Not Found — JanitorForge" };
  }

  const title = profile.display_name || profile.username || username;
  const description =
    profile.tagline ||
    profile.bio?.slice(0, 160) ||
    `Profile of ${title} on JanitorForge`;

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

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // Find profile by username
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, tagline, avatar_url, banner_url, slug, theme, created_at, pronouns, location, website_url, specialties, status_message, social_links, visibility, featured_bot_ids, profile_badges, profile_completeness",
    )
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  // Check visibility
  if (profile.visibility === "private") {
    notFound();
  }

  if (profile.visibility === "followers") {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      notFound();
    }
  }

  // Check if viewing own profile — redirect to dashboard
  const { data: authData } = await supabase.auth.getUser();
  if (authData.user && authData.user.id === profile.id) {
    redirect("/");
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
    .select("id, name, short_description, tags, rating, image_url, created_at")
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
    <PublicProfile
      profile={
        {
          ...(profile as Record<string, unknown>),
          _followers: followers || 0,
          _following: following || 0,
        } as any
      }
      creatorPages={(pages || []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        is_published: p.is_published,
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
    />
  );
}
