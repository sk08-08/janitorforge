"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";

type CollaboratorRole = "viewer" | "editor" | "co_owner";

// ---------------------------------------------------------------------------
// Invite collaborator to bot
// ---------------------------------------------------------------------------

export async function inviteCollaborator(
  botId: string,
  username: string,
  role: CollaboratorRole,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify bot ownership
  const { data: bot } = await supabase
    .from("bots")
    .select("id, user_id, name")
    .eq("id", botId)
    .single();

  if (!bot || bot.user_id !== access.user.id) {
    return {
      success: false,
      error: "You can only invite collaborators to your own bots",
    };
  }

  // Find user by username
  const cleanUsername = username.toLowerCase().trim();
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", cleanUsername)
    .maybeSingle();

  if (!targetProfile) {
    return { success: false, error: `User "${cleanUsername}" not found` };
  }

  if (targetProfile.id === access.user.id) {
    return { success: false, error: "You cannot invite yourself" };
  }

  // Upsert collaborator record — the DB trigger will create the notification
  const { error } = await supabase.from("bot_collaborators").upsert(
    {
      bot_id: botId,
      user_id: targetProfile.id,
      invited_by: access.user.id,
      role,
      status: "pending",
    },
    { onConflict: "bot_id,user_id" },
  );

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, invitedUsername: cleanUsername };
}

// ---------------------------------------------------------------------------
// Accept/decline invite
// ---------------------------------------------------------------------------

export async function respondToInvite(collaboratorId: string, accept: boolean) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  // First get the collaborator record to know the bot_id
  const { data: collabRecord } = await supabase
    .from("bot_collaborators")
    .select("id, bot_id, status")
    .eq("id", collaboratorId)
    .eq("user_id", access.user.id)
    .single();

  if (!collabRecord) {
    return { success: false, error: "Invite not found" };
  }

  if (collabRecord.status !== "pending") {
    return {
      success: false,
      error: "This invite has already been responded to",
    };
  }

  const { error } = await supabase
    .from("bot_collaborators")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", collaboratorId)
    .eq("user_id", access.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, botId: collabRecord.bot_id };
}

// ---------------------------------------------------------------------------
// Remove collaborator (owner removes someone, or collaborator removes self)
// ---------------------------------------------------------------------------

export async function removeCollaborator(collaboratorId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get the collaborator record to verify permissions
  const { data: collabRecord } = await supabase
    .from("bot_collaborators")
    .select("id, bot_id, user_id, role")
    .eq("id", collaboratorId)
    .single();

  if (!collabRecord) {
    return { success: false, error: "Collaborator not found" };
  }

  // Check if the user is the bot owner OR the collaborator themselves
  const { data: bot } = await supabase
    .from("bots")
    .select("user_id")
    .eq("id", collabRecord.bot_id)
    .single();

  const isOwner = bot?.user_id === access.user.id;
  const isSelf = collabRecord.user_id === access.user.id;

  if (!isOwner && !isSelf) {
    return {
      success: false,
      error: "You don't have permission to remove this collaborator",
    };
  }

  // Log the removal activity (only if owner is removing)
  if (isOwner && !isSelf) {
    await supabase.from("bot_activity_log").insert({
      bot_id: collabRecord.bot_id,
      user_id: access.user.id,
      action: "collaborator_removed",
      details: {
        removed_user_id: collabRecord.user_id,
        role: collabRecord.role,
      },
    });
  }

  const { error } = await supabase
    .from("bot_collaborators")
    .delete()
    .eq("id", collaboratorId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// Get collaborators for a bot
// ---------------------------------------------------------------------------

export async function getBotCollaborators(botId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", collaborators: [] };
  }

  // First try with join syntax
  const { data, error } = await supabase
    .from("bot_collaborators")
    .select(
      "id, user_id, invited_by, role, status, created_at, profile:user_id(username, display_name, avatar_url), inviter:invited_by(username, display_name)",
    )
    .eq("bot_id", botId);

  if (error) {
    // Fallback: fetch collaborators and profiles separately
    const { data: collabs, error: collabError } = await supabase
      .from("bot_collaborators")
      .select("id, user_id, invited_by, role, status, created_at")
      .eq("bot_id", botId);

    if (collabError) {
      return { success: false, error: collabError.message, collaborators: [] };
    }

    // Fetch all unique user IDs
    const userIds = [
      ...new Set([
        ...(collabs || []).map((c) => c.user_id),
        ...(collabs || []).map((c) => c.invited_by),
      ]),
    ];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const enrichedCollabs = (collabs || []).map((c) => ({
        ...c,
        profile: profileMap.get(c.user_id) || null,
        inviter: profileMap.get(c.invited_by) || null,
      }));

      return { success: true, collaborators: enrichedCollabs };
    }

    return { success: true, collaborators: collabs || [] };
  }

  return { success: true, collaborators: data || [] };
}

