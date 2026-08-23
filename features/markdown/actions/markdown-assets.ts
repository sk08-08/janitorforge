"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  MARKDOWN_ALLOWED_IMAGE_TYPES,
  MARKDOWN_ASSETS_BUCKET,
  MARKDOWN_IMAGE_CONTEXTS,
  MAX_MARKDOWN_IMAGE_SIZE,
} from "@/features/markdown/config/markdown-assets-config";

const ALLOWED_IMAGE_TYPES = new Set<string>(MARKDOWN_ALLOWED_IMAGE_TYPES);

const ALLOWED_CONTEXTS = new Set<string>(MARKDOWN_IMAGE_CONTEXTS);

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
};

function sanitizeStorageSegment(value: string, maxLength = 100) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, maxLength);
}

// ============================================================================
// Access
// ============================================================================

async function requireMarkdownAssetUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return {
      supabase,
      user: null,
      error: error.message,
    };
  }

  if (!user) {
    return {
      supabase,
      user: null,
      error: "Unauthenticated",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_blocked")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      supabase,
      user: null,
      error: profileError.message,
    };
  }

  if (!profile) {
    return {
      supabase,
      user: null,
      error: "Profile not found",
    };
  }

  if (profile.is_blocked) {
    return {
      supabase,
      user: null,
      error: "Account is blocked",
    };
  }

  return {
    supabase,
    user,
    error: null,
  };
}

// ============================================================================
// Upload
// ============================================================================

export async function uploadMarkdownAssetAction(formData: FormData) {
  try {
    const access = await requireMarkdownAssetUser();

    if (access.error || !access.user) {
      return {
        success: false,
        error: access.error || "Unauthenticated",
      };
    }

    const { user } = access;

    /*
     * createAdminClient() is async in this project.
     *
     * IMPORTANT:
     * We still authenticate the real user above.
     * The admin client is used only for the actual
     * Storage operation, after we have validated
     * the user and generated a safe user-owned path.
     */
    const storageClient = await createAdminClient();

    if (!storageClient) {
      return {
        success: false,
        error: "Server storage access is not configured",
      };
    }

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return {
        success: false,
        error: "No image file provided",
      };
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return {
        success: false,
        error: "Unsupported image type. Use PNG, JPG, WEBP or AVIF.",
      };
    }

    if (file.size > MAX_MARKDOWN_IMAGE_SIZE) {
      return {
        success: false,
        error: "Image is too large. Maximum size is 5 MB.",
      };
    }

    const rawContext = String(formData.get("context") || "").trim();

    if (!ALLOWED_CONTEXTS.has(rawContext)) {
      return {
        success: false,
        error: "Invalid Markdown asset context",
      };
    }

    const resourceKey = sanitizeStorageSegment(
      String(formData.get("resourceKey") || ""),
    );

    const assetId = sanitizeStorageSegment(
      String(formData.get("assetId") || ""),
    );

    if (!resourceKey || !assetId) {
      return {
        success: false,
        error: "Missing Markdown asset information",
      };
    }

    const extension = MIME_EXTENSION_MAP[file.type];

    if (!extension) {
      return {
        success: false,
        error: "Could not determine image extension",
      };
    }

    /*
     * Stable path:
     *
     * user-id/
     *   resource/
     *     resource-key/
     *       image-id.ext
     *
     * Retrying the same pending image uses
     * the same path instead of creating copies.
     */
    const path = [
      user.id,
      rawContext,
      resourceKey,
      `${assetId}.${extension}`,
    ].join("/");

    const { error: uploadError } = await storageClient.storage
      .from(MARKDOWN_ASSETS_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Markdown image upload failed:", uploadError);

      return {
        success: false,
        error: uploadError.message || "Failed to upload Markdown image",
      };
    }

    const { data: publicUrlData } = storageClient.storage
      .from(MARKDOWN_ASSETS_BUCKET)
      .getPublicUrl(path);

    const publicUrl = publicUrlData.publicUrl;

    if (!publicUrl) {
      /*
       * Upload succeeded but URL creation
       * somehow failed.
       *
       * Roll the upload back immediately.
       */
      await storageClient.storage.from(MARKDOWN_ASSETS_BUCKET).remove([path]);

      return {
        success: false,
        error: "Could not create image URL",
      };
    }

    /*
     * DO NOT delete old images here.
     *
     * The real database save has not happened
     * yet. Old assets remain valid until the DB
     * confirms the new Markdown.
     */
    return {
      success: true,
      path,
      publicUrl,
      assetId,
    };
  } catch (error) {
    console.error("Unexpected Markdown image upload error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unexpected image upload error",
    };
  }
}

// ============================================================================
// Remove
// ============================================================================

export async function removeMarkdownAssetsAction(inputPaths: string[]) {
  try {
    const access = await requireMarkdownAssetUser();

    if (access.error || !access.user) {
      return {
        success: false,
        error: access.error || "Unauthenticated",
      };
    }

    const { user } = access;

    const paths = Array.from(
      new Set(
        (inputPaths || [])
          .map((path) => String(path || "").trim())
          .filter(Boolean),
      ),
    ).slice(0, 100);

    if (paths.length === 0) {
      return {
        success: true,
      };
    }

    /*
     * Even though the Storage client uses
     * service-role permissions, we manually
     * restrict deletion to the authenticated
     * user's own folder.
     */
    const userPrefix = `${user.id}/`;

    const safePaths = paths.filter(
      (path) => path.startsWith(userPrefix) && !path.includes(".."),
    );

    if (safePaths.length !== paths.length) {
      return {
        success: false,
        error: "One or more asset paths are forbidden",
      };
    }

    const storageClient = await createAdminClient();

    if (!storageClient) {
      return {
        success: false,
        error: "Server storage access is not configured",
      };
    }

    const { error } = await storageClient.storage
      .from(MARKDOWN_ASSETS_BUCKET)
      .remove(safePaths);

    if (error) {
      console.error("Failed to remove Markdown assets:", error);

      return {
        success: false,
        error: error.message || "Failed to remove Markdown images",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Unexpected Markdown asset removal error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unexpected asset removal error",
    };
  }
}
