"use client";

import { Bot as BotIcon, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
}

export function ProfileBotGridCard({ bot, onClick }: ProfileBotCardProps) {
  return (
    <div
      className="rounded-lg border overflow-hidden transition-all hover:border-primary/30 hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-video bg-muted overflow-hidden">
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
      <div className="p-3">
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
        <p className="text-xs text-muted-foreground line-clamp-2">
          {bot.shortDescription || "No description"}
        </p>
      </div>
    </div>
  );
}

export function ProfileFeaturedBotListCard({
  bot,
  onClick,
}: ProfileBotCardProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/30 cursor-pointer"
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