// ---------------------------------------------------------------------------
// Update collaborator role (owner only)
// ---------------------------------------------------------------------------

export async function updateCollaboratorRole(
  collaboratorId: string,
  newRole: CollaboratorRole,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get the collaborator record
  const { data: collabRecord } = await supabase
    .from("bot_collaborators")
    .select("id, bot_id, user_id, role")
    .eq("id", collaboratorId)
    .single();

  if (!collabRecord) {
    return { success: false, error: "Collaborator not found" };
  }

  // Verify ownership
  const { data: bot } = await supabase
    .from("bots")
    .select("user_id")
    .eq("id", collabRecord.bot_id)
    .single();

  if (!bot || bot.user_id !== access.user.id) {
    return { success: false, error: "Only the bot owner can change roles" };
  }

  const { error } = await supabase
    .from("bot_collaborators")
    .update({ role: newRole })
    .eq("id", collaboratorId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log activity
  await supabase.from("bot_activity_log").insert({
    bot_id: collabRecord.bot_id,
    user_id: access.user.id,
    action: "role_changed",
    details: {
      collaborator_user_id: collabRecord.user_id,
      old_role: collabRecord.role,
      new_role: newRole,
    },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Fork a bot
// ---------------------------------------------------------------------------

export async function forkBot(originalBotId: string, reason?: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get original bot
  const { data: originalBot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", originalBotId)
    .is("deleted_at", null)
    .single();

  if (!originalBot) {
    return { success: false, error: "Original bot not found" };
  }

  // Create forked bot
  const { data: forkedBot, error: insertError } = await supabase
    .from("bots")
    .insert({
      user_id: access.user.id,
      name: `${originalBot.name} (Fork)`,
      chat_name: originalBot.chat_name,
      short_description: originalBot.short_description,
      personality: originalBot.personality,
      first_message: originalBot.first_message,
      alternate_greetings: originalBot.alternate_greetings || [],
      scenario: originalBot.scenario,
      example_dialogues: originalBot.example_dialogues,
      tags: originalBot.tags || [],
      rating: originalBot.rating,
      image_url: originalBot.image_url,
    })
    .select("id")
    .single();

  if (insertError || !forkedBot) {
    return {
      success: false,
      error: insertError?.message || "Failed to create fork",
    };
  }

  // Record fork relationship
  await supabase.from("bot_forks").insert({
    original_bot_id: originalBotId,
    forked_bot_id: forkedBot.id,
    forked_by: access.user.id,
    fork_reason: reason || "",
  });

  // Log activity on original bot
  await supabase.from("bot_activity_log").insert({
    bot_id: originalBotId,
    user_id: access.user.id,
    action: "forked",
    details: {
      forked_bot_id: forkedBot.id,
      reason: reason || "",
    },
  });

  return { success: true, forkedBotId: forkedBot.id };
}

// ---------------------------------------------------------------------------
// Get followed users for current user (for invite suggestions)
// ---------------------------------------------------------------------------

export async function getMyFollowing() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", following: [] };
  }

  const { data, error } = await supabase
    .from("profile_follows")
    .select("following:following_id(id, username, display_name, avatar_url)")
    .eq("follower_id", access.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message, following: [] };
  }

  const following = (data || []).map((r: any) => r.following).filter(Boolean);

  return { success: true, following };
}

// ---------------------------------------------------------------------------
// Get pending invites for current user (uses SECURITY DEFINER function)
// ---------------------------------------------------------------------------

export async function getMyPendingInvites() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", invites: [] };
  }

  // Use the SECURITY DEFINER function to bypass RLS and get bot info
  const { data, error } = await supabase.rpc(
    "get_pending_invites_with_bot_info",
    { p_user_id: access.user.id },
  );

  if (error) {
    // Fallback to direct query if RPC doesn't exist yet (migration not applied)
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("bot_collaborators")
      .select(
        "id, bot_id, invited_by, role, status, created_at, bot:bot_id(name, image_url), inviter:invited_by(username, display_name, avatar_url)",
      )
      .eq("user_id", access.user.id)
      .eq("status", "pending");

    if (fallbackError) {
      return { success: false, error: fallbackError.message, invites: [] };
    }

    return {
      success: true,
      invites: (fallbackData || []).map((inv: any) => ({
        id: inv.id,
        bot_id: inv.bot_id,
        invited_by: inv.invited_by,
        role: inv.role,
        status: inv.status,
        created_at: inv.created_at,
        bot_name: inv.bot?.name || null,
        bot_image_url: inv.bot?.image_url || null,
        bot_short_description: null,
        inviter_username: inv.inviter?.username || null,
        inviter_display_name: inv.inviter?.display_name || null,
        inviter_avatar_url: inv.inviter?.avatar_url || null,
      })),
    };
  }

  return { success: true, invites: data || [] };
}

