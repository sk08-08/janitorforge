import type { SupabaseClient } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  slug: string | null;
  is_admin: boolean | null;
}

export async function getCurrentUserAccess(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    return { user: null as null, isAdmin: false, profile: null as null };
  }

  // Fetch profile data in the same call
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, slug, is_admin")
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  const isAdmin = !!profile?.is_admin;

  return { user, isAdmin, profile };
}
