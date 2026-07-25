"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { RequestForm } from "@/lib/types";
import { friendlySupabaseError, ensureShareableLink } from "@/lib/error-utils";
import { v4 as uuidv4 } from "uuid";
import { resolveFormAppearance } from "@/lib/form-appearance";
import {
  FORM_ASSETS_BUCKET,
  FORM_BANNERS_BUCKET,
  extractFormAssetPathsFromSections,
  getFormBannerPublicUrl,
  getFormAssetPublicUrl,
} from "@/lib/form-assets";

const ALLOWED_FORM_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
];
const MAX_FORM_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

async function resolveUserIdForActions() {
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

  return { supabase, userId };
}

async function removeFormAssetsByPath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
) {
  const deduped = Array.from(
    new Set(paths.map((p) => String(p || "").trim()).filter(Boolean)),
  );

  if (deduped.length === 0) return;
  await supabase.storage.from(FORM_ASSETS_BUCKET).remove(deduped);
}

export async function uploadFormSectionImageAction(formData: FormData) {
  const { supabase, userId } = await resolveUserIdForActions();
  if (!userId) return { success: false, error: "Unauthenticated" };

  const file = formData.get("file");
  const existingPath = String(formData.get("existingPath") || "").trim();

  if (!(file instanceof File)) {
    return { success: false, error: "No image file provided" };
  }

  if (!ALLOWED_FORM_IMAGE_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "Unsupported image type. Use PNG, JPG, WEBP or AVIF",
    };
  }

  if (file.size > MAX_FORM_IMAGE_SIZE_BYTES) {
    return { success: false, error: "Image is too large (max 5MB)" };
  }

  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path =
    existingPath && existingPath.startsWith(`${userId}/`)
      ? existingPath
      : `${userId}/${Date.now()}-${uuidv4()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(FORM_ASSETS_BUCKET)
    .upload(path, file, {
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

  if (
    existingPath &&
    existingPath.startsWith(`${userId}/`) &&
    existingPath !== path
  ) {
    await removeFormAssetsByPath(supabase, [existingPath]);
  }

  return {
    success: true,
    path,
    publicUrl: getFormAssetPublicUrl(path),
  };
}

export async function removeFormSectionImageAction(path: string) {
  const { supabase, userId } = await resolveUserIdForActions();
  if (!userId) return { success: false, error: "Unauthenticated" };

  const target = String(path || "").trim();
  if (!target) return { success: true };

  if (!target.startsWith(`${userId}/`)) {
    return { success: false, error: "Forbidden" };
  }

  const { error } = await supabase.storage
    .from(FORM_ASSETS_BUCKET)
    .remove([target]);
  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to remove image"),
      raw: error,
    };
  }

  return { success: true };
}

export async function uploadFormBannerAction(formData: FormData) {
  const { supabase, userId } = await resolveUserIdForActions();
  if (!userId) return { success: false, error: "Unauthenticated" };

  const file = formData.get("file");
  const existingPath = String(formData.get("existingPath") || "").trim();

  if (!(file instanceof File)) {
    return { success: false, error: "No image file provided" };
  }

  if (!ALLOWED_FORM_IMAGE_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "Unsupported image type. Use PNG, JPG, WEBP or AVIF",
    };
  }

  if (file.size > MAX_FORM_IMAGE_SIZE_BYTES) {
    return { success: false, error: "Image is too large (max 5MB)" };
  }

  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path =
    existingPath && existingPath.startsWith(`${userId}/`)
      ? existingPath
      : `${userId}/form-banner-${Date.now()}-${uuidv4()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(FORM_BANNERS_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      success: false,
      error: friendlySupabaseError(uploadError, "Failed to upload banner"),
      raw: uploadError,
    };
  }

  if (
    existingPath &&
    existingPath.startsWith(`${userId}/`) &&
    existingPath !== path
  ) {
    await supabase.storage.from(FORM_BANNERS_BUCKET).remove([existingPath]);
  }

  return {
    success: true,
    path,
    publicUrl: getFormBannerPublicUrl(path),
  };
}

export async function removeFormBannerAction(path: string) {
  const { supabase, userId } = await resolveUserIdForActions();
  if (!userId) return { success: false, error: "Unauthenticated" };

  const target = String(path || "").trim();
  if (!target) return { success: true };

  if (!target.startsWith(`${userId}/`)) {
    return { success: false, error: "Forbidden" };
  }

  const { error } = await supabase.storage
    .from(FORM_BANNERS_BUCKET)
    .remove([target]);
  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to remove banner"),
      raw: error,
    };
  }

  return { success: true };
}