// ---------------------------------------------------------------------------
// Get collaborative bots for current user
// ---------------------------------------------------------------------------

export async function getCollaborativeBots() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", bots: [] };
  }

  const { data, error } = await supabase.rpc("get_collaborative_bots", {
    p_user_id: access.user.id,
  });

  if (error) {
    return { success: false, error: error.message, bots: [] };
  }

  // Client-side filter: exclude soft-deleted bots (backup until SQL migration runs)
  const filtered = (data || []).filter(
    (b: any) => b.deleted_at === null || b.deleted_at === undefined,
  );

  return { success: true, bots: filtered };
}

// ---------------------------------------------------------------------------
// Get bot activity log
// ---------------------------------------------------------------------------

export async function getBotActivity(botId: string, limit = 20) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", activity: [] };
  }

  const { data, error } = await supabase.rpc("get_bot_activity", {
    p_bot_id: botId,
    p_limit: limit,
  });

  if (error) {
    return { success: false, error: error.message, activity: [] };
  }

  return { success: true, activity: data || [] };
}

// ---------------------------------------------------------------------------
// Add a comment to a bot
// ---------------------------------------------------------------------------

export async function addBotComment(
  botId: string,
  content: string,
  parentId?: string,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!content.trim()) {
    return { success: false, error: "Comment cannot be empty" };
  }

  const { data, error } = await supabase
    .from("bot_comments")
    .insert({
      bot_id: botId,
      user_id: access.user.id,
      content: content.trim(),
      parent_id: parentId || null,
    })
    .select("id, content, created_at")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Log activity
  await supabase.from("bot_activity_log").insert({
    bot_id: botId,
    user_id: access.user.id,
    action: "commented",
    details: { comment_id: data.id },
  });

  return { success: true, comment: data };
}

// ---------------------------------------------------------------------------
// Get comments for a bot
// ---------------------------------------------------------------------------

export async function getBotComments(botId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", comments: [] };
  }

  // Try with join syntax first
  const { data, error } = await supabase
    .from("bot_comments")
    .select(
      "id, bot_id, user_id, content, parent_id, created_at, updated_at, profile:user_id(username, display_name, avatar_url)",
    )
    .eq("bot_id", botId)
    .order("created_at", { ascending: true });

  if (error) {
    // Fallback: fetch comments and profiles separately
    const { data: rawComments, error: commentError } = await supabase
      .from("bot_comments")
      .select("id, bot_id, user_id, content, parent_id, created_at, updated_at")
      .eq("bot_id", botId)
      .order("created_at", { ascending: true });

    if (commentError) {
      return { success: false, error: commentError.message, comments: [] };
    }

    const userIds = [...new Set((rawComments || []).map((c) => c.user_id))];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const enrichedComments = (rawComments || []).map((c) => ({
        ...c,
        profile: profileMap.get(c.user_id) || null,
      }));

      return { success: true, comments: enrichedComments };
    }

    return { success: true, comments: rawComments || [] };
  }

  return { success: true, comments: data || [] };
}

// ---------------------------------------------------------------------------
// Delete a comment
// ---------------------------------------------------------------------------

