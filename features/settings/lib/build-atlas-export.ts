import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";

import {
  asExportRecords,
  fetchAllPages,
  fetchAllPagesInChunks,
} from "@/features/settings/lib/export-utils";

import {
  ATLAS_EXPORT_FORMAT,
  ATLAS_EXPORT_VERSION,
  type JanitorForgeAtlasExportV1,
} from "@/features/settings/lib/export-types";

export async function buildCurrentUserAtlasExport(): Promise<
  | {
      success: true;
      data: JanitorForgeAtlasExportV1;
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

    const worlds = await fetchAllPages(
      "Atlas worlds",
      async (from, to) =>
        await supabase
          .from("atlas_worlds")
          .select(
            `
            id,
            user_id,
            title,
            slug,
            kind,
            status,
            description,
            lore_summary,
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

    const lorebooks = await fetchAllPages(
      "Atlas lorebooks",
      async (from, to) =>
        await supabase
          .from("atlas_lorebooks")
          .select(
            `
            id,
            user_id,
            world_id,
            title,
            summary,
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

    const entries = await fetchAllPages(
      "Atlas entries",
      async (from, to) =>
        await supabase
          .from("atlas_entries")
          .select(
            `
            id,
            user_id,
            world_id,
            lorebook_id,
            title,
            kind,
            body,
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

    const worldIds = worlds.map((world) => world.id);

    const worldBots = await fetchAllPagesInChunks(
      "Atlas world bots",
      worldIds,
      async (worldIdChunk, from, to) =>
        await supabase
          .from("atlas_world_bots")
          .select(
            `
            world_id,
            bot_id,
            sort_order,
            created_at
          `,
          )
          .in("world_id", worldIdChunk)
          .order("sort_order", { ascending: true })
          .range(from, to),
    );

    const featuredEntries = await fetchAllPagesInChunks(
      "Atlas featured entries",
      worldIds,
      async (worldIdChunk, from, to) =>
        await supabase
          .from("atlas_world_featured_entries")
          .select(
            `
            world_id,
            entry_id,
            sort_order,
            created_at
          `,
          )
          .in("world_id", worldIdChunk)
          .order("sort_order", { ascending: true })
          .range(from, to),
    );

    const featuredLorebooks = await fetchAllPagesInChunks(
      "Atlas featured lorebooks",
      worldIds,
      async (worldIdChunk, from, to) =>
        await supabase
          .from("atlas_world_featured_lorebooks")
          .select(
            `
            world_id,
            lorebook_id,
            sort_order,
            created_at
          `,
          )
          .in("world_id", worldIdChunk)
          .order("sort_order", { ascending: true })
          .range(from, to),
    );

    return {
      success: true,
      data: {
        format: ATLAS_EXPORT_FORMAT,
        version: ATLAS_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),

        atlas: {
          worlds: asExportRecords(worlds),
          lorebooks: asExportRecords(lorebooks),
          entries: asExportRecords(entries),
          worldBots: asExportRecords(worldBots),
          featuredEntries: asExportRecords(featuredEntries),
          featuredLorebooks: asExportRecords(featuredLorebooks),
        },
      },
    };
  } catch (error) {
    console.error("Atlas export failed:", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not build Atlas export",
    };
  }
}