export async function createFormAction(
  form: Omit<RequestForm, "id" | "createdAt" | "updatedAt">,
) {
  const { supabase, userId } = await resolveUserIdForActions();

  if (!userId) return { success: false, error: "Unauthenticated" };

  const payload = {
    user_id: userId,
    title: form.title,
    description: form.description ?? "",
    banner_asset_path: form.bannerAssetPath ?? null,
    banner_url: form.bannerUrl ?? null,
    sections: form.sections || [],
    appearance: resolveFormAppearance(form.appearance ?? null),
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
      raw: error,
    };
  }
  return { success: true, form: inserted };
}

export async function updateFormAction(id: string, data: Partial<RequestForm>) {
  const { supabase, userId } = await resolveUserIdForActions();
  if (!userId) return { success: false, error: "Unauthenticated" };

  const { data: existingForm, error: existingError } = await supabase
    .from("request_forms")
    .select("id, user_id, sections, banner_asset_path")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (existingError || !existingForm) {
    return { success: false, error: "Form not found" };
  }
  if (existingForm.user_id !== userId) {
    return {
      success: false,
      error: "You don't have permission to update this form",
    };
  }

  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined)
    payload.description = data.description ?? "";
  if (data.bannerAssetPath !== undefined)
    payload.banner_asset_path = data.bannerAssetPath ?? null;
  if (data.bannerUrl !== undefined) payload.banner_url = data.bannerUrl ?? null;
  if (data.sections !== undefined) payload.sections = data.sections;
  if (data.appearance !== undefined)
    payload.appearance = resolveFormAppearance(data.appearance ?? null);
  if (data.shareableLink !== undefined)
    payload.shareable_link = ensureShareableLink(data.shareableLink as any);
  if (data.isActive !== undefined) payload.is_active = data.isActive;
  if (data.deactivatedMessage !== undefined)
    payload.deactivated_message = data.deactivatedMessage ?? "";
  if (data.deactivatedRedirectUrl !== undefined)
    payload.deactivated_redirect_url = data.deactivatedRedirectUrl ?? "";
  if (data.deactivatedRedirectLabel !== undefined)
    payload.deactivated_redirect_label = data.deactivatedRedirectLabel ?? "";
  if (data.deactivatedAccentColor !== undefined)
    payload.deactivated_accent_color = data.deactivatedAccentColor ?? "";

  const { data: updated, error } = await supabase
    .from("request_forms")
    .update(payload)
    .is("deleted_at", null)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to update form"),
      raw: error,
    };
  }

  if (data.sections !== undefined) {
    const beforePaths = extractFormAssetPathsFromSections(
      existingForm.sections,
    );
    const afterPaths = extractFormAssetPathsFromSections(data.sections);
    const removedPaths = beforePaths.filter((p) => !afterPaths.includes(p));
    await removeFormAssetsByPath(supabase, removedPaths);
  }

  if (data.bannerAssetPath !== undefined) {
    const beforeBannerPath = String(
      (existingForm as any).banner_asset_path || "",
    );
    const nextBannerPath = String(data.bannerAssetPath || "");
    if (
      beforeBannerPath &&
      beforeBannerPath.startsWith(`${userId}/`) &&
      beforeBannerPath !== nextBannerPath
    ) {
      await supabase.storage
        .from(FORM_BANNERS_BUCKET)
        .remove([beforeBannerPath]);
    }
  }

  return { success: true, form: updated };
}

export async function deleteFormAction(id: string) {
  const { supabase, userId } = await resolveUserIdForActions();
  if (!userId) return { success: false, error: "Unauthenticated" };

  // Verify ownership before deleting
  const { data: form, error: fetchError } = await supabase
    .from("request_forms")
    .select("user_id, sections, banner_asset_path")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchError || !form) {
    return { success: false, error: "Form not found" };
  }
  if (form.user_id !== userId) {
    return {
      success: false,
      error: "You don't have permission to delete this form",
    };
  }

  const assetPaths = extractFormAssetPathsFromSections((form as any).sections);
  if (assetPaths.length > 0) {
    await removeFormAssetsByPath(supabase, assetPaths);
  }

  const bannerPath = String((form as any).banner_asset_path || "").trim();
  if (bannerPath && bannerPath.startsWith(`${userId}/`)) {
    await supabase.storage.from(FORM_BANNERS_BUCKET).remove([bannerPath]);
  }

  const { error } = await supabase
    .from("request_forms")
    .update({
      deleted_at: new Date().toISOString(),
      banner_asset_path: null,
      banner_url: null,
    })
    .is("deleted_at", null)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to delete form"),
      raw: error,
    };
  }
  return { success: true };
}
