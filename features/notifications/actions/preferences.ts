"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferenceKey,
  type NotificationPreferences,
} from "@/features/notifications/lib/preferences";

export async function getNotificationPreferences() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) {
    return {
      success: false as const,
      error: "Not authenticated",
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
    };
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("social, collaborations, moderation")
    .eq("user_id", access.user.id)
    .maybeSingle();

  if (error) {
    return {
      success: false as const,
      error: error.message,
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
    };
  }

  if (!data) {
    return {
      success: true as const,
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
    };
  }

  return {
    success: true as const,
    preferences: {
      social: data.social,
      collaborations: data.collaborations,
      moderation: data.moderation,
    } satisfies NotificationPreferences,
  };
}

export async function updateNotificationPreference(
  key: NotificationPreferenceKey,
  value: boolean,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) {
    return {
      success: false as const,
      error: "Not authenticated",
    };
  }

  const allowedKeys: NotificationPreferenceKey[] = [
    "social",
    "collaborations",
    "moderation",
  ];

  if (!allowedKeys.includes(key)) {
    return {
      success: false as const,
      error: "Invalid notification preference",
    };
  }

  const { data: existing, error: readError } = await supabase
    .from("notification_preferences")
    .select("social, collaborations, moderation")
    .eq("user_id", access.user.id)
    .maybeSingle();

  if (readError) {
    return {
      success: false as const,
      error: readError.message,
    };
  }

  const nextPreferences: NotificationPreferences = {
    social: existing?.social ?? DEFAULT_NOTIFICATION_PREFERENCES.social,
    collaborations:
      existing?.collaborations ??
      DEFAULT_NOTIFICATION_PREFERENCES.collaborations,
    moderation:
      existing?.moderation ?? DEFAULT_NOTIFICATION_PREFERENCES.moderation,
    [key]: value,
  };

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: access.user.id,
      ...nextPreferences,
    },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    return {
      success: false as const,
      error: error.message,
    };
  }

  return {
    success: true as const,
    preferences: nextPreferences,
  };
}
