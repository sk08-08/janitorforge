"use client";

import { Badge } from "@/components/ui/badge";
import { CreatorPageView } from "@/features/creator-pages/components/creator-page-view";
import { cn } from "@/lib/utils";

import type {
  BotPreview,
  CreatorBuilderViewport,
  CreatorFormInspectorItem,
  CreatorLorebookInspectorItem,
  CreatorPageConfig,
  PageSection,
  WorldPreview,
} from "@/features/creator-pages/types/creator-page-types";

interface CreatorPageCanvasPreviewProps {
  viewport: CreatorBuilderViewport;
  sections: PageSection[];
  bots: BotPreview[];
  worlds: WorldPreview[];
  lorebooks: CreatorLorebookInspectorItem[];
  forms: CreatorFormInspectorItem[];
  pageConfig: CreatorPageConfig;
  selectedSectionId: string | null;
  onSectionSelect: (sectionId: string) => void;
}

export function CreatorPageCanvasPreview({
  viewport,
  sections,
  bots,
  worlds,
  lorebooks,
  forms,
  pageConfig,
  selectedSectionId,
  onSectionSelect,
}: CreatorPageCanvasPreviewProps) {
  const previewWidthClass =
    viewport === "mobile"
      ? "w-[390px]"
      : viewport === "tablet"
        ? "w-[768px]"
        : "w-full";

  const previewScaleLabel =
    viewport === "mobile"
      ? "390px"
      : viewport === "tablet"
        ? "768px"
        : "Responsive";

  return (
    <section className="min-w-0 bg-muted/20">
      <div className="sticky top-[69px] z-50 flex items-center justify-between border-b border-border/60 bg-background px-4 py-2">
        <div>
          <p className="text-xs font-medium">Live canvas</p>
          <p className="text-[10px] text-muted-foreground">
            Click a block to edit · Unsaved changes · {previewScaleLabel}
          </p>
        </div>

        <Badge variant="outline" className="rounded-full text-[10px]">
          V3 Builder
        </Badge>
      </div>

      <div className="relative z-0 flex min-h-[70vh] justify-center overflow-auto p-3 sm:p-5 lg:p-7">
        <div
          className={cn(
            "relative z-0 min-h-[72vh] shrink-0 overflow-hidden rounded-[1.4rem] border border-border/70 bg-background shadow-lg shadow-black/[0.05]",
            previewWidthClass,
          )}
        >
          <CreatorPageView
            sections={sections}
            bots={bots}
            worlds={worlds}
            lorebooks={lorebooks}
            pageConfig={pageConfig}
            formStates={Object.fromEntries(
              forms.map((form) => [
                form.id,
                {
                  id: form.id,
                  shareable_link: form.shareable_link,
                  is_active: form.is_active,
                  deactivated_message: form.deactivated_message,
                  deactivated_redirect_url: form.deactivated_redirect_url,
                  deactivated_redirect_label: form.deactivated_redirect_label,
                  deactivated_accent_color: form.deactivated_accent_color,
                },
              ]),
            )}
            isBuilderPreview
            selectedSectionId={selectedSectionId}
            onSectionSelect={onSectionSelect}
          />
        </div>
      </div>
    </section>
  );
}
