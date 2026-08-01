"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// ============================================================================
// Server-side search actions using Supabase
// ============================================================================

/**
 * Get the current user ID from Supabase auth or session cookie.
 */
async function getUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | undefined> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) return data.user.id;
  } catch {
    // ignore
  }
  const cookieStore = await cookies();
  const session = cookieStore.get("janitorforge_session")?.value;
  if (session) {
    try {
      const parsed = JSON.parse(session);
      return parsed?.userId;
    } catch {
      // ignore
    }
  }
  return undefined;
}

// ---- Bot Search ----

export interface SearchResultBot {
  id: string;
  name: string;
  short_description: string;
  personality: string;
  tags: string[];
  rating: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function searchBots(
  query: string,
  ratingFilter: "all" | "SFW" | "NSFW" = "all",
  limit = 20,
  offset = 0,
): Promise<{
  success: boolean;
  bots?: SearchResultBot[];
  total?: number;
  error?: string;
}> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { success: false, error: "Unauthenticated" };

  // Build base query for counting
  let countQuery = supabase
    .from("active_bots")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (query.trim()) {
    const escaped = query.replace(/[,()]/g, " ").trim();
    countQuery = countQuery.or(
      `name.ilike.%${escaped}%,short_description.ilike.%${escaped}%,tags.cs.{${escaped}}`,
    );
  }
  if (ratingFilter !== "all") {
    countQuery = countQuery.eq("rating", ratingFilter);
  }

  const { count } = await countQuery;

  let q = supabase
    .from("active_bots")
    .select(
      "id, name, short_description, personality, tags, rating, image_url, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.trim()) {
    const escaped = query.replace(/[,()]/g, " ").trim();
    q = q.or(
      `name.ilike.%${escaped}%,short_description.ilike.%${escaped}%,tags.cs.{${escaped}}`,
    );
  }

  if (ratingFilter !== "all") {
    q = q.eq("rating", ratingFilter);
  }

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    bots: (data || []) as SearchResultBot[],
    total: count || 0,
  };
}

// ---- Collaborative Bot Search ----

export async function searchCollaborativeBots(
  query: string,
  limit = 50,
): Promise<{ success: boolean; bots?: any[]; error?: string }> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { success: false, error: "Unauthenticated" };

  // First get bot_ids where user is a collaborator
  const { data: collabs, error: collabError } = await supabase
    .from("bot_collaborators")
    .select("bot_id, role, status")
    .eq("user_id", userId)
    .eq("status", "accepted");

  if (collabError) return { success: false, error: collabError.message };
  if (!collabs || collabs.length === 0) return { success: true, bots: [] };

  const botIds = collabs.map((c) => c.bot_id);
  const collabMap = new Map(collabs.map((c) => [c.bot_id, c.role]));

  let q = supabase
    .from("active_bots")
    .select(
      "id, user_id, name, short_description, personality, tags, rating, image_url, created_at, updated_at, chat_name, first_message, scenario, example_dialogues, alternate_greetings",
    )
    .in("id", botIds)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (query.trim()) {
    const escaped = query.replace(/[,()]/g, " ").trim();
    q = q.or(`name.ilike.%${escaped}%,short_description.ilike.%${escaped}%`);
  }

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };

  // Fetch owner profiles
  const ownerIds = [
    ...new Set((data || []).map((b: any) => b.user_id).filter(Boolean)),
  ];
  let ownerMap = new Map<
    string,
    { username: string | null; display_name: string | null }
  >();
  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", ownerIds);
    if (profiles) {
      ownerMap = new Map(
        profiles.map((p: any) => [
          p.id,
          { username: p.username, display_name: p.display_name },
        ]),
      );
    }
  }

  const bots = (data || []).map((b: any) => ({
    ...b,
    collaborator_role: collabMap.get(b.id) || "viewer",
    owner_username: ownerMap.get(b.user_id)?.username || null,
    owner_display_name: ownerMap.get(b.user_id)?.display_name || null,
  }));

  return { success: true, bots };
}

// ---- Form Search ----

export interface SearchResultForm {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  shareable_link: string;
  created_at: string;
  updated_at: string;
}

