"use client";

import { Bot as BotIcon, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProfileCardStyle, ProfileLayout } from "@/lib/profile-theme";
import { getProfileCardClass } from "@/lib/profile-theme";

export interface ProfileBotCardData {
  id: string;
  name: string;
  shortDescription?: string;
  rating?: "SFW" | "NSFW" | string;
  imageUrl?: string | null;
  tags?: string[];
}

interface ProfileBotCardProps {
  bot: ProfileBotCardData;
  onClick?: () => void;
  cardStyle?: ProfileCardStyle;
  layout?: ProfileLayout;
  accentColor?: string;
}

export function ProfileBotGridCard({
  bot,
  onClick,
  cardStyle = "default",
  layout = "grid",
  accentColor,
}: ProfileBotCardProps) {
  const cardClass = getProfileCardClass(cardStyle);
  const cardStyleOverrides =
    accentColor && cardStyle !== "minimal"
      ? ({ borderColor: `${accentColor}4a` } as const)
      : undefined;

  return (
    <div
      className={cn(
        "overflow-hidden cursor-pointer",
        cardClass,
        layout === "list" && "sm:flex sm:items-start sm:gap-3",
      )}
      style={cardStyleOverrides}
      onClick={onClick}
    >
      <div
        className={cn(
          "bg-muted overflow-hidden",
          layout === "list"
            ? "h-28 sm:h-24 sm:w-44 shrink-0 rounded-md"
            : "aspect-video rounded-md",
        )}
      >
        {bot.imageUrl ? (
          <img
            src={bot.imageUrl}
            alt={bot.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <BotIcon className="h-8 w-8 text-primary/70" />
          </div>
        )}
      </div>
      <div
        className={cn("min-w-0", layout === "list" ? "pt-2 sm:pt-0" : "pt-3")}
      >
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium truncate">{bot.name}</p>
          {bot.rating && (
            <Badge
              variant={bot.rating === "SFW" ? "secondary" : "destructive"}
              className="text-[10px] shrink-0"
            >
              {bot.rating}
            </Badge>
          )}
        </div>
        <p
          className={cn(
            "text-xs text-muted-foreground",
            layout === "list" ? "line-clamp-3" : "line-clamp-2",
          )}
        >
          {bot.shortDescription || "No description"}
        </p>
      </div>
    </div>
  );
}

export function ProfileFeaturedBotListCard({
  bot,
  onClick,
  cardStyle = "default",
  accentColor,
}: ProfileBotCardProps) {
  const cardClass = getProfileCardClass(cardStyle);
  const cardStyleOverrides =
    accentColor && cardStyle !== "minimal"
      ? ({ borderColor: `${accentColor}4a` } as const)
      : undefined;

  return (
    <div
      className={cn("flex items-center gap-3 cursor-pointer", cardClass)}
      style={cardStyleOverrides}
      onClick={onClick}
    >
      <div className="h-14 w-20 rounded bg-muted overflow-hidden shrink-0">
        {bot.imageUrl ? (
          <img
            src={bot.imageUrl}
            alt={bot.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-primary/10">
            <Star className="h-5 w-5 text-primary/70" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{bot.name}</p>
          {bot.rating && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              {bot.rating}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {bot.shortDescription || "No description"}
        </p>
      </div>
    </div>
  );
}
