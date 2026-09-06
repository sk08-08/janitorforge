"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BannerInspector } from "@/features/creator-pages/components/inspectors/banner-inspector";
import { BotInspector } from "@/features/creator-pages/components/inspectors/bot-inspector";
import {
  DividerInspector,
  SpacerInspector,
} from "@/features/creator-pages/components/inspectors/divider-spacer-inspector";
import { EmbedInspector } from "@/features/creator-pages/components/inspectors/embed-inspector";
import { FormInspector } from "@/features/creator-pages/components/inspectors/form-inspector";
import { GalleryInspector } from "@/features/creator-pages/components/inspectors/gallery-inspector";
import { HeroInspector } from "@/features/creator-pages/components/inspectors/hero-inspector";
import { ImageInspector } from "@/features/creator-pages/components/inspectors/image-inspector";
import { LorebookInspector } from "@/features/creator-pages/components/inspectors/lorebook-inspector";
import { SocialLinksInspector } from "@/features/creator-pages/components/inspectors/social-links-inspector";
import { TextInspector } from "@/features/creator-pages/components/inspectors/text-inspector";
import { WorldInspector } from "@/features/creator-pages/components/inspectors/world-inspector";
import { sectionKindLabels } from "@/features/creator-pages/lib/creator-page-block-registry";
import {
  getCreatorSectionAnchor,
  normalizeCreatorSectionAnchor,
} from "@/features/creator-pages/lib/creator-page-links";

import {
  type CreatorBotInspectorItem,
  type CreatorFormInspectorItem,
  type CreatorGalleryImageItem,
  type CreatorInspectorAnchorOption,
  type CreatorInspectorTab,
  type CreatorLorebookInspectorItem,
  type CreatorSocialLinkItem,
  type CreatorWorldInspectorItem,
  type PageSection,
} from "@/features/creator-pages/types/creator-page-types";

interface CreatorPageBlockInspectorProps {
  section: PageSection | null;
  title: string;
  config: Record<string, string>;
  tab: CreatorInspectorTab;
  anchorOptions: CreatorInspectorAnchorOption[];
  availableBots: CreatorBotInspectorItem[];
  availableWorlds: CreatorWorldInspectorItem[];
  availableLorebooks: CreatorLorebookInspectorItem[];
  availableForms: CreatorFormInspectorItem[];
  editingFormId: string;
  editingLinks: CreatorSocialLinkItem[];
  editingImages: CreatorGalleryImageItem[];
  editingSelectedBotIds: string[];
  editingSelectedWorldIds: string[];
  editingSelectedLorebookIds: string[];
  setTitle: (value: string) => void;
  setConfig: Dispatch<SetStateAction<Record<string, string>>>;
  setTab: Dispatch<SetStateAction<CreatorInspectorTab>>;
  setEditingFormId: Dispatch<SetStateAction<string>>;
  setEditingLinks: Dispatch<SetStateAction<CreatorSocialLinkItem[]>>;
  setEditingImages: Dispatch<SetStateAction<CreatorGalleryImageItem[]>>;
  setEditingSelectedBotIds: Dispatch<SetStateAction<string[]>>;
  setEditingSelectedWorldIds: Dispatch<SetStateAction<string[]>>;
  setEditingSelectedLorebookIds: Dispatch<SetStateAction<string[]>>;
  onDone: () => void;
  onSave: () => void;
  pageInspector: ReactNode;
}

