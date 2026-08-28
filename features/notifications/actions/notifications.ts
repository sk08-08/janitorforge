"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import {
  isNotificationType,
  type NotificationRecord,
} from "@/features/notifications/lib/notification-types";

interface NotificationCursor {
  createdAt: string;
  id: string;
}

// ---------------------------------------------------------------------------
// Get notifications for current user
// ---------------------------------------------------------------------------

export async function getNotifications(
  limit = 20,
  cursor?: NotificationCursor | null,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) {
    return {
      success: false as const,
      error: "Not authenticated",
      notifications: [] as NotificationRecord[],
    };
  }

  const safeLimit = Math.min(Math.max(limit, 1), 50);

  let query = supabase
    .from("active_notifications")
    .select("id, type, title, message, link, is_read, metadata, created_at")
    .eq("user_id", access.user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit + 1);

  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await query;

  if (error) {
    return {
      success: false as const,
      error: error.message,
      notifications: [] as NotificationRecord[],
      hasMore: false,
      nextCursor: null,
    };
  }

  const rows = data ?? [];
  const hasMore = rows.length > safeLimit;
  const pageRows = hasMore ? rows.slice(0, safeLimit) : rows;

  const notifications: NotificationRecord[] = [];

  for (const row of pageRows) {
    if (!row.id || !row.type || !row.title || !row.created_at) {
      continue;
    }

    if (!isNotificationType(row.type)) {
      console.warn("Ignoring unknown notification type:", row.type);
      continue;
    }

    notifications.push({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message ?? null,
      link: row.link ?? null,
      is_read: row.is_read ?? false,
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null,
      created_at: row.created_at,
    });
  }

  const lastRow = pageRows[pageRows.length - 1];

  return {
    success: true as const,
    notifications,
    hasMore,
    nextCursor:
      lastRow?.id && lastRow.created_at
        ? {
            createdAt: lastRow.created_at,
            id: lastRow.id,
          }
        : null,
  };
}

// ---------------------------------------------------------------------------
// Get unread notification count
// ---------------------------------------------------------------------------

export async function getUnreadCount() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) {
    return {
      success: false as const,
      count: 0,
    };
  }

  const { count, error } = await supabase
    .from("active_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", access.user.id)
    .eq("is_read", false);

  if (error) {
    return {
      success: false as const,
      count: 0,
    };
  }

  return {
    success: true as const,
    count: count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Mark a single notification as read
// ---------------------------------------------------------------------------

export async function markAsRead(notificationId: string) {
  if (!notificationId) {
    return {
      success: false as const,
      error: "Invalid notification",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false as const,
      error: "Not authenticated",
    };
  }

  const { error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });

  if (error) {
    return {
      success: false as const,
      error: error.message,
    };
  }

  return {
    success: true as const,
  };
}

// ---------------------------------------------------------------------------
// Mark all notifications as read
// ---------------------------------------------------------------------------

export async function markAllAsRead() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false as const,
      error: "Not authenticated",
    };
  }

  const { error } = await supabase.rpc("mark_all_notifications_read");

  if (error) {
    return {
      success: false as const,
      error: error.message,
    };
  }

  return {
    success: true as const,
  };
}

// ---------------------------------------------------------------------------
// Dismiss notification
// ---------------------------------------------------------------------------

export async function deleteNotification(notificationId: string) {
  if (!notificationId) {
    return {
      success: false as const,
      error: "Invalid notification",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false as const,
      error: "Not authenticated",
    };
  }

  const { error } = await supabase.rpc("dismiss_notification", {
    p_notification_id: notificationId,
  });

  if (error) {
    return {
      success: false as const,
      error: error.message,
    };
  }

  return {
    success: true as const,
  };
}
