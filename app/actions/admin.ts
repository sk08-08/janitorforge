"use server";

import { createClient } from "@/lib/supabase/server";
import {
  FORM_ASSETS_BUCKET,
  extractFormAssetPathsFromSections,
} from "@/lib/form-assets";

// ============================================================================
// Helper
// ============================================================================

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { supabase, userId: null, error: "Unauthenticated" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin)
    return { supabase, userId: user.id, error: "Forbidden" as const };
  return { supabase, userId: user.id, error: null };
}

// ============================================================================
// Stats
// ============================================================================

export async function getAdminStats() {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error };

  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    { count: total_users },
    { count: total_bots },
    { count: total_forms },
    { count: total_submissions },
    { count: pending_flagged },
    { count: new_today },
    { count: blocked_users },
    { count: admin_users },
    { count: active_forms },
    { count: deleted_submissions },
    { count: new_users_week },
    { count: sfw_bots },
    { count: nsfw_bots },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("bots")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("request_forms")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("flagged_requests")
      .select("id", { count: "exact", head: true })
      .eq("reviewed", false),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", yesterday),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_blocked", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_admin", true),
    supabase
      .from("request_forms")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .is("deleted_at", null),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .not("deleted_at", "is", null),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", lastWeek),
    supabase
      .from("bots")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("rating", "SFW"),
    supabase
      .from("bots")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("rating", "NSFW"),
  ]);

  return {
    success: true,
    stats: {
      total_users: total_users ?? 0,
      total_bots: total_bots ?? 0,
      total_forms: total_forms ?? 0,
      total_submissions: total_submissions ?? 0,
      pending_flagged: pending_flagged ?? 0,
      new_today: new_today ?? 0,
      blocked_users: blocked_users ?? 0,
      admin_users: admin_users ?? 0,
      active_forms: active_forms ?? 0,
      deleted_submissions: deleted_submissions ?? 0,
      new_users_week: new_users_week ?? 0,
      sfw_bots: sfw_bots ?? 0,
      nsfw_bots: nsfw_bots ?? 0,
    },
  };
}

// ============================================================================
// Recent Activity
// ============================================================================

export async function getRecentActivity() {
  const { supabase, error } = await requireAdmin();
  if (error)
    return {
      success: false,
      error,
      recent_users: [],
      recent_submissions: [],
      recent_flagged: [],
    };

  const [recentUsersRes, recentSubmissionsRes, recentFlaggedRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("requests")
        .select(
          "id, status, submitter_name, created_at, deleted_at, form_id, request_forms(title, user_id)",
        )
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("flagged_requests")
        .select("id, risk_level, reviewed, created_at, request_id")
        .eq("reviewed", false)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  // Resolve owners for submissions
  const subUserIds = [
    ...new Set(
      recentSubmissionsRes.data
        ?.map((r) => (r.request_forms as any)?.user_id)
        .filter(Boolean) ?? [],
    ),
  ];
  let subProfileMap = new Map<string, any>();
  if (subUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", subUserIds);
    subProfileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  }

  const recent_submissions = (recentSubmissionsRes.data ?? []).map((r) => {
    const form = r.request_forms as any;
    return {
      id: r.id,
      status: r.status,
      submitter_name: r.submitter_name,
      created_at: r.created_at,
      deleted_at: r.deleted_at ?? null,
      form_title: form?.title ?? null,
      owner: form?.user_id ? (subProfileMap.get(form.user_id) ?? null) : null,
    };
  });

  return {
    success: true,
    recent_users: recentUsersRes.data ?? [],
    recent_submissions,
    recent_flagged: recentFlaggedRes.data ?? [],
  };
}

// ============================================================================
// Submissions (all users, admins see deleted too)
// ============================================================================

export async function getAllSubmissions(
  page = 1,
  limit = 25,
  statusFilter?: string,
  userFilter?: string,
) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error, items: [], total: 0 };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Step 1: Resolve username filter → form_ids
  let targetFormIds: string[] | null = null;
  if (userFilter) {
    const { data: matchingProfiles } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", `%${userFilter}%`);
    const profileIds = matchingProfiles?.map((p) => p.id) ?? [];
    if (profileIds.length === 0) return { success: true, items: [], total: 0 };
    const { data: matchingForms } = await supabase
      .from("request_forms")
      .select("id")
      .in("user_id", profileIds);
    targetFormIds = matchingForms?.map((f) => f.id) ?? [];
    if (targetFormIds.length === 0)
      return { success: true, items: [], total: 0 };
  }

  // Step 2: Fetch requests (admin RLS allows seeing deleted records)
  let query = supabase
    .from("requests")
    .select(
      "id, status, submitter_name, created_at, deleted_at, form_id, request_forms(title, user_id)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  if (targetFormIds) {
    query = query.in("form_id", targetFormIds);
  }

  const { data: requests, count, error: dbError } = await query;
  if (dbError)
    return { success: false, error: dbError.message, items: [], total: 0 };

  // Step 3: Fetch profiles for form owners (profiles.id matches request_forms.user_id via auth.users)
  const userIds = [
    ...new Set(
      requests?.map((r) => (r.request_forms as any)?.user_id).filter(Boolean) ??
        [],
    ),
  ];
  let profileMap = new Map<string, any>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  }

  // Step 4: Merge
  const items = (requests ?? []).map((r) => {
    const form = r.request_forms as any;
    return {
      id: r.id,
      status: r.status,
      submitter_name: r.submitter_name,
      created_at: r.created_at,
      deleted_at: r.deleted_at ?? null,
      form_id: r.form_id,
      form_title: form?.title ?? null,
      owner: form?.user_id ? (profileMap.get(form.user_id) ?? null) : null,
    };
  });

  return { success: true, items, total: count ?? 0 };
}

