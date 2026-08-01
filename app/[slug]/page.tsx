// ============================================================================
// JanitorForge - Catch-All Slug Route (Redirector)
// Accessible at /[slug]
// - If slug matches a published creator page → redirect to /page/[slug]
// - If slug matches a profile → redirect to /profile/[username]
// - Otherwise → 404
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  // Check creator page
  const { data: creatorPage } = await supabase
    .from("active_creator_pages")
    .select("title, description")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (creatorPage) {
    return { title: `${creatorPage.title} — JanitorForge` };
  }

  // Check profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, tagline, bio, avatar_url, visibility")
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

  return { title: "Page Not Found — JanitorForge" };
}

export default async function SlugPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1) Creator page → redirect to /page/[slug]
  const { data: creatorPage } = await supabase
    .from("active_creator_pages")
    .select("id")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (creatorPage) {
    redirect(`/page/${slug}`);
  }

  // 2) Profile → redirect to /profile/[username]
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, visibility")
    .eq("slug", slug)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  if (profile.visibility === "private") {
    notFound();
  }

  if (profile.visibility === "followers") {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      notFound();
    }
  }

  // Profile found — redirect to /profile/[username]
  if (profile.username) {
    redirect(`/profile/${profile.username}`);
  }

  // Fallback: slug matches a profile that has no username
  notFound();
}
