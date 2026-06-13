"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedbackStatus = "new" | "reviewing" | "resolved" | "closed";
type FeedbackPriority = "low" | "medium" | "high" | "urgent";

// ---------------------------------------------------------------------------
// Guard: require admin
// ---------------------------------------------------------------------------

async function requireAdmin() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user || !access.isAdmin) {
    throw new Error("Admin access required");
  }
  return { supabase, userId: access.user.id };
}

// ---------------------------------------------------------------------------
// Update feedback status
// ---------------------------------------------------------------------------

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus,
) {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ status })
      .eq("id", feedbackId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}

// ---------------------------------------------------------------------------
// Update feedback priority
// ---------------------------------------------------------------------------

export async function updateFeedbackPriority(
  feedbackId: string,
  priority: FeedbackPriority,
) {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ priority })
      .eq("id", feedbackId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}

// ---------------------------------------------------------------------------
// Mark as read / unread
// ---------------------------------------------------------------------------

export async function markFeedbackRead(feedbackId: string, isRead: boolean) {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ is_read: isRead })
      .eq("id", feedbackId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}

// ---------------------------------------------------------------------------
// Mark multiple as read
// ---------------------------------------------------------------------------

export async function markMultipleRead(feedbackIds: string[], isRead: boolean) {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ is_read: isRead })
      .in("id", feedbackIds);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}

// ---------------------------------------------------------------------------
// Bulk update status
// ---------------------------------------------------------------------------

export async function bulkUpdateStatus(
  feedbackIds: string[],
  status: FeedbackStatus,
) {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ status })
      .in("id", feedbackIds);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}

// ---------------------------------------------------------------------------
// Add admin note
// ---------------------------------------------------------------------------

export async function addFeedbackNote(feedbackId: string, note: string) {
  try {
    const { supabase, userId } = await requireAdmin();
    if (!note.trim()) {
      return { success: false, error: "Note cannot be empty" };
    }

    const { data, error } = await supabase
      .from("feedback_notes")
      .insert({
        feedback_id: feedbackId,
        author_id: userId,
        note: note.trim(),
      })
      .select("id, note, created_at")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, note: data };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}

// ---------------------------------------------------------------------------
// Get feedback notes
// ---------------------------------------------------------------------------

export async function getFeedbackNotes(feedbackId: string) {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from("feedback_notes")
      .select("id, author_id, note, created_at")
      .eq("feedback_id", feedbackId)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message, notes: [] };
    }
    return { success: true, notes: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized", notes: [] };
  }
}

// ---------------------------------------------------------------------------
// Delete feedback
// ---------------------------------------------------------------------------

export async function deleteFeedback(feedbackId: string) {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("feedback_submissions")
      .delete()
      .eq("id", feedbackId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}
