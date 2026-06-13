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
    .select("id, user_id")
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

  // Upsert collaborator record
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

  const { error } = await supabase
    .from("bot_collaborators")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", collaboratorId)
    .eq("user_id", access.user.id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// Remove collaborator
// ---------------------------------------------------------------------------

export async function removeCollaborator(collaboratorId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
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

  const { data, error } = await supabase
    .from("bot_collaborators")
    .select("id, user_id, invited_by, role, status, created_at")
    .eq("bot_id", botId);

  if (error) {
    return { success: false, error: error.message, collaborators: [] };
  }
  return { success: true, collaborators: data || [] };
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

  return { success: true, forkedBotId: forkedBot.id };
}

// ---------------------------------------------------------------------------
// Get pending invites for current user
// ---------------------------------------------------------------------------

export async function getMyPendingInvites() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", invites: [] };
  }

  const { data, error } = await supabase
    .from("bot_collaborators")
    .select("id, bot_id, invited_by, role, status, created_at")
    .eq("user_id", access.user.id)
    .eq("status", "pending");

  if (error) {
    return { success: false, error: error.message, invites: [] };
  }
  return { success: true, invites: data || [] };
}
