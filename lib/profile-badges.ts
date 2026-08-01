import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProfileBadgeRecord {
  id: string;
  slug: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
  awardedAt?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toObjectRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeSingleProfileBadge(
  value: unknown,
): ProfileBadgeRecord | null {
  const record = toObjectRecord(value);
  if (!record) return null;

  const slug =
    toStringValue(record.id) ||
    toStringValue(record.slug) ||
    toStringValue(record.badge_slug);
  const label = toStringValue(record.label);

  if (!slug || !label) {
    return null;
  }

  const metadata = toObjectRecord(record.metadata) || undefined;

  return {
    id: slug,
    slug,
    label,
    description: toStringValue(record.description) || undefined,
    icon: toStringValue(record.icon) || undefined,
    color: toStringValue(record.color) || undefined,
    category: toStringValue(record.category) || undefined,
    awardedAt:
      toStringValue(record.awardedAt) ||
      toStringValue(record.awarded_at) ||
      undefined,
    note: toStringValue(record.note) || undefined,
    metadata,
  };
}

export function normalizeProfileBadges(value: unknown): ProfileBadgeRecord[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => normalizeSingleProfileBadge(entry))
    .filter((entry): entry is ProfileBadgeRecord => !!entry);
}

export async function loadProfileBadges(
  supabase: SupabaseClient,
  profileId: string,
  legacyFallback?: unknown,
): Promise<ProfileBadgeRecord[]> {
  const { data, error } = await supabase.rpc("get_profile_badges", {
    p_profile_id: profileId,
  });

  if (error) {
    return normalizeProfileBadges(legacyFallback);
  }

  return normalizeProfileBadges(data);
}