export function CreatorPageBlockInspector({
  section,
  title,
  config,
  tab,
  anchorOptions,
  availableBots,
  availableWorlds,
  availableLorebooks,
  availableForms,
  editingFormId,
  editingLinks,
  editingImages,
  editingSelectedBotIds,
  editingSelectedWorldIds,
  editingSelectedLorebookIds,
  setTitle,
  setConfig,
  setTab,
  setEditingFormId,
  setEditingLinks,
  setEditingImages,
  setEditingSelectedBotIds,
  setEditingSelectedWorldIds,
  setEditingSelectedLorebookIds,
  onDone,
  onSave,
  pageInspector,
}: CreatorPageBlockInspectorProps) {
  return (
    <aside className="border-t border-border/70 bg-background xl:border-l xl:border-t-0">
      <div className="sticky top-[73px] max-h-[calc(100vh-73px)] overflow-y-auto p-4">
        {section ? (
          <>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Block inspector</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {sectionKindLabels[section.kind]}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 cursor-pointer rounded-full px-3 text-xs"
                onClick={onDone}
              >
                Done
              </Button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs">Block title</Label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Section anchor</Label>
                  <span className="text-[10px] text-muted-foreground">
                    Link with #
                  </span>
                </div>

                <div className="flex min-w-0 items-center">
                  <span className="flex h-9 shrink-0 items-center rounded-l-md border border-r-0 bg-muted px-3 text-xs font-semibold text-muted-foreground">
                    #
                  </span>

                  <Input
                    value={config.anchorId || ""}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        anchorId: normalizeCreatorSectionAnchor(
                          event.target.value,
                        ),
                      }))
                    }
                    className="h-9 min-w-0 rounded-l-none font-mono text-xs"
                    placeholder={getCreatorSectionAnchor(section)}
                  />
                </div>

                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Use this anchor to link directly to this block. CTA fields can
                  select blocks automatically.
                </p>
              </div>

              {section.kind === "hero" && (
                <HeroInspector
                  blockInspectorTab={tab}
                  setBlockInspectorTab={setTab}
                  sectionConfigEdit={config}
                  setSectionConfigEdit={setConfig}
                  anchorOptions={anchorOptions}
                />
              )}

              {section.kind === "text_block" && (
                <TextInspector
                  blockInspectorTab={tab}
                  setBlockInspectorTab={setTab}
                  sectionConfigEdit={config}
                  setSectionConfigEdit={setConfig}
                />
              )}

              {(section.kind === "bot_showcase" ||
                section.kind === "bot_group") && (
                <BotInspector
                  blockInspectorTab={tab}
                  setBlockInspectorTab={setTab}
                  sectionConfigEdit={config}
                  setSectionConfigEdit={setConfig}
                  availableBots={availableBots}
                  editingSelectedBotIds={editingSelectedBotIds}
                  setEditingSelectedBotIds={setEditingSelectedBotIds}
                />
              )}

              {section.kind === "lorebook_gallery" && (
                <LorebookInspector
                  blockInspectorTab={tab}
                  setBlockInspectorTab={setTab}
                  sectionConfigEdit={config}
                  setSectionConfigEdit={setConfig}
                  availableLorebooks={availableLorebooks}
                  availableWorlds={availableWorlds}
                  editingSelectedLorebookIds={editingSelectedLorebookIds}
                  setEditingSelectedLorebookIds={setEditingSelectedLorebookIds}
                />
              )}

              {section.kind === "embed" && (
                <EmbedInspector
                  blockInspectorTab={tab}
                  setBlockInspectorTab={setTab}
                  sectionConfigEdit={config}
                  setSectionConfigEdit={setConfig}
                />
              )}

              {section.kind === "form" && (
                <FormInspector
                  blockInspectorTab={tab}
                  setBlockInspectorTab={setTab}
                  sectionConfigEdit={config}
                  setSectionConfigEdit={setConfig}
                  availableForms={availableForms}
                  editingFormId={editingFormId}
                  setEditingFormId={setEditingFormId}
                />
              )}

              {section.kind === "social_links" && (
                <SocialLinksInspector
                  blockInspectorTab={tab}
                  setBlockInspectorTab={setTab}
                  sectionConfigEdit={config}
                  setSectionConfigEdit={setConfig}
                  editingLinks={editingLinks}
                  setEditingLinks={setEditingLinks}
                />
              )}

              {section.kind === "gallery" && (
                <GalleryInspector
                  blockInspectorTab={tab}
                  setBlockInspectorTab={setTab}
                  sectionConfigEdit={config}
                  setSectionConfigEdit={setConfig}
                  editingImages={editingImages}
                  setEditingImages={setEditingImages}
                />
              )}

              {section.kind === "sticker" && (
                <ImageInspector
                  blockInspectorTab={tab}
                  setBlockInspectorTab={setTab}
                  sectionConfigEdit={config}
                  setSectionConfigEdit={setConfig}
                />
              )}

              {section.kind === "world_showcase" && (
                <WorldInspector
                  blockInspectorTab={tab}
                  setBlockInspectorTab={setTab}
                  sectionConfigEdit={config}
                  setSectionConfigEdit={setConfig}
                  availableWorlds={availableWorlds}
                  editingSelectedWorldIds={editingSelectedWorldIds}
                  setEditingSelectedWorldIds={setEditingSelectedWorldIds}
                />
              )}

              {section.kind === "banner" && (
                <BannerInspector
                  blockInspectorTab={tab}
                  setBlockInspectorTab={setTab}
                  sectionConfigEdit={config}
                  setSectionConfigEdit={setConfig}
                  anchorOptions={anchorOptions}
                />
              )}

              {section.kind === "divider" && (
                <DividerInspector
                  blockInspectorTab={tab}
                  setBlockInspectorTab={setTab}
                  sectionConfigEdit={config}
                  setSectionConfigEdit={setConfig}
                />
              )}

              {section.kind === "spacer" && (
                <SpacerInspector
                  sectionConfigEdit={config}
                  setSectionConfigEdit={setConfig}
                />
              )}

              <div className="sticky -bottom-4 -mx-4 mt-5 border-t border-border/70 bg-background/95 px-4 pb-1 pt-4 backdrop-blur">
                <Button
                  type="button"
                  className="w-full cursor-pointer rounded-xl"
                  onClick={onSave}
                >
                  <Save className="mr-2 h-3.5 w-3.5" />
                  Save block
                </Button>

                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  Inspector changes preview instantly. Save persists them.
                </p>
              </div>
            </div>
          </>
        ) : (
          pageInspector
        )}
      </div>
    </aside>
  );
}