export async function searchForms(
  query: string,
  limit = 12,
  offset = 0,
): Promise<{
  success: boolean;
  forms?: SearchResultForm[];
  total?: number;
  error?: string;
}> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { success: false, error: "Unauthenticated" };

  let countQuery = supabase
    .from("active_request_forms")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (query.trim()) {
    const escaped = query.replace(/[,()]/g, " ").trim();
    countQuery = countQuery.or(
      `title.ilike.%${escaped}%,description.ilike.%${escaped}%`,
    );
  }
  const { count } = await countQuery;

  let q = supabase
    .from("active_request_forms")
    .select(
      "id, title, description, is_active, shareable_link, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.trim()) {
    const escaped = query.replace(/[,()]/g, " ").trim();
    q = q.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
  }

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    forms: (data || []) as SearchResultForm[],
    total: count || 0,
  };
}

// ---- Request Search ----

export interface SearchResultRequest {
  id: string;
  form_id: string;
  form_title: string;
  submitter_name: string;
  status: string;
  responses: Record<string, any>;
  response_labels: Record<string, string>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function searchRequests(
  query: string,
  statusFilter: string = "all",
  limit = 20,
  offset = 0,
): Promise<{
  success: boolean;
  requests?: SearchResultRequest[];
  total?: number;
  error?: string;
}> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { success: false, error: "Unauthenticated" };

  let countQuery = supabase
    .from("active_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (query.trim()) {
    const escaped = query.replace(/[,()]/g, " ").trim();
    countQuery = countQuery.or(
      `form_title.ilike.%${escaped}%,submitter_name.ilike.%${escaped}%`,
    );
  }
  if (statusFilter !== "all") {
    countQuery = countQuery.eq("status", statusFilter);
  }
  const { count } = await countQuery;

  let q = supabase
    .from("active_requests")
    .select(
      "id, form_id, form_title, submitter_name, status, responses, response_labels, notes, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.trim()) {
    const escaped = query.replace(/[,()]/g, " ").trim();
    q = q.or(`form_title.ilike.%${escaped}%,submitter_name.ilike.%${escaped}%`);
  }

  if (statusFilter !== "all") {
    q = q.eq("status", statusFilter);
  }

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    requests: (data || []) as SearchResultRequest[],
    total: count || 0,
  };
}

// ---- Feedback Search (Admin) ----

export interface SearchResultFeedback {
  id: string;
  user_id: string | null;
  type: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  username?: string | null;
  display_name?: string | null;
}

export async function searchFeedback(
  query: string,
  typeFilter: string = "all",
  limit = 20,
  offset = 0,
): Promise<{
  success: boolean;
  feedback?: SearchResultFeedback[];
  total?: number;
  error?: string;
}> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { success: false, error: "Unauthenticated" };

  // Check admin access
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (!profile?.is_admin)
    return { success: false, error: "Admin access required" };

  let countQuery = supabase
    .from("feedback")
    .select("id", { count: "exact", head: true });
  if (query.trim()) {
    const escaped = query.replace(/[,()]/g, " ").trim();
    countQuery = countQuery.or(
      `message.ilike.%${escaped}%,type.ilike.%${escaped}%`,
    );
  }
  if (typeFilter !== "all") {
    countQuery = countQuery.eq("type", typeFilter);
  }
  const { count } = await countQuery;

  let q = supabase
    .from("feedback")
    .select("id, user_id, type, message, status, admin_reply, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.trim()) {
    const escaped = query.replace(/[,()]/g, " ").trim();
    q = q.or(`message.ilike.%${escaped}%,type.ilike.%${escaped}%`);
  }

  if (typeFilter !== "all") {
    q = q.eq("type", typeFilter);
  }

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };

  // Fetch usernames for feedback entries
  const userIds = [
    ...new Set((data || []).map((f: any) => f.user_id).filter(Boolean)),
  ];
  let userMap = new Map<
    string,
    { username: string | null; display_name: string | null }
  >();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", userIds);
    if (profiles) {
      userMap = new Map(
        profiles.map((p: any) => [
          p.id,
          { username: p.username, display_name: p.display_name },
        ]),
      );
    }
  }

  const feedback = (data || []).map((f: any) => ({
    ...f,
    username: userMap.get(f.user_id)?.username || null,
    display_name: userMap.get(f.user_id)?.display_name || null,
  }));

  return { success: true, feedback, total: count || 0 };
}
