"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { RequestForm } from "@/lib/types";
import { friendlySupabaseError, ensureShareableLink } from "@/lib/error-utils";
import { v4 as uuidv4 } from "uuid";

export async function createFormAction(
  form: Omit<RequestForm, "id" | "createdAt" | "updatedAt">,
) {
  const supabase = await createClient();

  // Determine user id via supabase auth or fallback to janitorforge_session cookie
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
    title: form.title,
    description: form.description ?? "",
    sections: form.sections || [],
    shareable_link: ensureShareableLink(form.shareableLink),
    is_active: !!form.isActive,
  };

  const { data: inserted, error } = await supabase
    .from("request_forms")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to create form"),
    };
  }
  return { success: true, form: inserted };
}

export async function updateFormAction(id: string, data: Partial<RequestForm>) {
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
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined)
    payload.description = data.description ?? "";
  if (data.sections !== undefined) payload.sections = data.sections;
  if (data.shareableLink !== undefined)
    payload.shareable_link = ensureShareableLink(data.shareableLink as any);
  if (data.isActive !== undefined) payload.is_active = data.isActive;

  const { data: updated, error } = await supabase
    .from("request_forms")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to update form"),
    };
  }
  return { success: true, form: updated };
}

export async function deleteFormAction(id: string) {
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

  const { error } = await supabase.from("request_forms").delete().eq("id", id);
  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to delete form"),
    };
  }
  return { success: true };
}
