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
      `
      id, username, display_name, bio, tagline, avatar_url, banner_url, slug, theme, created_at, pronouns, location, website_url, specialties, status_message, social_links, visibility, profile_badges, profile_completeness,
      active_profile_featured_bots (
        sort_order,
        bot:active_bots (*)
      )
    `,
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
    .from("active_creator_pages")
    .select("*")
    .eq("user_id", profile.id)
    .eq("is_published", true)
    .order("updated_at", { ascending: false });

  // Fetch their public bots
  const { data: bots } = await supabase
    .from("active_bots")
    .select(
      "id, name, short_description, tags, rating, image_url, created_at, hide_sensitive_fields, personality, first_message, scenario, example_dialogues",
    )
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false });

  // Fetch worlds
  const { data: worlds } = await supabase
    .from("active_atlas_worlds")
    .select(
      "id, title, slug, kind, status, description, active_atlas_world_bots(bot_id)",
    )
    .eq("user_id", profile.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  // Fetch public forms for this profile
  const { data: forms } = await supabase.rpc("get_public_profile_forms", {
    p_user_id: profile.id,
  });

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
      bots={(bots || []).map((b: any) => {
        const isHidden = b.hide_sensitive_fields === true;
        return {
          id: b.id,
          name: b.name,
          shortDescription: b.short_description,
          tags: b.tags || [],
          rating: b.rating,
          imageUrl: b.image_url,
          created_at: b.created_at,
          hideSensitiveFields: isHidden,
          personality: isHidden ? "" : b.personality,
          firstMessage: isHidden ? "" : b.first_message,
          scenario: isHidden ? "" : b.scenario,
          exampleDialogues: isHidden ? "" : b.example_dialogues,
        };
      })}
      worlds={(worlds || []).map((w: any) => ({
        id: w.id,
        title: w.title,
        slug: w.slug,
        kind: w.kind,
        status: w.status,
        description: w.description,
        bot_ids: (w.active_atlas_world_bots || []).map(
          (rel: any) => rel.bot_id,
        ),
      }))}
      forms={(forms || []).map((form: any) => ({
        id: form.id,
        title: form.title,
        description: form.description,
        shareable_link: form.shareable_link,
        is_active: form.is_active,
        sections: form.sections || [],
        responses_count: Number(form.responses_count || 0),
      }))}
    />
  );
}