// ============================================================================
// Forms (all users, admins see deleted too)
// ============================================================================

export async function getAllForms(page = 1, limit = 25, userFilter?: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error, items: [], total: 0 };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Step 1: Resolve username filter → user_ids
  let targetUserIds: string[] | null = null;
  if (userFilter) {
    const { data: matchingProfiles } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", `%${userFilter}%`);
    targetUserIds = matchingProfiles?.map((p) => p.id) ?? [];
    if (targetUserIds.length === 0)
      return { success: true, items: [], total: 0 };
  }

  // Step 2: Fetch forms (admin RLS allows seeing deleted records)
  let query = supabase
    .from("request_forms")
    .select("id, title, is_active, created_at, deleted_at, user_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (targetUserIds) {
    query = query.in("user_id", targetUserIds);
  }

  const { data: forms, count, error: dbError } = await query;
  if (dbError)
    return { success: false, error: dbError.message, items: [], total: 0 };

  // Step 3: Fetch profiles for form owners
  const userIds = [
    ...new Set(forms?.map((f) => f.user_id).filter(Boolean) ?? []),
  ];
  let profileMap = new Map<string, any>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  }

  // Step 4: Merge
  const items = (forms ?? []).map((f) => ({
    id: f.id,
    title: f.title,
    is_active: f.is_active,
    created_at: f.created_at,
    deleted_at: f.deleted_at ?? null,
    user_id: f.user_id,
    owner: f.user_id ? (profileMap.get(f.user_id) ?? null) : null,
  }));

  return { success: true, items, total: count ?? 0 };
}

// ============================================================================
// Users
// ============================================================================

export async function getAdminUsers(page = 1, limit = 25, search?: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error, items: [], total: 0 };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, is_admin, is_blocked, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(
      `username.ilike.%${search}%,display_name.ilike.%${search}%`,
    );
  }

  const { data, count, error: dbError } = await query;
  if (dbError)
    return { success: false, error: dbError.message, items: [], total: 0 };

  return { success: true, items: data ?? [], total: count ?? 0 };
}

// ============================================================================
// User Admin/Block actions
// ============================================================================

export async function setUserAdminStatus(userId: string, isAdmin: boolean) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId);

  if (dbError) return { success: false, error: dbError.message };
  return { success: true };
}

export async function blockUser(userId: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ is_blocked: true })
    .eq("id", userId);

  if (dbError) return { success: false, error: dbError.message };
  return { success: true };
}

