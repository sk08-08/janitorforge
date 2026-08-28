import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";

import {
  asExportRecords,
  fetchAllPages,
  fetchAllPagesInChunks,
  uniqueById,
} from "@/features/settings/lib/export-utils";

import {
  BOTS_EXPORT_FORMAT,
  BOTS_EXPORT_VERSION,
  type JanitorForgeBotsExportV1,
} from "@/features/settings/lib/export-types";

export async function buildCurrentUserBotsExport(): Promise<
  | {
      success: true;
      data: JanitorForgeBotsExportV1;
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

    const ownedBots = await fetchAllPages(
      "bots",
      async (from, to) =>
        await supabase
          .from("bots")
          .select(
            `
            id,
            user_id,
            name,
            short_description,
            personality,
            first_message,
            scenario,
            example_dialogues,
            tags,
            rating,
            image_url,
            chat_name,
            alternate_greetings,
            require_collab_approval,
            hide_sensitive_fields,
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

    const ownedBotIds = ownedBots.map((bot) => bot.id);

    const myCollaborations = await fetchAllPages(
      "collaboration memberships",
      async (from, to) =>
        await supabase
          .from("bot_collaborators")
          .select(
            `
            id,
            bot_id,
            user_id,
            invited_by,
            role,
            status,
            created_at,
            updated_at
          `,
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    const ownedBotCollaborations = await fetchAllPagesInChunks(
      "owned bot collaborators",
      ownedBotIds,
      async (botIdChunk, from, to) =>
        await supabase
          .from("bot_collaborators")
          .select(
            `
            id,
            bot_id,
            user_id,
            invited_by,
            role,
            status,
            created_at,
            updated_at
          `,
          )
          .in("bot_id", botIdChunk)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    const collaborations = uniqueById([
      ...myCollaborations,
      ...ownedBotCollaborations,
    ]);

    const collaborationBotIds = myCollaborations.map((row) => row.bot_id);

    const relevantBotIds = [
      ...new Set([...ownedBotIds, ...collaborationBotIds]),
    ];

    const activityByRelevantBots = await fetchAllPagesInChunks(
      "bot activity",
      relevantBotIds,
      async (botIdChunk, from, to) =>
        await supabase
          .from("bot_activity_log")
          .select(
            `
            id,
            bot_id,
            user_id,
            action,
            details,
            created_at
          `,
          )
          .in("bot_id", botIdChunk)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    const myBotActivity = await fetchAllPages(
      "personal bot activity",
      async (from, to) =>
        await supabase
          .from("bot_activity_log")
          .select(
            `
            id,
            bot_id,
            user_id,
            action,
            details,
            created_at
          `,
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    const botActivity = uniqueById([
      ...activityByRelevantBots,
      ...myBotActivity,
    ]);

    const commentsByRelevantBots = await fetchAllPagesInChunks(
      "bot comments",
      relevantBotIds,
      async (botIdChunk, from, to) =>
        await supabase
          .from("bot_comments")
          .select(
            `
            id,
            bot_id,
            user_id,
            content,
            parent_id,
            created_at,
            updated_at
          `,
          )
          .in("bot_id", botIdChunk)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    const myBotComments = await fetchAllPages(
      "personal bot comments",
      async (from, to) =>
        await supabase
          .from("bot_comments")
          .select(
            `
            id,
            bot_id,
            user_id,
            content,
            parent_id,
            created_at,
            updated_at
          `,
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    const botComments = uniqueById([
      ...commentsByRelevantBots,
      ...myBotComments,
    ]);

    const changeRequestsByRelevantBots = await fetchAllPagesInChunks(
      "bot change requests",
      relevantBotIds,
      async (botIdChunk, from, to) =>
        await supabase
          .from("bot_change_requests")
          .select(
            `
            id,
            bot_id,
            author_id,
            status,
            proposed_changes,
            description,
            reviewed_by,
            reviewed_at,
            rejection_reason,
            created_at,
            updated_at
          `,
          )
          .in("bot_id", botIdChunk)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    const myChangeRequests = await fetchAllPages(
      "personal bot change requests",
      async (from, to) =>
        await supabase
          .from("bot_change_requests")
          .select(
            `
            id,
            bot_id,
            author_id,
            status,
            proposed_changes,
            description,
            reviewed_by,
            reviewed_at,
            rejection_reason,
            created_at,
            updated_at
          `,
          )
          .eq("author_id", userId)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    const botChangeRequests = uniqueById([
      ...changeRequestsByRelevantBots,
      ...myChangeRequests,
    ]);

    const myForks = await fetchAllPages(
      "bot forks",
      async (from, to) =>
        await supabase
          .from("bot_forks")
          .select(
            `
            id,
            original_bot_id,
            forked_bot_id,
            forked_by,
            fork_reason,
            created_at
          `,
          )
          .eq("forked_by", userId)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    const forksOfOwnedBots = await fetchAllPagesInChunks(
      "fork relationships for owned bots",
      ownedBotIds,
      async (botIdChunk, from, to) =>
        await supabase
          .from("bot_forks")
          .select(
            `
            id,
            original_bot_id,
            forked_bot_id,
            forked_by,
            fork_reason,
            created_at
          `,
          )
          .or(
            `original_bot_id.in.(${botIdChunk.join(",")}),forked_bot_id.in.(${botIdChunk.join(",")})`,
          )
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    const botForks = uniqueById([...myForks, ...forksOfOwnedBots]);

    return {
      success: true,
      data: {
        format: BOTS_EXPORT_FORMAT,
        version: BOTS_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),

        bots: {
          owned: asExportRecords(ownedBots),
          collaborations: asExportRecords(collaborations),
          activity: asExportRecords(botActivity),
          comments: asExportRecords(botComments),
          changeRequests: asExportRecords(botChangeRequests),
          forks: asExportRecords(botForks),
        },
      },
    };
  } catch (error) {
    console.error("Bots export failed:", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not build bots export",
    };
  }
}
