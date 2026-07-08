"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { BotFormData } from "@/lib/types";
import { friendlySupabaseError } from "@/lib/error-utils";

export async function createBotAction(data: BotFormData) {
  const supabase = await createClient();

  // Try to determine user from supabase auth, fallback to janitorforge_session cookie
  let userId: string | undefined;
  try {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData?.user?.id || undefined;
  } catch (e) {
    // ignore error when checking supabase auth session
    userId = undefined;
  }

  if (!userId) {
    const cookieStore = await cookies();
    const session = cookieStore.get("janitorforge_session")?.value;
    if (session) {
      try {
        const parsed = JSON.parse(session);
        userId = parsed?.userId;
      } catch (e) {
        // ignore malformed session cookie
      }
    }
  }

  if (!userId) return { success: false, error: "Unauthenticated" };

  const payload = {
    user_id: userId,
    name: data.name,
    chat_name: (data as any).chatName || null,
    short_description: data.shortDescription,
    personality: data.personality,
    first_message: data.firstMessage,
    alternate_greetings: data.alternateGreetings || [],
    scenario: data.scenario,
    example_dialogues: data.exampleDialogues,
    tags: data.tags,
    rating: data.rating,
    image_url: data.imageUrl || null,
    hide_sensitive_fields: data.hideSensitiveFields === true,
  };

  const { data: inserted, error } = await supabase
    .from("bots")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to create bot"),
    };
  }

  return { success: true, bot: inserted };
}

export async function updateBotAction(id: string, data: Partial<BotFormData>) {
  const supabase = await createClient();

  // Ensure authenticated (supabase auth or janitorforge_session)
  let userId: string | undefined;
  try {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData?.user?.id || undefined;
  } catch (e) {
    // ignore error when checking supabase auth session
    userId = undefined;
  }
  if (!userId) {
    const cookieStore = await cookies();
    const session = cookieStore.get("janitorforge_session")?.value;
    if (session) {
      try {
        const parsed = JSON.parse(session);
        userId = parsed?.userId;
      } catch (e) {
        // ignore malformed session cookie
      }
    }
  }
  if (!userId) return { success: false, error: "Unauthenticated" };

  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if ((data as any).chatName !== undefined)
    payload.chat_name = (data as any).chatName;
  if (data.shortDescription !== undefined)
    payload.short_description = data.shortDescription;
  if (data.personality !== undefined) payload.personality = data.personality;
  if (data.firstMessage !== undefined)
    payload.first_message = data.firstMessage;
  if (data.alternateGreetings !== undefined)
    payload.alternate_greetings = data.alternateGreetings;
  if (data.scenario !== undefined) payload.scenario = data.scenario;
  if (data.exampleDialogues !== undefined)
    payload.example_dialogues = data.exampleDialogues;
  if (data.tags !== undefined) payload.tags = data.tags;
  if (data.rating !== undefined) payload.rating = data.rating;
  if (data.imageUrl !== undefined) payload.image_url = data.imageUrl;
  if (data.hideSensitiveFields !== undefined)
    payload.hide_sensitive_fields = data.hideSensitiveFields;

  const { data: updated, error } = await supabase
    .from("bots")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to update bot"),
    };
  }

  return { success: true, bot: updated };
}

export async function deleteBotAction(id: string) {
  const supabase = await createClient();

  // Ensure authenticated (supabase auth or janitorforge_session)
  let userId: string | undefined;
  try {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData?.user?.id || undefined;
  } catch (e) {
    // ignore error when checking supabase auth session
    userId = undefined;
  }
  if (!userId) {
    const cookieStore = await cookies();
    const session = cookieStore.get("janitorforge_session")?.value;
    if (session) {
      try {
        const parsed = JSON.parse(session);
        userId = parsed?.userId;
      } catch (e) {
        // ignore malformed session cookie
      }
    }
  }
  if (!userId) return { success: false, error: "Unauthenticated" };

  // Verify ownership before deleting
  const { data: bot, error: fetchError } = await supabase
    .from("bots")
    .select("user_id")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchError || !bot) {
    return { success: false, error: "Bot not found" };
  }
  if (bot.user_id !== userId) {
    return {
      success: false,
      error: "You don't have permission to delete this bot",
    };
  }

  const { error } = await supabase
    .from("bots")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to delete bot"),
    };
  }
  return { success: true };
}
