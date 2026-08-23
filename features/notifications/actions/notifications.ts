"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Get notifications for current user
// ---------------------------------------------------------------------------

export async function getNotifications(limit = 20) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", notifications: [] };
  }

  const { data, error } = await supabase
    .from("active_notifications")
    .select("id, type, title, message, link, is_read, metadata, created_at")
    .eq("user_id", access.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { success: false, error: error.message, notifications: [] };
  }
  return { success: true, notifications: (data || []) as Notification[] };
}

// ---------------------------------------------------------------------------
// Get unread notification count
// ---------------------------------------------------------------------------

export async function getUnreadCount() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, count: 0 };
  }

  const { count, error } = await supabase
    .from("active_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", access.user.id)
    .eq("is_read", false);

  if (error) {
    return { success: false, count: 0 };
  }
  return { success: true, count: count || 0 };
}

// ---------------------------------------------------------------------------
// Mark a single notification as read
// ---------------------------------------------------------------------------

export async function markAsRead(notificationId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", access.user.id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// Mark all notifications as read
// ---------------------------------------------------------------------------

export async function markAllAsRead() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", access.user.id)
    .eq("is_read", false);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete a notification
// ---------------------------------------------------------------------------

export async function deleteNotification(notificationId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", access.user.id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
