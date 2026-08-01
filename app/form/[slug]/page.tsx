// ============================================================================
// JanitorForge - Public Form Page (server)
// Fetches form by shareable link and renders client form component
// ============================================================================

import { createClient as createServerClient } from "@/lib/supabase/server";
import PublicForm from "@/components/forms/public-form";
import type { FormSection } from "@/lib/types";
import { renderMarkdown } from "@/lib/markdown";

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
        .from("active_request_forms")
        .select(
          "id, user_id, title, description, banner_asset_path, banner_url, sections, appearance, is_active, deactivated_message, deactivated_redirect_url, deactivated_redirect_label, deactivated_accent_color",
        )
        .eq("shareable_link", slugValue)
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

    // Check if form is deactivated
    if (!row.is_active) {
      const deactivatedMsg = row.deactivated_message || "";
      const redirectUrl = row.deactivated_redirect_url || "";
      const redirectLabel = row.deactivated_redirect_label || "";
      const accentColor = row.deactivated_accent_color || "#7c3aed";

      return (
        <div className="min-h-screen bg-background flex items-start justify-center pt-8 sm:pt-16">
          <div className="container max-w-xl px-4">
            {/* Decorative top accent */}
            <div
              className="h-1 w-full rounded-full mb-8"
              style={{
                background: `linear-gradient(90deg, transparent, ${accentColor}88, transparent)`,
              }}
            />

            <div className="text-center space-y-6">
              {/* Title */}
              <h1
                className="text-3xl sm:text-4xl font-extrabold tracking-tight rendered-markdown"
                style={{ color: accentColor }}
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(row.title || "Form"),
                }}
              />

              {/* Status badge */}
              <div className="flex justify-center">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: `${accentColor}15`,
                    color: accentColor,
                    border: `1px solid ${accentColor}30`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: accentColor }}
                  />
                  Currently Unavailable
                </span>
              </div>

              {/* Message card */}
              <div
                className="rounded-2xl border p-8 space-y-4"
                style={{ borderColor: `${accentColor}25` }}
              >
                {/* Decorative icon */}
                <div className="flex justify-center">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-xl shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                    }}
                  >
                    <svg
                      className="h-7 w-7 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                </div>

                {deactivatedMsg ? (
                  <p
                    className="text-base whitespace-pre-wrap leading-relaxed"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {deactivatedMsg}
                  </p>
                ) : (
                  <p
                    className="text-base"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    The creator has temporarily closed this form. Please check
                    back later.
                  </p>
                )}
              </div>

              {/* Redirect button */}
              {redirectUrl && (
                <a
                  href={redirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 no-underline"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
                  }}
                >
                  {redirectLabel || "Visit Link"}
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>

            {/* Decorative bottom accent */}
            <div
              className="h-px w-full mt-8"
              style={{ background: `${accentColor}20` }}
            />
          </div>
        </div>
      );
    }

    const form = {
      id: row.id,
      title: row.title,
      description: row.description,
      bannerAssetPath: row.banner_asset_path || "",
      bannerUrl: row.banner_url || "",
      isActive: !!row.is_active,
      deactivatedMessage: row.deactivated_message || "",
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