export async function deleteBotComment(commentId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("bot_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Change Request System (like GitHub PRs for bots)
// ---------------------------------------------------------------------------

export async function submitChangeRequest(
  botId: string,
  proposedChanges: Record<string, unknown>,
  description?: string,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!proposedChanges || Object.keys(proposedChanges).length === 0) {
    return { success: false, error: "No changes proposed" };
  }

  const { data, error } = await supabase
    .from("bot_change_requests")
    .insert({
      bot_id: botId,
      author_id: access.user.id,
      proposed_changes: proposedChanges,
      description: description || null,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Log activity
  await supabase.from("bot_activity_log").insert({
    bot_id: botId,
    user_id: access.user.id,
    action: "change_request_submitted",
    details: {
      change_request_id: data.id,
      fields: Object.keys(proposedChanges),
    },
  });

  return { success: true, changeRequestId: data.id };
}

export async function approveChangeRequest(changeRequestId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: cr } = await supabase
    .from("bot_change_requests")
    .select("id, bot_id, author_id, status, proposed_changes")
    .eq("id", changeRequestId)
    .single();

  if (!cr) return { success: false, error: "Change request not found" };
  if (cr.status !== "pending")
    return { success: false, error: "Already reviewed" };

  // Verify ownership
  const { data: bot } = await supabase
    .from("bots")
    .select("user_id")
    .eq("id", cr.bot_id)
    .single();

  if (!bot || bot.user_id !== access.user.id) {
    return { success: false, error: "Only the owner can approve" };
  }

  // Apply the changes to the bot
  const updatePayload: Record<string, unknown> = {};
  const changes = cr.proposed_changes as Record<string, unknown>;
  for (const [field, value] of Object.entries(changes)) {
    updatePayload[field] = value;
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await supabase
      .from("bots")
      .update(updatePayload)
      .eq("id", cr.bot_id);

    if (updateError) {
      return {
        success: false,
        error: `Failed to apply changes: ${updateError.message}`,
      };
    }
  }

  // Mark as approved
  await supabase
    .from("bot_change_requests")
    .update({
      status: "approved",
      reviewed_by: access.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", changeRequestId);

  // Log activity
  await supabase.from("bot_activity_log").insert({
    bot_id: cr.bot_id,
    user_id: access.user.id,
    action: "change_request_approved",
    details: { change_request_id: changeRequestId, author_id: cr.author_id },
  });

  return { success: true };
}

export async function rejectChangeRequest(
  changeRequestId: string,
  reason?: string,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: cr } = await supabase
    .from("bot_change_requests")
    .select("id, bot_id, author_id, status")
    .eq("id", changeRequestId)
    .single();

  if (!cr) return { success: false, error: "Change request not found" };
  if (cr.status !== "pending")
    return { success: false, error: "Already reviewed" };

  const { data: bot } = await supabase
    .from("bots")
    .select("user_id")
    .eq("id", cr.bot_id)
    .single();

  if (!bot || bot.user_id !== access.user.id) {
    return { success: false, error: "Only the owner can reject" };
  }

  await supabase
    .from("bot_change_requests")
    .update({
      status: "rejected",
      reviewed_by: access.user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq("id", changeRequestId);

  await supabase.from("bot_activity_log").insert({
    bot_id: cr.bot_id,
    user_id: access.user.id,
    action: "change_request_rejected",
    details: { change_request_id: changeRequestId, reason: reason || "" },
  });

  return { success: true };
}

export async function getBotChangeRequests(botId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", changeRequests: [] };
  }

  const { data, error } = await supabase.rpc("get_bot_change_requests", {
    p_bot_id: botId,
  });

  if (error) {
    // Fallback to direct query
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("bot_change_requests")
      .select(
        "id, bot_id, author_id, status, proposed_changes, description, reviewed_by, reviewed_at, rejection_reason, created_at, updated_at",
      )
      .eq("bot_id", botId)
      .order("created_at", { ascending: false });

    if (fallbackError) {
      return {
        success: false,
        error: fallbackError.message,
        changeRequests: [],
      };
    }

    return { success: true, changeRequests: fallbackData || [] };
  }

  return { success: true, changeRequests: data || [] };
}

export async function getBotApprovalSetting(botId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return {
      success: false,
      error: "Not authenticated",
      requireApproval: false,
    };
  }

  const { data: bot } = await supabase
    .from("bots")
    .select("require_collab_approval")
    .eq("id", botId)
    .single();

  if (!bot) {
    return { success: false, error: "Bot not found", requireApproval: false };
  }

  return {
    success: true,
    requireApproval: bot.require_collab_approval || false,
  };
}

export async function toggleBotApproval(
  botId: string,
  requireApproval: boolean,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: bot } = await supabase
    .from("bots")
    .select("user_id")
    .eq("id", botId)
    .single();

  if (!bot || bot.user_id !== access.user.id) {
    return { success: false, error: "Only the owner can change this setting" };
  }

  const { error } = await supabase
    .from("bots")
    .update({ require_collab_approval: requireApproval })
    .eq("id", botId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
