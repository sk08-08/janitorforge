// ============================================================================
// JanitorForge - Public Form Page (server)
// Fetches form by shareable link and renders client form component
// ============================================================================

import { createClient as createServerClient } from "@/lib/supabase/server";
import PublicForm from "@/components/forms/public-form";
import type { FormSection } from "@/lib/types";

export default async function PublicFormPage({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  const { slug } = (await Promise.resolve(params)) as { slug: string };
  try {
    const supabase = await createServerClient();
    const slugValue = String(slug);
    const { data: formData, error: rpcError } = await supabase.rpc(
      "get_public_request_form",
      { p_shareable_link: slugValue },
    );

    let row = formData?.[0] ?? null;

    // Backward compatibility: if the RPC is not deployed yet, fall back to
    // the direct table query used by older schema versions.
    if (!row) {
      const { data: legacyRow, error: legacyError } = await supabase
        .from("request_forms")
        .select(
          "id, user_id, title, description, sections, appearance, is_active",
        )
        .eq("shareable_link", slugValue)
        .eq("is_active", true)
        .maybeSingle();

      if (!legacyError && legacyRow) {
        row = legacyRow;
      }
    }

    if (!row) {
      if (rpcError) {
        console.warn("Public form RPC lookup failed:", rpcError.message);
      }

      return (
        <div className="min-h-screen bg-background flex items-start justify-center pt-12">
          <div className="container max-w-2xl py-8">
            <p className="text-center">Form not found.</p>
          </div>
        </div>
      );
    }

    const form = {
      id: row.id,
      title: row.title,
      description: row.description,
      isActive: !!row.is_active,
      sections: (row.sections || []) as FormSection[],
      appearance: row.appearance || undefined,
      userId: row.user_id,
    };

    return (
      <PublicForm
        form={form}
        feedbackContext={{
          sourcePage: form.title,
          sourceLabel: "Public form",
          sourcePath: `/form/${slugValue}`,
          relatedId: form.id,
          metadata: {
            shareableLink: slugValue,
          },
        }}
      />
    );
  } catch (e) {
    return (
      <div className="min-h-screen bg-background flex items-start justify-center pt-12">
        <div className="container max-w-2xl py-8">
          <p className="text-center">Failed to load form.</p>
        </div>
      </div>
    );
  }
}
