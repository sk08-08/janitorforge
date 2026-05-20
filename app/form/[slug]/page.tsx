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
    const { data: formData, error } = await supabase
      .from("request_forms")
      .select("*")
      .eq("shareable_link", String(slug))
      .single();

    if (error || !formData) {
      return (
        <div className="min-h-screen bg-background flex items-start justify-center pt-12">
          <div className="container max-w-2xl py-8">
            <p className="text-center">Form not found.</p>
          </div>
        </div>
      );
    }

    const form = {
      id: formData.id,
      title: formData.title,
      description: formData.description,
      isActive: !!formData.is_active,
      sections: (formData.sections || []) as FormSection[],
      userId: formData.user_id,
    };

    return <PublicForm form={form} />;
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
