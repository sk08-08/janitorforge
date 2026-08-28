import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";

import {
  asExportRecords,
  fetchAllPages,
  fetchAllPagesInChunks,
} from "@/features/settings/lib/export-utils";

import {
  FORMS_EXPORT_FORMAT,
  FORMS_EXPORT_VERSION,
  type JanitorForgeFormsExportV1,
} from "@/features/settings/lib/export-types";

export async function buildCurrentUserFormsExport(): Promise<
  | {
      success: true;
      data: JanitorForgeFormsExportV1;
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

    const forms = await fetchAllPages(
      "forms",
      async (from, to) =>
        await supabase
          .from("request_forms")
          .select(
            `
            id,
            user_id,
            title,
            description,
            sections,
            shareable_link,
            is_active,
            security_sensitivity,
            appearance,
            deactivated_message,
            deactivated_redirect_url,
            deactivated_redirect_label,
            deactivated_accent_color,
            banner_asset_path,
            banner_url,
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

    const formIds = forms.map((form) => form.id);

    // Deliberately excludes:
    // - ip_address
    // - submission_ip
    // - submission_user_agent
    // - honeypot_value
    const submissions = await fetchAllPages(
      "submissions",
      async (from, to) =>
        await supabase
          .from("requests")
          .select(
            `
            id,
            form_id,
            form_title,
            notes,
            response_labels,
            responses,
            status,
            submitter_name,
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

    const flaggedRequests = await fetchAllPagesInChunks(
      "moderation data",
      formIds,
      async (formIdChunk, from, to) =>
        await supabase
          .from("flagged_requests")
          .select(
            `
            id,
            form_id,
            request_id,
            risk_level,
            flagged_fields,
            reason,
            reviewed,
            review_action,
            review_notes,
            reviewed_at,
            created_at
          `,
          )
          .in("form_id", formIdChunk)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    const customBlocklists = await fetchAllPagesInChunks(
      "custom blocklists",
      formIds,
      async (formIdChunk, from, to) =>
        await supabase
          .from("custom_blocklists")
          .select(
            `
            id,
            form_id,
            pattern,
            is_regex,
            severity,
            created_at
          `,
          )
          .in("form_id", formIdChunk)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    const formTemplates = await fetchAllPages(
      "form templates",
      async (from, to) =>
        await supabase
          .from("form_templates")
          .select(
            `
            id,
            name,
            description,
            category,
            sections,
            appearance,
            icon,
            created_at,
            updated_at
          `,
          )
          .eq("owner_id", userId)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    return {
      success: true,
      data: {
        format: FORMS_EXPORT_FORMAT,
        version: FORMS_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),

        forms: {
          forms: asExportRecords(forms),
          submissions: asExportRecords(submissions),
          moderation: asExportRecords(flaggedRequests),
          customBlocklists: asExportRecords(customBlocklists),
          templates: asExportRecords(formTemplates),
        },
      },
    };
  } catch (error) {
    console.error("Forms export failed:", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not build forms export",
    };
  }
}
