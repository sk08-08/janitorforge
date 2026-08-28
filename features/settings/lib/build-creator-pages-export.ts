import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";

import {
  asExportRecords,
  fetchAllPages,
  fetchAllPagesInChunks,
} from "@/features/settings/lib/export-utils";

import {
  CREATOR_PAGES_EXPORT_FORMAT,
  CREATOR_PAGES_EXPORT_VERSION,
  type JanitorForgeCreatorPagesExportV1,
} from "@/features/settings/lib/export-types";

export async function buildCurrentUserCreatorPagesExport(): Promise<
  | {
      success: true;
      data: JanitorForgeCreatorPagesExportV1;
    }
  | {
      success: false;
      error: string;
    }
> {
  try {
    const supabase = await createClient();
    const access = await getCurrentUserAccess(supabase);

    if (!access.user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const userId = access.user.id;

    const creatorPages = await fetchAllPages(
      "creator pages",
      async (from, to) =>
        await supabase
          .from("creator_pages")
          .select(
            `
            id,
            user_id,
            slug,
            title,
            description,
            layout,
            config,
            is_published,
            created_at,
            updated_at,
            deleted_at
          `,
          )
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    const creatorPageIds = creatorPages.map((page) => page.id);

    const creatorPageSections = await fetchAllPagesInChunks(
      "creator page sections",
      creatorPageIds,
      async (pageIdChunk, from, to) =>
        await supabase
          .from("creator_page_sections")
          .select(
            `
            id,
            page_id,
            kind,
            title,
            config,
            position,
            created_at,
            updated_at,
            deleted_at
          `,
          )
          .in("page_id", pageIdChunk)
          .is("deleted_at", null)
          .order("position", { ascending: true })
          .range(from, to),
    );

    return {
      success: true,
      data: {
        format: CREATOR_PAGES_EXPORT_FORMAT,
        version: CREATOR_PAGES_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),

        creatorPages: {
          pages: asExportRecords(creatorPages),
          sections: asExportRecords(creatorPageSections),
        },
      },
    };
  } catch (error) {
    console.error("Creator Pages export failed:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not build Creator Pages export",
    };
  }
}