export async function unblockUser(userId: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ is_blocked: false })
    .eq("id", userId);

  if (dbError) return { success: false, error: dbError.message };
  return { success: true };
}

export async function resetUserDisplayName(userId: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error };

  // Reset display_name to the user's own username
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ display_name: profile?.username ?? null })
    .eq("id", userId);

  if (dbError) return { success: false, error: dbError.message };
  return { success: true };
}

export async function clearUserAvatar(userId: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", userId);

  if (dbError) return { success: false, error: dbError.message };
  return { success: true };
}

export async function deleteUserAsAdmin(userId: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error };

  const { error: rpcError } = await supabase.rpc("delete_user_as_admin", {
    target_user_id: userId,
  });

  if (rpcError) return { success: false, error: rpcError.message };
  return { success: true };
}

// ============================================================================
// Bots (all users, admins see deleted too)
// ============================================================================

export async function getAllBots(
  page = 1,
  limit = 25,
  userFilter?: string,
  ratingFilter?: string,
) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error, items: [], total: 0 };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Step 1: Resolve username filter → user_ids
  let targetUserIds: string[] | null = null;
  if (userFilter) {
    const { data: matchingProfiles } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", `%${userFilter}%`);
    targetUserIds = matchingProfiles?.map((p) => p.id) ?? [];
    if (targetUserIds.length === 0)
      return { success: true, items: [], total: 0 };
  }

  // Step 2: Fetch bots
  let query = supabase
    .from("bots")
    .select("id, name, rating, tags, created_at, deleted_at, user_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (targetUserIds) query = query.in("user_id", targetUserIds);
  if (ratingFilter && ratingFilter !== "all")
    query = query.eq("rating", ratingFilter);

  const { data: bots, count, error: dbError } = await query;
  if (dbError)
    return { success: false, error: dbError.message, items: [], total: 0 };

  // Step 3: Fetch profiles
  const userIds = [
    ...new Set(bots?.map((b) => b.user_id).filter(Boolean) ?? []),
  ];
  let profileMap = new Map<string, any>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  }

  const items = (bots ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    rating: b.rating,
    tags: b.tags,
    created_at: b.created_at,
    deleted_at: b.deleted_at ?? null,
    user_id: b.user_id,
    owner: b.user_id ? (profileMap.get(b.user_id) ?? null) : null,
  }));

  return { success: true, items, total: count ?? 0 };
}

// ============================================================================
// Detail getters (full records for admin detail sheets)
// ============================================================================

export async function getSubmissionById(id: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error, item: null };

  const { data, error: dbError } = await supabase
    .from("requests")
    .select("*, request_forms(title, user_id)")
    .eq("id", id)
    .maybeSingle();

  if (dbError) return { success: false, error: dbError.message, item: null };
  if (!data) return { success: false, error: "Not found", item: null };

  const formUserId = (data.request_forms as any)?.user_id;
  let owner = null;
  if (formUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", formUserId)
      .maybeSingle();
    owner = profile;
  }

  return {
    success: true,
    item: {
      ...data,
      form_title:
        (data.request_forms as any)?.title ?? (data as any).form_title,
      owner,
      deleted_at: (data as any).deleted_at ?? null,
    },
  };
}

export async function getBotById(id: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error, item: null };

  const { data, error: dbError } = await supabase
    .from("bots")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (dbError) return { success: false, error: dbError.message, item: null };
  if (!data) return { success: false, error: "Not found", item: null };

  let owner = null;
  if ((data as any).user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", (data as any).user_id)
      .maybeSingle();
    owner = profile;
  }

  return { success: true, item: { ...data, owner } };
}

export async function getFormById(id: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error, item: null };

  const { data, error: dbError } = await supabase
    .from("request_forms")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (dbError) return { success: false, error: dbError.message, item: null };
  if (!data) return { success: false, error: "Not found", item: null };

  let owner = null;
  if ((data as any).user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", (data as any).user_id)
      .maybeSingle();
    owner = profile;
  }

  return { success: true, item: { ...data, owner } };
}

// ============================================================================
// Soft delete
// ============================================================================

