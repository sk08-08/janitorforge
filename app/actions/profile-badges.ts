"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import {
  loadProfileBadges,
  type ProfileBadgeRecord,
} from "@/lib/profile-badges";

export interface BadgeDefinitionRecord {
  slug: string;
  label: string;
  description?: string | null;
  icon: string;
  color: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UpsertBadgeDefinitionInput {
  slug?: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface AwardProfileBadgeInput {
  profileId: string;
  badgeSlug: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

function normalizeSlug(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isValidHexColor(value: string) {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function sanitizeText(value: string | undefined, maxLength: number) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

function sanitizeMetadata(value: Record<string, unknown> | undefined) {
  if (!value) return {};
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function requireAdminBadgeAccess() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) {
    return { supabase, access, error: "Not authenticated" } as const;
  }

  if (!access.isAdmin) {
    return { supabase, access, error: "Forbidden" } as const;
  }

  return { supabase, access, error: null } as const;
}

function validateBadgeDefinitionInput(input: UpsertBadgeDefinitionInput) {
  const label = sanitizeText(input.label, 80);
  if (!label) return { error: "Badge label is required" } as const;

  const slug = normalizeSlug(input.slug || label);
  if (!slug || slug.length < 2) {
    return { error: "Badge slug must be at least 2 characters" } as const;
  }

  const icon = sanitizeText(input.icon || "Award", 40);
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(icon)) {
    return { error: "Badge icon must be a safe icon name" } as const;
  }

  const color = sanitizeText(input.color || "#7c3aed", 16);
  if (!isValidHexColor(color)) {
    return { error: "Badge color must be a valid hex color" } as const;
  }

  const category = sanitizeText(input.category || "general", 40) || "general";
  const description = sanitizeText(input.description, 240) || null;
  const sort_order = Number.isFinite(input.sortOrder)
    ? Math.max(-9999, Math.min(9999, Math.trunc(input.sortOrder || 0)))
    : 0;
  const is_active = input.isActive !== false;

  return {
    error: null,
    value: {
      slug,
      label,
      description,
      icon,
      color,
      category,
      sort_order,
      is_active,
    },
  } as const;
}

export async function listBadgeDefinitions(options?: {
  includeInactive?: boolean;
}) {
  const { supabase, error } = await requireAdminBadgeAccess();
  if (error)
    return { success: false, error, badges: [] as BadgeDefinitionRecord[] };

  let query = supabase
    .from("badge_definitions")
    .select(
      "slug, label, description, icon, color, category, sort_order, is_active, created_at, updated_at",
    )
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error: queryError } = await query;
  if (queryError) {
    return {
      success: false,
      error: queryError.message,
      badges: [] as BadgeDefinitionRecord[],
    };
  }

  return { success: true, badges: (data || []) as BadgeDefinitionRecord[] };
}

export async function createBadgeDefinition(input: UpsertBadgeDefinitionInput) {
  const { supabase, error } = await requireAdminBadgeAccess();
  if (error) return { success: false, error };

  const validated = validateBadgeDefinitionInput(input);
  if (validated.error) {
    return { success: false, error: validated.error };
  }

  const { data, error: insertError } = await supabase
    .from("badge_definitions")
    .insert(validated.value)
    .select(
      "slug, label, description, icon, color, category, sort_order, is_active, created_at, updated_at",
    )
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true, badge: data as BadgeDefinitionRecord };
}

export async function updateBadgeDefinition(
  slug: string,
  input: Omit<UpsertBadgeDefinitionInput, "slug">,
) {
  const { supabase, error } = await requireAdminBadgeAccess();
  if (error) return { success: false, error };

  const validated = validateBadgeDefinitionInput({ ...input, slug });
  if (validated.error) {
    return { success: false, error: validated.error };
  }

  const { data, error: updateError } = await supabase
    .from("badge_definitions")
    .update(validated.value)
    .eq("slug", normalizeSlug(slug))
    .select(
      "slug, label, description, icon, color, category, sort_order, is_active, created_at, updated_at",
    )
    .single();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, badge: data as BadgeDefinitionRecord };
}

