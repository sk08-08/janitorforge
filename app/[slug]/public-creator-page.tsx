"use client";

import {
  Globe,
  Bot,
  ExternalLink,
  Calendar,
  Tag,
  Layout,
  Layers,
  ArrowLeft,
  Sparkles,
  Star,
  MessageCircle,
  Clock,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  tagline: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  slug: string | null;
  theme: Record<string, unknown> | null;
  created_at: string;
}

interface CreatorPageData {
  id: string;
  slug: string;
  title: string;
  description: string;
  layout: string;
  is_published: boolean;
}

interface PageSection {
  id: string;
  page_id: string;
  kind: string;
  title: string;
  config: Record<string, unknown>;
  position: number;
  formId?: string; // for form sections
}

interface BotPreview {
  id: string;
  name: string;
  short_description: string;
  tags: string[];
  rating: string;
  image_url: string | null;
  created_at: string;
}

interface WorldPreview {
  id: string;
  title: string;
  slug: string;
  kind: string;
  status: string;
  description: string;
  bot_ids: string[];
}

interface PublicCreatorPageProps {
  profile: Profile | null;
  creatorPages: CreatorPageData[];
  bots: BotPreview[];
  activePage: CreatorPageData | null;
  sections: PageSection[];
  worlds?: WorldPreview[];
  pageLayout?: string;
  pageConfig?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Bot Card — Premium style with large image
// ---------------------------------------------------------------------------

function BotCardGrid({
  bot,
  themeColor,
}: {
  bot: BotPreview;
  themeColor?: string;
}) {
  return (
    <Card
      className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      style={
        themeColor
          ? {
              borderColor: `${themeColor}44`,
              boxShadow: `0 4px 6px -1px ${themeColor}11, 0 2px 4px -2px ${themeColor}08`,
            }
          : undefined
      }
    >
      {/* Large cover image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {bot.image_url ? (
          <img
            src={bot.image_url}
            alt={bot.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <Bot className="h-16 w-16 text-primary/30" />
          </div>
        )}
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
        {/* Rating badge overlay */}
        <Badge
          variant={bot.rating === "SFW" ? "secondary" : "destructive"}
          className="absolute top-3 right-3 backdrop-blur-sm shadow-sm"
        >
          {bot.rating}
        </Badge>
      </div>
      {/* Content below image — no separate icon row */}
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg font-bold leading-tight">
          {bot.name}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-sm mt-1">
          {bot.short_description || "No description provided"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex flex-wrap gap-1.5">
          {bot.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[11px]">
              {tag}
            </Badge>
          ))}
          {bot.tags.length > 4 && (
            <Badge variant="outline" className="text-[11px]">
              +{bot.tags.length - 4}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BotCardList({ bot }: { bot: BotPreview }) {
  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4">
        {/* Image or icon */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
          {bot.image_url ? (
            <img
              src={bot.image_url}
              alt={bot.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Bot className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{bot.name}</h3>
            <Badge
              variant={bot.rating === "SFW" ? "secondary" : "destructive"}
              className="shrink-0 text-[10px]"
            >
              {bot.rating}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground truncate">
            {bot.short_description || "No description"}
          </p>
        </div>
        <div className="hidden sm:flex flex-wrap gap-1 max-w-[200px]">
          {bot.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] shrink-0">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section Renderer — respects layout prop
// ---------------------------------------------------------------------------

function SectionRenderer({
  section,
  bots,
  worlds,
  layout,
  themeColor,
}: {
  section: PageSection;
  bots: BotPreview[];
  worlds: WorldPreview[];
  layout?: string;
  themeColor: string;
}) {
  const description = (section.config as any)?.description || "";

  switch (section.kind) {
    case "bot_showcase":
    case "bot_group": {
      const columns = Number((section.config as any)?.columns) || 3;

      // Layout-aware grid class
      const getGridClass = () => {
        if (layout === "list") return "space-y-3";
        if (layout === "showcase")
          return "grid gap-6 grid-cols-1 sm:grid-cols-2";
        if (layout === "timeline")
          return "space-y-6 border-l-2 border-border/70 pl-6 ml-4";
        if (layout === "grid") {
          if (columns === 2) return "grid gap-4 grid-cols-1 sm:grid-cols-2";
          if (columns === 4)
            return "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
          return "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
        }
        return "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
      };

      const renderBot = (bot: BotPreview) => {
        if (layout === "list") return <BotCardList key={bot.id} bot={bot} />;
        return <BotCardGrid key={bot.id} bot={bot} themeColor={themeColor} />;
      };

      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" style={{ color: themeColor }} />
            {section.title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {bots.length > 0 ? (
            <div className={getGridClass()}>{bots.map(renderBot)}</div>
          ) : (
            <p className="text-sm text-muted-foreground">No bots to display.</p>
          )}
        </div>
      );
    }

    case "world_showcase":
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" style={{ color: themeColor }} />
            {section.title}
          </h2>
          {worlds.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {worlds.map((world) => (
                <Card
                  key={world.id}
                  className="transition-all group"
                  style={{
                    borderColor: `${themeColor}33`,
                    boxShadow: `0 1px 3px ${themeColor}08`,
                    transition: "all 200ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${themeColor}77`;
                    e.currentTarget.style.boxShadow = `0 4px 12px ${themeColor}22`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${themeColor}33`;
                    e.currentTarget.style.boxShadow = `0 1px 3px ${themeColor}08`;
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-[10px] capitalize"
                      >
                        {world.kind}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {world.bot_ids.length} bots
                      </Badge>
                    </div>
                    <CardTitle className="text-base">{world.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {world.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No worlds to display.
            </p>
          )}
        </div>
      );

    case "text_block": {
      const body = (section.config as any)?.body || "";
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Layout className="h-5 w-5" style={{ color: themeColor }} />
            {section.title}
          </h2>
          <Card className="border-border/70">
            <CardContent className="p-6">
              {body ? (
                <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {body}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No content configured yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    case "lorebook_gallery":
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5" style={{ color: themeColor }} />
            {section.title}
          </h2>
          <Card className="border-border/70">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Lorebook gallery coming soon.
            </CardContent>
          </Card>
        </div>
      );

    case "form": {
      const shareableLink = (section.config as any)?.shareableLink || "";
      const formId = (section.config as any)?.formId || "";
      const formDesc = (section.config as any)?.description || "";
      return (
        <div className="space-y-3">
          <Card
            className="border-border/70 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${themeColor}18, ${themeColor}08, transparent)`,
              borderColor: `${themeColor}44`,
            }}
          >
            <CardContent className="p-0">
              <div className="px-8 py-10 text-center">
                <div
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl"
                  style={{ background: `${themeColor}22` }}
                >
                  <MessageCircle
                    className="h-7 w-7"
                    style={{ color: themeColor }}
                  />
                </div>
                <h3
                  className="text-xl font-extrabold"
                  style={{ color: themeColor }}
                >
                  {section.title}
                </h3>
                {formDesc && (
                  <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                    {formDesc}
                  </p>
                )}
                <div className="flex justify-center mt-5">
                  {shareableLink ? (
                    <Link href={`/form/${shareableLink}`}>
                      <Button
                        className="text-white font-semibold cursor-pointer shadow-lg transition-shadow"
                        style={{
                          background: themeColor,
                          boxShadow: `0 10px 15px -3px ${themeColor}33, 0 4px 6px -4px ${themeColor}22`,
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Form
                      </Button>
                    </Link>
                  ) : formId ? (
                    <p className="text-sm text-muted-foreground">
                      Form linked (ID: {formId.slice(0, 8)}...)
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No form linked yet.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    case "sticker": {
      const imgSrc = (section.config as any)?.imageUrl || "";
      const imgAlt = (section.config as any)?.alt || section.title;
      const imgSize = (section.config as any)?.size || "medium";
      const imgRounded = (section.config as any)?.rounded || "md";
      const positionMode = (section.config as any)?.positionMode || "static";
      const posX = (section.config as any)?.posX || "0px";
      const posY = (section.config as any)?.posY || "0px";
      const rotation = (section.config as any)?.rotation || "0";
      const stickerOpacity = (section.config as any)?.opacity || "100";
      const zIndex = (section.config as any)?.zIndex || "10";

      const sizeMap: Record<string, string> = {
        small: "w-32",
        medium: "w-64",
        large: "w-96",
        full: "w-full",
      };
      const radiusMap: Record<string, string> = {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-lg",
        lg: "rounded-2xl",
        full: "rounded-full",
      };

      if (!imgSrc) {
        return (
          <div
            className={
              positionMode === "absolute"
                ? "relative h-0"
                : "w-64 mx-auto flex items-center justify-center rounded-xl border-2 border-dashed p-6 text-xs text-muted-foreground"
            }
            style={
              positionMode === "absolute"
                ? {
                    position: "absolute",
                    left: posX,
                    top: posY,
                    transform: `rotate(${rotation}deg)`,
                    opacity: Number(stickerOpacity) / 100,
                    zIndex: Number(zIndex),
                  }
                : undefined
            }
          >
            {positionMode !== "absolute" && "No image set"}
          </div>
        );
      }

      const imgEl = (
        <img
          src={imgSrc}
          alt={imgAlt}
          className={`${sizeMap[imgSize]} ${radiusMap[imgRounded]} shadow-md transition-shadow hover:shadow-lg pointer-events-none select-none max-w-full h-auto`}
        />
      );

      if (positionMode === "absolute") {
        return (
          <div
            style={{
              position: "absolute",
              left: posX,
              top: posY,
              transform: `rotate(${rotation}deg)`,
              opacity: Number(stickerOpacity) / 100,
              zIndex: Number(zIndex),
            }}
          >
            {imgEl}
          </div>
        );
      }

      const alignMap: Record<string, string> = {
        left: "mr-auto",
        center: "mx-auto",
        right: "ml-auto",
      };
      return (
        <div className="space-y-2">
          <div
            className={
              alignMap[(section.config as any)?.alignment || "center"] ||
              "mx-auto"
            }
          >
            {imgEl}
          </div>
        </div>
      );
    }

    case "divider": {
      const divStyle = (section.config as any)?.style || "line";
      const divHeight = (section.config as any)?.height || "1";

      if (divStyle === "dots") {
        return (
          <div className="flex items-center justify-center gap-3 py-4">
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: themeColor }}
            />
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: themeColor }}
            />
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: themeColor }}
            />
          </div>
        );
      }
      if (divStyle === "gradient") {
        return (
          <div
            className={`h-${divHeight} w-full rounded-full`}
            style={{
              background: `linear-gradient(90deg, transparent, ${themeColor}44, transparent)`,
            }}
          />
        );
      }
      if (divStyle === "space") {
        return <div className={`h-${divHeight}`} />;
      }
      return (
        <div
          className="border-t w-full"
          style={{ borderColor: `${themeColor}44` }}
        />
      );
    }

    case "social_links": {
      const links = (section.config as any)?.links || [];
      if (!Array.isArray(links) || links.length === 0) {
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: themeColor }} />
              {section.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              No social links configured.
            </p>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: themeColor }} />
            {section.title}
          </h2>
          <div className="flex flex-wrap gap-3">
            {links.map((link: any, i: number) => (
              <a
                key={i}
                href={link.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{
                  background: `${themeColor}15`,
                  color: themeColor,
                  border: `1px solid ${themeColor}33`,
                }}
              >
                {link.label || link.platform || "Link"}
                <ExternalLink className="h-3.5 w-3.5 opacity-50" />
              </a>
            ))}
          </div>
        </div>
      );
    }

    case "spacer": {
      const height = (section.config as any)?.height || "3rem";
      return <div style={{ height }} />;
    }

    case "banner": {
      const bgColor = (section.config as any)?.background || "#7c3aed";
      const bg2 = (section.config as any)?.background2 || "#4c1d95";
      const bgType = (section.config as any)?.backgroundType || "gradient";
      const subtitle = (section.config as any)?.subtitle || "";
      const alignment = (section.config as any)?.alignment || "center";
      const bgStyle =
        bgType === "solid"
          ? `linear-gradient(135deg, ${bgColor}44, ${bgColor}11)`
          : `linear-gradient(135deg, ${bgColor}44, ${bg2}22, ${bgColor}11)`;
      return (
        <div
          className="rounded-2xl overflow-hidden py-14 px-10 backdrop-blur-sm"
          style={{
            background: bgStyle,
            textAlign: alignment as any,
          }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {section.title}
          </h2>
          {subtitle && (
            <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>
      );
    }

    default:
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <Card className="border-border/70">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Section type: {section.kind}
            </CardContent>
          </Card>
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PublicCreatorPage({
  profile,
  creatorPages,
  bots,
  activePage,
  sections,
  worlds = [],
  pageLayout = "grid",
  pageConfig = {},
}: PublicCreatorPageProps) {
  const displayName = profile?.display_name || profile?.username || "Creator";
  const themeColor =
    pageConfig.accentColor ||
    (profile?.theme as Record<string, string>)?.primaryColor ||
    "#7c3aed";
  const bgStyle = pageConfig.bgStyle || "default";
  const fontStyle = pageConfig.fontStyle || "default";
  const headerStyle = (pageConfig as any).headerStyle || "split";
  const avatarSize = (pageConfig as any).avatarSize || "large";
  const showBackButton = (pageConfig as any).showBackButton !== "false";
  const showBadges = (pageConfig as any).showBadges !== "false";

  const avatarSizeClass =
    avatarSize === "small"
      ? "h-20 w-20"
      : avatarSize === "medium"
        ? "h-24 w-24 sm:h-28 sm:w-28"
        : "h-24 w-24 sm:h-32 sm:w-32";

  const bgClass =
    bgStyle === "dark"
      ? "bg-zinc-950 text-zinc-100"
      : bgStyle === "ambient"
        ? "bg-gradient-to-b from-background via-background to-primary/5"
        : bgStyle === "minimal"
          ? "bg-white dark:bg-zinc-900"
          : "bg-background";

  const fontClass =
    fontStyle === "serif"
      ? "font-serif"
      : fontStyle === "mono"
        ? "font-mono"
        : fontStyle === "display"
          ? "font-display"
          : "";

  const renderBot = (bot: BotPreview) => {
    if (pageLayout === "list") return <BotCardList key={bot.id} bot={bot} />;
    return <BotCardGrid key={bot.id} bot={bot} themeColor={themeColor} />;
  };

  const getDefaultGridClass = () => {
    if (pageLayout === "list") return "space-y-3";
    if (pageLayout === "showcase")
      return "grid gap-6 grid-cols-1 sm:grid-cols-2";
    if (pageLayout === "timeline")
      return "space-y-6 border-l-2 border-border/70 pl-6 ml-4";
    return "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  };

  return (
    <div className={`min-h-screen ${bgClass} ${fontClass}`}>
      {/* Top Banner with accent color */}
      <div
        className="h-40 sm:h-56 w-full"
        style={{
          background: `linear-gradient(135deg, ${themeColor}33, ${themeColor}11, transparent)`,
        }}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 -mt-16 sm:-mt-20 pb-20">
        {/* Profile Header */}
        <div
          className={`flex ${headerStyle === "center" ? "flex-col items-center text-center" : headerStyle === "stacked" ? "flex-col items-center text-center" : "flex-col sm:flex-row items-start"} gap-4 sm:gap-6 mb-10`}
        >
          {/* Avatar */}
          <div
            className={`${avatarSizeClass} shrink-0 items-center justify-center rounded-2xl bg-card shadow-2xl overflow-hidden transition-shadow hover:shadow-3xl`}
            style={{
              borderWidth: "4px",
              borderStyle: "solid",
              borderColor: themeColor,
            }}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                className="text-3xl font-bold"
                style={{ color: themeColor }}
              >
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Info */}
          <div
            className={`flex-1 min-w-0 pt-2 ${headerStyle === "center" || headerStyle === "stacked" ? "flex flex-col items-center" : ""}`}
          >
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {displayName}
            </h1>
            {profile?.username && (
              <p
                className="text-sm mt-0.5"
                style={{ color: `${themeColor}aa` }}
              >
                @{profile.username}
              </p>
            )}
            {profile?.tagline && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {profile.tagline}
              </p>
            )}
            {showBadges && (
              <div
                className={`flex flex-wrap items-center gap-2 mt-3 ${headerStyle === "center" || headerStyle === "stacked" ? "justify-center" : ""}`}
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
                  <Calendar className="h-3 w-3 mr-1" />
                  Joined{" "}
                  {new Date(profile?.created_at || "").toLocaleDateString()}
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-xs"
                  style={{
                    background: `${themeColor}15`,
                    color: themeColor,
                    border: `1px solid ${themeColor}33`,
                  }}
                >
                  <Bot className="h-3 w-3 mr-1" />
                  {bots.length} bots
                </Badge>
              </div>
            )}
          </div>

          {/* Back to JanitorForge */}
          {showBackButton && (
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 cursor-pointer transition-all hover:shadow-md"
                style={{
                  borderColor: `${themeColor}44`,
                  color: themeColor,
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to JanitorForge
              </Button>
            </Link>
          )}
        </div>

        {/* Bio */}
        {profile?.bio && (
          <Card
            className="mb-10"
            style={{
              borderColor: `${themeColor}33`,
              background: `linear-gradient(135deg, ${themeColor}08, transparent)`,
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4" style={{ color: themeColor }} />
                <span className="text-sm font-medium">About</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {profile.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Active Page Sections */}
        {activePage && (
          <div className="space-y-10 mb-10">
            {activePage.title && activePage.title !== "My Creator Page" && (
              <div>
                <h1 className="text-2xl font-extrabold">{activePage.title}</h1>
                {activePage.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {activePage.description}
                  </p>
                )}
              </div>
            )}

            {sections.length > 0 ? (
              sections.map((section) => (
                <SectionRenderer
                  key={section.id}
                  section={section}
                  bots={bots}
                  worlds={worlds}
                  layout={pageLayout}
                  themeColor={themeColor}
                />
              ))
            ) : (
              /* If no sections, show all bots by default */
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Bots by {displayName}
                </h2>
                {bots.length > 0 ? (
                  <div className={getDefaultGridClass()}>
                    {bots.map(renderBot)}
                  </div>
                ) : (
                  <Card className="border-border/70">
                    <CardContent className="p-8 text-center text-sm text-muted-foreground">
                      No bots published yet.
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* Profile page (no active page) - show bots + pages */}
        {!activePage && (
          <div className="space-y-10">
            {/* Published Pages */}
            {creatorPages.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Layout className="h-5 w-5 text-primary" />
                  Pages
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {creatorPages.map((page) => (
                    <Link key={page.id} href={`/${page.slug}`}>
                      <Card className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-lg h-full group">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">
                            {page.title || "Untitled Page"}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {page.description || "No description"}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* All Bots */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Bots by {displayName}
              </h2>
              {bots.length > 0 ? (
                <div className={getDefaultGridClass()}>
                  {bots.map(renderBot)}
                </div>
              ) : (
                <Card className="border-border/70">
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    No bots published yet.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="mt-20 pt-8 border-t text-center text-xs text-muted-foreground"
          style={{ borderColor: `${themeColor}33` }}
        >
          <p>
            Powered by{" "}
            <Link
              href="/"
              className="hover:underline"
              style={{ color: themeColor }}
            >
              JanitorForge
            </Link>{" "}
            — Bot Creator Toolkit
          </p>
        </div>
      </div>
    </div>
  );
}
