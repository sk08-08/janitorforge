// ============================================================================
// JanitorForge - Creator Page View
// Public view of a customizable creator page at /page/[slug]
// Refactored to use shared components, ~75% smaller than the original
// ============================================================================

"use client";

import { Bot } from "lucide-react";
import { useState } from "react";
import { BotDetailModal } from "@/components/bots/bot-detail-modal";
import { CreatorHeader } from "./shared/creator-header";
import { SectionRenderer } from "./shared/section-renderer";
import type {
  CreatorInfo,
  CreatorPageData,
  CreatorPageSection,
  BotPreview,
  WorldPreview,
  CreatorPageConfig,
  CreatorPageViewProps,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Helper: resolve section bots/worlds from IDs
// ---------------------------------------------------------------------------

function sectionBots(section: CreatorPageSection, allBots: BotPreview[]): BotPreview[] {
  const botIds = (section.config?.selectedBotIds as string[])
    || (section.config?.botIds as string[])
    || [];
  if (botIds.length === 0 && (section.kind === "bot_showcase" || section.kind === "bot_group")) {
    return allBots;
  }
  return allBots.filter((b) => botIds.includes(b.id));
}

function sectionWorlds(section: CreatorPageSection, allWorlds: WorldPreview[]): WorldPreview[] {
  const worldIds = (section.config?.selectedWorldIds as string[])
    || (section.config?.worldIds as string[])
    || [];
  if (worldIds.length === 0 && section.kind === "world_showcase") {
    return allWorlds;
  }
  return allWorlds.filter((w) => worldIds.includes(w.id));
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CreatorPageView({
  creator,
  page,
  sections,
  bots,
  worlds,
  allPages = [],
  pageConfig = {},
}: CreatorPageViewProps) {
  const [botDetailBot, setBotDetailBot] = useState<any>(null);

  const themeColor = pageConfig.accentColor || "#7c3aed";
  const bgStyle = pageConfig.bgStyle || "default";
  const fontStyle = pageConfig.fontStyle || "default";

  const bgClass =
    bgStyle === "dark" ? "bg-zinc-950 text-zinc-100"
    : bgStyle === "ambient" ? "bg-gradient-to-b from-background via-background to-primary/5"
    : bgStyle === "minimal" ? "bg-white dark:bg-zinc-900"
    : "bg-background";

  const fontClass =
    fontStyle === "serif" ? "font-serif"
    : fontStyle === "mono" ? "font-mono"
    : fontStyle === "display" ? "font-display"
    : "";

  // Filter out disabled hero sections
  const filteredSections = sections.filter((s) => {
    if (s.kind === "hero" && s.config?.heroDisabled) return false;
    return true;
  });

  return (
    <div className={`min-h-screen ${bgClass} ${fontClass}`}>
      {/* Top Banner gradient */}
      <div
        className="h-40 sm:h-56 w-full"
        style={{
          background: `linear-gradient(135deg, ${themeColor}33, ${themeColor}11, transparent)`,
        }}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 -mt-16 sm:-mt-20 pb-20">
        {/* Shared Creator Header */}
        <CreatorHeader
          creator={creator}
          page={page}
          allPages={allPages}
          pageConfig={pageConfig}
          botCount={bots.length}
        />

        {/* Rendered Sections */}
        <div className="space-y-10">
          {filteredSections
            .sort((a, b) => a.position - b.position)
            .map((section) => (
              <SectionRenderer
                key={section.id}
                section={section}
                bots={sectionBots(section, bots)}
                worlds={sectionWorlds(section, worlds)}
                layout={page.layout}
                themeColor={themeColor}
                onBotClick={(bot) =>
                  setBotDetailBot({
                    ...bot,
                    shortDescription: bot.short_description,
                    imageUrl: bot.image_url,
                  })
                }
              />
            ))}

          {filteredSections.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/70 p-10 text-center">
              <Bot className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                This creator page has no sections yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bot Detail Modal */}
      <BotDetailModal
        open={!!botDetailBot}
        onOpenChange={(open) => {
          if (!open) setBotDetailBot(null);
        }}
        bot={botDetailBot}
      />
    </div>
  );
}