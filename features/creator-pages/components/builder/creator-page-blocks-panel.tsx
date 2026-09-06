"use client";

import type { DragEvent } from "react";
import {
  Blocks,
  Copy,
  ExternalLink,
  Globe,
  Image,
  Layout,
  LayoutGrid,
  Layers,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  GripVertical,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getSectionDisplayTitle,
  sectionKindLabels,
} from "@/features/creator-pages/lib/creator-page-block-registry";

import {
  type CreatorBuilderPanel,
  type CreatorPageCanvasWidth,
  type CreatorPagePadding,
  type CreatorPageSectionGap,
  type PageSection,
  type SectionKind,
} from "@/features/creator-pages/types/creator-page-types";

const sectionKindIcons: Record<SectionKind, typeof Layout> = {
  hero: Sparkles,
  bot_showcase: LayoutGrid,
  world_showcase: Globe,
  text_block: Type,
  lorebook_gallery: Layers,
  banner: Image,
  bot_group: LayoutGrid,
  form: MessageCircle,
  sticker: Image,
  divider: Minus,
  social_links: Share2,
  spacer: Layout,
  gallery: LayoutGrid,
  embed: ExternalLink,
};

interface CreatorPageBlocksPanelProps {
  panel: CreatorBuilderPanel;
  sections: PageSection[];
  selectedSectionId: string | null;
  canvasWidth: CreatorPageCanvasWidth;
  sectionGap: CreatorPageSectionGap;
  pagePadding: CreatorPagePadding;
  onPanelChange: (panel: CreatorBuilderPanel) => void;
  onCanvasWidthChange: (value: CreatorPageCanvasWidth) => void;
  onSectionGapChange: (value: CreatorPageSectionGap) => void;
  onPagePaddingChange: (value: CreatorPagePadding) => void;
  onAddBlock: () => void;
  onSelectSection: (section: PageSection) => void;
  onDuplicateSection: (section: PageSection) => void;
  onDeleteSection: (sectionId: string) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, index: number) => void;
}

export function CreatorPageBlocksPanel({
  panel,
  sections,
  selectedSectionId,
  canvasWidth,
  sectionGap,
  pagePadding,
  onPanelChange,
  onCanvasWidthChange,
  onSectionGapChange,
  onPagePaddingChange,
  onAddBlock,
  onSelectSection,
  onDuplicateSection,
  onDeleteSection,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: CreatorPageBlocksPanelProps) {
  return (
    <aside className="border-b border-border/70 bg-muted/[0.08] xl:border-b-0 xl:border-r">
      <div className="sticky top-[73px] max-h-[calc(100vh-73px)] overflow-y-auto p-3 sm:p-4">
        <div className="mb-4 grid grid-cols-2 rounded-xl bg-muted/50 p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "cursor-pointer rounded-lg text-xs",
              panel === "blocks" && "bg-background shadow-sm",
            )}
            onClick={() => onPanelChange("blocks")}
          >
            <Blocks className="mr-1.5 h-3.5 w-3.5" />
            Blocks
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "cursor-pointer rounded-lg text-xs",
              panel === "page" && "bg-background shadow-sm",
            )}
            onClick={() => onPanelChange("page")}
          >
            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
            Page
          </Button>
        </div>

        {panel === "blocks" ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Page blocks</p>
                <p className="text-[11px] text-muted-foreground">
                  Drag to reorder. Click to edit.
                </p>
              </div>

              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8 shrink-0 cursor-pointer rounded-full"
                onClick={onAddBlock}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {sections.length > 0 ? (
              <div className="space-y-2">
                {sections.map((section, index) => {
                  const Icon = sectionKindIcons[section.kind] || Layout;

                  return (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={(event) => onDragStart(event, index)}
                      onDragEnd={onDragEnd}
                      onDragOver={(event) => onDragOver(event, index)}
                      onDragLeave={onDragLeave}
                      onDrop={(event) => onDrop(event, index)}
                      className={cn(
                        "group flex cursor-pointer items-center gap-2 rounded-xl border bg-background/70 p-2.5 transition-all hover:bg-background",
                        selectedSectionId === section.id
                          ? "border-primary/50 bg-primary/[0.045] shadow-sm shadow-primary/5"
                          : "border-border/60 hover:border-primary/35",
                      )}
                      onClick={() => onSelectSection(section)}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {getSectionDisplayTitle(section)}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {sectionKindLabels[section.kind]}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 cursor-pointer opacity-70 group-hover:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDuplicateSection(section);
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 cursor-pointer text-destructive opacity-70 hover:text-destructive group-hover:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteSection(section.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={onAddBlock}
                className="flex w-full cursor-pointer flex-col items-center rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.025]"
              >
                <Plus className="mb-2 h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Add your first block</span>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  Start with a Hero, text, bots, gallery, or anything else.
                </span>
              </button>
            )}

            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full cursor-pointer rounded-xl"
              onClick={onAddBlock}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add block
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">Canvas</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Global controls for the page canvas.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Canvas width</Label>
              <Select value={canvasWidth} onValueChange={onCanvasWidthChange}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">Narrow</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="wide">Wide</SelectItem>
                  <SelectItem value="full">Full width</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Section spacing</Label>
              <Select value={sectionGap} onValueChange={onSectionGapChange}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="relaxed">Relaxed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Page padding</Label>
              <Select value={pagePadding} onValueChange={onPagePaddingChange}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="spacious">Spacious</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