export async function softDeleteSubmission(id: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error };

  const { data: existing } = await supabase
    .from("requests")
    .select("id, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { success: false, error: "Not found" };
  if ((existing as any).deleted_at) {
    return { success: true, deleted_at: (existing as any).deleted_at };
  }

  const deletedAt = new Date().toISOString();
  const { error: dbError } = await supabase
    .from("requests")
    .update({ deleted_at: deletedAt })
    .eq("id", id)
    .is("deleted_at", null);

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, deleted_at: deletedAt };
}

export async function softDeleteForm(id: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error };

  const { data: existing } = await supabase
    .from("request_forms")
    .select("id, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { success: false, error: "Not found" };
  if ((existing as any).deleted_at) {
    return { success: true, deleted_at: (existing as any).deleted_at };
  }

  const deletedAt = new Date().toISOString();
  const { error: dbError } = await supabase
    .from("request_forms")
    .update({ deleted_at: deletedAt })
    .eq("id", id)
    .is("deleted_at", null);

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, deleted_at: deletedAt };
}

export async function softDeleteBot(id: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error };

  const { data: existing } = await supabase
    .from("bots")
    .select("id, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { success: false, error: "Not found" };
  if ((existing as any).deleted_at) {
    return { success: true, deleted_at: (existing as any).deleted_at };
  }

  const deletedAt = new Date().toISOString();
  const { error: dbError } = await supabase
    .from("bots")
    .update({ deleted_at: deletedAt })
    .eq("id", id)
    .is("deleted_at", null);

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, deleted_at: deletedAt };
}

// ============================================================================
// Hard delete (only for already soft-deleted records)
// ============================================================================

export async function hardDeleteSubmission(id: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error };

  const { data: existing } = await supabase
    .from("requests")
    .select("id, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!(existing as any)?.deleted_at)
    return { success: false, error: "Record is not soft-deleted" };

  const { error: dbError } = await supabase
    .from("requests")
    .delete()
    .eq("id", id);
  if (dbError) return { success: false, error: dbError.message };
  return { success: true };
}

export async function hardDeleteForm(id: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error };

  const { data: existing } = await supabase
    .from("request_forms")
    .select("id, deleted_at, sections")
    .eq("id", id)
    .maybeSingle();
  if (!(existing as any)?.deleted_at)
    return { success: false, error: "Record is not soft-deleted" };

  const assetPaths = extractFormAssetPathsFromSections((existing as any).sections);
  if (assetPaths.length > 0) {
    await supabase.storage.from(FORM_ASSETS_BUCKET).remove(assetPaths);
  }

  const { error: dbError } = await supabase
    .from("request_forms")
    .delete()
    .eq("id", id);
  if (dbError) return { success: false, error: dbError.message };
  return { success: true };
}

export async function hardDeleteBot(id: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error };

  const { data: existing } = await supabase
    .from("bots")
    .select("id, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!(existing as any)?.deleted_at)
    return { success: false, error: "Record is not soft-deleted" };

  const { error: dbError } = await supabase.from("bots").delete().eq("id", id);
  if (dbError) return { success: false, error: dbError.message };
  return { success: true };
}

// ============================================================================
// Flagged Requests (global moderation)
// ============================================================================

export async function getAllFlaggedRequests(
  page = 1,
  limit = 25,
  riskFilter?: string,
  reviewedFilter?: "all" | "pending" | "reviewed",
) {
  const { supabase, error } = await requireAdmin();
  if (error) return { success: false, error, items: [], total: 0 };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("flagged_requests")
    .select(
      `id, risk_score, risk_level, reviewed, created_at, request_id,
       requests!inner(
         id, submitter_name, status, form_id,
         request_forms!inner(title, user_id,
           profiles!request_forms_user_id_fkey(username, display_name)
         )
       )`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (riskFilter && riskFilter !== "all") {
    query = query.eq("risk_level", riskFilter);
  }
  if (reviewedFilter === "pending") {
    query = query.eq("reviewed", false);
  } else if (reviewedFilter === "reviewed") {
    query = query.eq("reviewed", true);
  }

  const { data, count, error: dbError } = await query;
  if (dbError)
    return { success: false, error: dbError.message, items: [], total: 0 };

  return { success: true, items: data ?? [], total: count ?? 0 };
}
