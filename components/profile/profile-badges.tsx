// ============================================================================
// JanitorForge - Shared Profile Badges Section
// Normalized badge renderer with empty state and badge icon support
// ============================================================================

"use client";

import { useState } from "react";
import {
  Award,
  Badge,
  BadgeCheck,
  Crown,
  Gem,
  Shield,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ProfileBadge = {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  awardedAt?: string;
  note?: string;
  metadata?: Record<string, unknown>;
};

interface ProfileBadgesProps {
  badges: ProfileBadge[];
  themeColor: string;
  showBadges?: boolean;
  className?: string;
  titleClassName?: string;
  listClassName?: string;
  badgeClassName?: string;
  emptyClassName?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

const badgeIconMap: Record<string, React.ElementType> = {
  Award,
  BadgeCheck,
  Crown,
  Gem,
  Shield,
  Sparkles,
  Star,
  Trophy,
};

function getBadgeIcon(iconName?: string) {
  if (!iconName) return Award;
  return badgeIconMap[iconName] || Award;
}

function formatAwardedAt(dateValue?: string) {
  if (!dateValue) return "Award date unavailable";

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return "Award date unavailable";

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function BadgeDetailsPanel({
  badge,
  accentColor,
}: {
  badge: ProfileBadge;
  accentColor: string;
}) {
  const Icon = getBadgeIcon(badge.icon);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
          style={{
            borderColor: accentColor,
            backgroundColor: `${accentColor}14`,
          }}
        >
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="font-semibold leading-tight">{badge.label}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Awarded on {formatAwardedAt(badge.awardedAt)}
          </p>
        </div>
      </div>

      {badge.note && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {badge.note}
        </p>
      )}

      {badge.metadata && Object.keys(badge.metadata).length > 0 && (
        <div className="rounded-lg border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
          {Object.entries(badge.metadata)
            .slice(0, 2)
            .map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3"
              >
                <span className="font-medium uppercase tracking-wide">
                  {key}
                </span>
                <span className="truncate text-right">{String(value)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function BadgePill({
  badge,
  themeColor,
  className,
}: {
  badge: ProfileBadge;
  themeColor: string;
  className?: string;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const Icon = getBadgeIcon(badge.icon);
  const accentColor = badge.color || themeColor;
  const triggerClassName = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    className,
  );
  const triggerLabel = `${badge.label}. Awarded on ${formatAwardedAt(badge.awardedAt)}`;

  const pill = (
    <span className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" style={{ color: accentColor }} />
      <span className="text-xs font-medium leading-none">{badge.label}</span>
    </span>
  );

  if (isMobile) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={triggerClassName}
            style={{ borderColor: accentColor }}
            aria-label={triggerLabel}
          >
            {pill}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={10}
          className="w-80 rounded-2xl border border-border/70 bg-popover p-4 shadow-xl"
        >
          <BadgeDetailsPanel badge={badge} accentColor={accentColor} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={triggerClassName}
          style={{ borderColor: accentColor }}
          aria-label={triggerLabel}
        >
          {pill}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={10}
        className="w-80 rounded-2xl border border-border/70 bg-popover p-4 text-popover-foreground shadow-xl"
      >
        <BadgeDetailsPanel badge={badge} accentColor={accentColor} />
      </TooltipContent>
    </Tooltip>
  );
}

export function ProfileBadgesSection({
  badges,
  themeColor,
  showBadges = true,
  className,
  titleClassName,
  listClassName,
  badgeClassName,
  emptyClassName,
  emptyTitle = "No badges yet",
  emptyDescription = "Badges will appear here once they are awarded.",
}: ProfileBadgesProps) {
  if (!showBadges) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-4">
        <Award className="h-5 w-5" style={{ color: themeColor }} />
        <h2 className="text-lg font-semibold">Badges</h2>
      </div>

      {badges.length > 0 ? (
        <div className={listClassName || "flex flex-wrap gap-2 mt-2"}>
          {badges.map((badge) => (
            <BadgePill
              key={badge.id}
              badge={badge}
              themeColor={themeColor}
              className={badgeClassName}
            />
          ))}
        </div>
      ) : (
        <Empty
          className={
            emptyClassName ||
            "rounded-lg border border-dashed bg-card/40 px-5 py-7"
          }
        >
          <EmptyContent>
            <EmptyMedia variant="icon">
              <Award
                className="h-5 w-5"
                style={{
                  color: themeColor,
                }}
              />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
