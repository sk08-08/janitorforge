// ============================================================================
// JanitorForge - Creator Header Component
// Shared header for creator page views with avatar, name, badges, nav
// ============================================================================

"use client";

import { Bot, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type {
  CreatorInfo,
  CreatorPageData,
  CreatorPageConfig,
} from "@/features/creator-pages/types/creator-page-types";

interface CreatorHeaderProps {
  creator: CreatorInfo;
  page: CreatorPageData;
  allPages?: CreatorPageData[];
  pageConfig?: CreatorPageConfig;
  botCount: number;
  /** Extra actions slot (e.g., follow button for profiles) */
  actions?: React.ReactNode;
}

export function CreatorHeader({
  creator,
  page,
  allPages = [],
  pageConfig = {},
  botCount,
  actions,
}: CreatorHeaderProps) {
  const creatorName = creator.display_name || creator.username || "Creator";
  const themeColor = pageConfig.accentColor || "#7c3aed";
  const headerStyle = pageConfig.headerStyle || "split";
  const avatarSize = pageConfig.avatarSize || "large";
  const showBackButton = pageConfig.showBackButton !== "false";
  const showBadges = pageConfig.showBadges !== "false";

  const avatarClass =
    avatarSize === "small"
      ? "h-20 w-20"
      : avatarSize === "medium"
        ? "h-24 w-24 sm:h-28 sm:w-28"
        : "h-24 w-24 sm:h-32 sm:w-32";

  const isCentered = headerStyle === "centered" || headerStyle === "minimal";

  return (
    <div
      className={`flex ${isCentered ? "flex-col items-center text-center" : "flex-col sm:flex-row items-start"} gap-4 sm:gap-6 mb-10`}
    >
      {/* Avatar */}
      <div
        className={`${avatarClass} shrink-0 flex items-center justify-center rounded-2xl bg-card shadow-2xl overflow-hidden`}
        style={{
          borderWidth: "4px",
          borderStyle: "solid",
          borderColor: themeColor,
        }}
      >
        {creator.avatar_url ? (
          <img
            src={creator.avatar_url}
            alt={creatorName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-3xl font-bold" style={{ color: themeColor }}>
            {creatorName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div
        className={`flex-1 min-w-0 pt-2 ${isCentered ? "flex flex-col items-center" : ""}`}
      >
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {creatorName}
        </h1>
        {creator.username && (
          <p className="text-sm mt-0.5" style={{ color: `${themeColor}aa` }}>
            @{creator.username}
          </p>
        )}

        {showBadges && (
          <div
            className={`flex flex-wrap items-center gap-2 mt-3 ${isCentered ? "justify-center" : ""}`}
          >
            <Badge
              variant="secondary"
              className="text-xs"
              style={{
                background: `${themeColor}15`,
                color: themeColor,
                border: `1px solid ${themeColor}33`,
              }}
            >
              <Bot className="h-3 w-3 mr-1" /> {botCount} bots
            </Badge>
          </div>
        )}

        {/* Page navigation */}
        {allPages.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {allPages.map((p) => (
              <Link key={p.id} href={`/page/${p.slug}`}>
                <Badge
                  variant={p.id === page.id ? "default" : "outline"}
                  className="text-xs cursor-pointer"
                  style={
                    p.id === page.id
                      ? { background: themeColor }
                      : { borderColor: `${themeColor}44`, color: themeColor }
                  }
                >
                  {p.title || "Untitled"}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        {showBackButton && (
          <Link href={creator.username ? `/profile/${creator.username}` : "/"}>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              style={{ borderColor: `${themeColor}44`, color: themeColor }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {creator.username ? `@${creator.username}` : "Back"}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
