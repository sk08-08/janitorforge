"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { BotFormData } from "@/features/bots/types/bot-types";
import { friendlySupabaseError } from "@/lib/error-utils";
import { v4 as uuidv4 } from "uuid";
import {
  BOT_ASSETS_BUCKET,
  extractStorageObjectPathFromPublicUrl,
  getStoragePublicUrl,
} from "@/lib/storage-assets";

const ALLOWED_BOT_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
];
const MAX_BOT_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

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

  const { data: existingBot, error: existingError } = await supabase
    .from("bots")
    .select("id, user_id, image_url")
    .eq("id", id)
    .single();

  if (existingError || !existingBot) {
    return { success: false, error: "Bot not found" };
  }
  if (existingBot.user_id !== userId) {
    return {
      success: false,
      error: "You don't have permission to update this bot",
    };
  }

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

  if (data.imageUrl !== undefined) {
    const oldPath = extractStorageObjectPathFromPublicUrl(
      existingBot.image_url,
      BOT_ASSETS_BUCKET,
    );
    const newPath = extractStorageObjectPathFromPublicUrl(
      String(data.imageUrl || ""),
      BOT_ASSETS_BUCKET,
    );
    if (oldPath && oldPath !== newPath) {
      await supabase.storage.from(BOT_ASSETS_BUCKET).remove([oldPath]);
    }
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
    .select("user_id, image_url")
    .eq("id", id)
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

  const imagePath = extractStorageObjectPathFromPublicUrl(
    (bot as any).image_url,
    BOT_ASSETS_BUCKET,
  );
  if (imagePath) {
    await supabase.storage.from(BOT_ASSETS_BUCKET).remove([imagePath]);
  }

  const { error } = await supabase
    .from("bots")
    .update({ deleted_at: new Date().toISOString(), image_url: null })
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

export async function uploadBotImageAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "No image file provided" };
  }

  if (!ALLOWED_BOT_IMAGE_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "Unsupported image type. Use PNG, JPG, WEBP or AVIF",
    };
  }

  if (file.size > MAX_BOT_IMAGE_SIZE_BYTES) {
    return { success: false, error: "Image is too large (max 4MB)" };
  }

  const supabase = await createClient();

  let userId: string | undefined;
  try {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData?.user?.id || undefined;
  } catch {
    userId = undefined;
  }
  if (!userId) {
    const cookieStore = await cookies();
    const session = cookieStore.get("janitorforge_session")?.value;
    if (session) {
      try {
        const parsed = JSON.parse(session);
        userId = parsed?.userId;
      } catch {
        userId = undefined;
      }
    }
  }
  if (!userId) return { success: false, error: "Unauthenticated" };

  const existingUrl = String(formData.get("existingUrl") || "").trim();
  const existingPath = extractStorageObjectPathFromPublicUrl(
    existingUrl,
    BOT_ASSETS_BUCKET,
  );
  const targetPath =
    existingPath && existingPath.startsWith(`${userId}/`)
      ? existingPath
      : `${userId}/${uuidv4()}`;

  const { error: uploadError } = await supabase.storage
    .from(BOT_ASSETS_BUCKET)
    .upload(targetPath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      success: false,
      error: friendlySupabaseError(uploadError, "Failed to upload image"),
      raw: uploadError,
    };
  }

  if (existingPath && existingPath !== targetPath) {
    await supabase.storage.from(BOT_ASSETS_BUCKET).remove([existingPath]);
  }

  const publicUrl = getStoragePublicUrl(BOT_ASSETS_BUCKET, targetPath);
  return { success: true, url: publicUrl, path: targetPath };
}

export async function removeBotImageAction(url: string) {
  const supabase = await createClient();

  let userId: string | undefined;
  try {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData?.user?.id || undefined;
  } catch {
    userId = undefined;
  }
  if (!userId) {
    const cookieStore = await cookies();
    const session = cookieStore.get("janitorforge_session")?.value;
    if (session) {
      try {
        const parsed = JSON.parse(session);
        userId = parsed?.userId;
      } catch {
        userId = undefined;
      }
    }
  }
  if (!userId) return { success: false, error: "Unauthenticated" };

  const path = extractStorageObjectPathFromPublicUrl(url, BOT_ASSETS_BUCKET);
  if (!path) return { success: true };
  if (!path.startsWith(`${userId}/`)) {
    return { success: false, error: "Forbidden" };
  }

  const { error } = await supabase.storage
    .from(BOT_ASSETS_BUCKET)
    .remove([path]);
  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to remove image"),
      raw: error,
    };
  }

  return { success: true };
}