export async function setBadgeDefinitionActive(
  slug: string,
  isActive: boolean,
) {
  const { supabase, error } = await requireAdminBadgeAccess();
  if (error) return { success: false, error };

  const { data, error: updateError } = await supabase
    .from("badge_definitions")
    .update({ is_active: isActive })
    .eq("slug", normalizeSlug(slug))
    .select(
      "slug, label, description, icon, color, category, sort_order, is_active, created_at, updated_at",
    )
    .single();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, badge: data as BadgeDefinitionRecord };
}

export async function listProfileBadgesForAdmin(profileId: string) {
  const { supabase, error } = await requireAdminBadgeAccess();
  if (error)
    return { success: false, error, badges: [] as ProfileBadgeRecord[] };

  const normalizedProfileId = sanitizeText(profileId, 64);
  if (!normalizedProfileId) {
    return {
      success: false,
      error: "Profile id is required",
      badges: [] as ProfileBadgeRecord[],
    };
  }

  const badges = await loadProfileBadges(supabase, normalizedProfileId);
  return { success: true, badges };
}

export async function searchProfilesForBadgeAdmin(query: string, limit = 10) {
  const { supabase, error } = await requireAdminBadgeAccess();
  if (error)
    return {
      success: false,
      error,
      profiles: [] as Array<Record<string, unknown>>,
    };

  const normalizedQuery = sanitizeText(query, 80);
  const normalizedLimit = Math.max(1, Math.min(25, Math.trunc(limit || 10)));

  let builder = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, slug")
    .limit(normalizedLimit);

  if (normalizedQuery) {
    builder = builder.or(
      `username.ilike.%${normalizedQuery}%,display_name.ilike.%${normalizedQuery}%,slug.ilike.%${normalizedQuery}%`,
    );
  }

  const { data, error: queryError } = await builder.order("updated_at", {
    ascending: false,
  });

  if (queryError) {
    return {
      success: false,
      error: queryError.message,
      profiles: [] as Array<Record<string, unknown>>,
    };
  }

  return {
    success: true,
    profiles: (data || []) as Array<Record<string, unknown>>,
  };
}

export async function awardProfileBadge(input: AwardProfileBadgeInput) {
  const { supabase, access, error } = await requireAdminBadgeAccess();
  if (error) return { success: false, error };

  const profileId = sanitizeText(input.profileId, 64);
  const badgeSlug = normalizeSlug(input.badgeSlug);
  if (!profileId || !badgeSlug) {
    return { success: false, error: "Profile id and badge slug are required" };
  }

  const note = sanitizeText(input.note, 240) || null;
  const metadata = sanitizeMetadata(input.metadata);

  const { error: rpcError } = await supabase.rpc("award_profile_badge", {
    p_profile_id: profileId,
    p_badge_slug: badgeSlug,
    p_awarded_by: access.user?.id || null,
    p_note: note,
    p_metadata: metadata,
  });

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  const badges = await loadProfileBadges(supabase, profileId);
  return { success: true, badges };
}

export async function revokeProfileBadge(profileId: string, badgeSlug: string) {
  const { supabase, error } = await requireAdminBadgeAccess();
  if (error) return { success: false, error };

  const normalizedProfileId = sanitizeText(profileId, 64);
  const normalizedBadgeSlug = normalizeSlug(badgeSlug);
  if (!normalizedProfileId || !normalizedBadgeSlug) {
    return { success: false, error: "Profile id and badge slug are required" };
  }

  const { error: rpcError } = await supabase.rpc("revoke_profile_badge", {
    p_profile_id: normalizedProfileId,
    p_badge_slug: normalizedBadgeSlug,
  });

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  const badges = await loadProfileBadges(supabase, normalizedProfileId);
  return { success: true, badges };
}
