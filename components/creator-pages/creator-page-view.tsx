// ============================================================================
// JanitorForge - Creator Page View
// Public view of a customizable creator page at /page/[slug]
// Focused on sections, layout, and creator identity — NOT profile info
// ============================================================================

"use client";

import {
  Globe,
  Bot,
  ExternalLink,
  Layout,
  Layers,
  ArrowLeft,
  Users,
  MessageCircle,
} from "lucide-react";
import {
  TwitterIcon,
  DiscordIcon,
  GithubIcon,
  TiktokIcon,
  YoutubeIcon,
  TwitchIcon,
  WebsiteIcon,
  JanitorAIIcon,
} from "@/components/ui/social-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BotDetailModal } from "@/components/bots/bot-detail-modal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreatorInfo {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
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

interface CreatorPageViewProps {
  creator: CreatorInfo;
  page: CreatorPageData;
  sections: PageSection[];
  bots: BotPreview[];
  worlds: WorldPreview[];
  allPages?: CreatorPageData[];
  pageConfig?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Bot Cards
// ---------------------------------------------------------------------------

function BotCardGrid({
  bot,
  themeColor,
  onClick,
}: {
  bot: BotPreview;
  themeColor: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
      onClick={onClick}
      style={{
        borderColor: `${themeColor}44`,
        boxShadow: `0 4px 6px -1px ${themeColor}11, 0 2px 4px -2px ${themeColor}08`,
      }}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {bot.image_url ? (
          <img
            src={bot.image_url}
            alt={bot.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <Bot className="h-16 w-16 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
        <Badge
          variant={bot.rating === "SFW" ? "secondary" : "destructive"}
          className="absolute top-3 right-3 backdrop-blur-sm shadow-sm"
        >
          {bot.rating}
        </Badge>
      </div>
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

function BotCardList({
  bot,
  onClick,
}: {
  bot: BotPreview;
  onClick?: () => void;
}) {
  return (
    <Card
      className="group overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 p-4">
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
// Section Renderer
// ---------------------------------------------------------------------------

function SectionRenderer({
  section,
  bots,
  worlds,
  layout,
  themeColor,
  onBotClick,
}: {
  section: PageSection;
  bots: BotPreview[];
  worlds: WorldPreview[];
  layout: string;
  themeColor: string;
  onBotClick: (bot: BotPreview) => void;
}) {
  const isMobile = useIsMobile();
  const cfg = section.config as Record<string, any>;
  const description = cfg?.description || "";

  switch (section.kind) {
    case "bot_showcase":
    case "bot_group": {
      const columns = Number(cfg?.columns) || 3;
      const selectedBotIds = cfg?.selectedBotIds;
      const filteredBots =
        Array.isArray(selectedBotIds) && selectedBotIds.length > 0
          ? bots.filter((b) => selectedBotIds.includes(b.id))
          : bots;
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

      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" style={{ color: themeColor }} />
            {section.title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {filteredBots.length > 0 ? (
            <div className={getGridClass()}>
              {filteredBots.map((bot) =>
                layout === "list" ? (
                  <BotCardList
                    key={bot.id}
                    bot={bot}
                    onClick={() => onBotClick(bot)}
                  />
                ) : (
                  <BotCardGrid
                    key={bot.id}
                    bot={bot}
                    themeColor={themeColor}
                    onClick={() => onBotClick(bot)}
                  />
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No bots to display.</p>
          )}
        </div>
      );
    }

    case "world_showcase": {
      const selectedWorldIds = cfg?.selectedWorldIds;
      const filteredWorlds =
        Array.isArray(selectedWorldIds) && selectedWorldIds.length > 0
          ? worlds.filter((w) => selectedWorldIds.includes(w.id))
          : worlds;
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" style={{ color: themeColor }} />
            {section.title}
          </h2>
          {filteredWorlds.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredWorlds.map((world) => (
                <Card
                  key={world.id}
                  className="transition-all group"
                  style={{
                    borderColor: `${themeColor}33`,
                    boxShadow: `0 1px 3px ${themeColor}08`,
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
    }

    case "text_block": {
      const body = cfg?.body || "";
      const bgColor = cfg?.backgroundColor || "";
      const textColor = cfg?.textColor || "";
      const textAlignment = cfg?.textAlignment || "left";
      const padding = cfg?.padding || "normal";
      const bordered = cfg?.bordered !== "false" && cfg?.bordered !== false;
      const fontSize = cfg?.fontSize || "normal";

      const paddingMap: Record<string, string> = {
        compact: "p-4",
        normal: "p-6",
        spacious: "p-8 sm:p-10",
      };
      const fontSizeMap: Record<string, string> = {
        small: "text-xs",
        normal: "text-sm",
        large: "text-base",
      };

      const cardStyle: React.CSSProperties = {};
      if (bgColor) cardStyle.background = bgColor;
      if (!bordered) cardStyle.border = "none";

      return (
        <div className="space-y-3">
          {section.title && (
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Layout className="h-5 w-5" style={{ color: themeColor }} />
              {section.title}
            </h2>
          )}
          <Card
            className={bordered ? "border-border/70" : "border-transparent"}
            style={cardStyle}
          >
            <CardContent className={paddingMap[padding] || "p-6"}>
              {body ? (
                <div
                  className={`${fontSizeMap[fontSize]} leading-relaxed prose prose-sm dark:prose-invert max-w-none`}
                  style={{
                    color: textColor || undefined,
                    textAlign: textAlignment as any,
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {body}
                  </ReactMarkdown>
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
      const shareableLink = cfg?.shareableLink || "";
      const formId = cfg?.formId || "";
      const formDesc = cfg?.description || "";
      const formCtaText = cfg?.ctaText || "";
      const formIcon = cfg?.icon || "message";

      return (
        <div className="space-y-3">
          <Card
            className="border-border/70 overflow-hidden relative"
            style={{
              borderColor: `${themeColor}33`,
            }}
          >
            {/* Decorative background layers */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background: `radial-gradient(ellipse at 20% 50%, ${themeColor}22, transparent 60%), radial-gradient(ellipse at 80% 50%, ${themeColor}15, transparent 60%)`,
              }}
            />
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background: `linear-gradient(90deg, transparent, ${themeColor}66, transparent)`,
              }}
            />

            <CardContent className="p-0 relative z-10">
              <div className="px-6 py-8 sm:px-10 sm:py-12 text-center">
                {/* Icon with animated glow ring */}
                <div className="relative mx-auto mb-6 w-fit">
                  <div
                    className="absolute inset-0 rounded-2xl opacity-30 blur-lg"
                    style={{ background: themeColor }}
                  />
                  <div
                    className="relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
                    }}
                  >
                    <MessageCircle className="h-8 w-8 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3
                  className="text-2xl sm:text-3xl font-extrabold tracking-tight"
                  style={{ color: themeColor }}
                >
                  {section.title}
                </h3>

                {/* Description */}
                {formDesc && (
                  <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
                    {formDesc}
                  </p>
                )}

                {/* Decorative features list */}
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span style={{ color: themeColor }}>✓</span> Free to submit
                  </span>
                  <span className="flex items-center gap-1">
                    <span style={{ color: themeColor }}>✓</span> Quick response
                  </span>
                  <span className="flex items-center gap-1">
                    <span style={{ color: themeColor }}>✓</span> Direct to
                    creator
                  </span>
                </div>

                {/* CTA Button */}
                <div className="flex justify-center mt-6">
                  {shareableLink ? (
                    <Link href={`/form/${shareableLink}`}>
                      <Button
                        size="lg"
                        className="text-white font-bold cursor-pointer shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 px-8"
                        style={{
                          background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`,
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {formCtaText || "Open Request Form"}
                      </Button>
                    </Link>
                  ) : formId ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Form linked and ready
                    </div>
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
      const imgSrc = cfg?.imageUrl || "";
      const imgAlt = cfg?.alt || section.title;
      const imgSize = cfg?.size || "medium";
      const imgRounded = cfg?.rounded || "md";
      const positionMode = cfg?.positionMode || "static";
      const posX = cfg?.posX || "0px";
      const posY = cfg?.posY || "0px";
      const rotation = cfg?.rotation || "0";
      const stickerOpacity = cfg?.opacity || "100";
      const zIndex = cfg?.zIndex || "10";

      // Responsive size map — scales down on smaller screens
      const sizeStyles: Record<string, React.CSSProperties> = {
        small: { maxWidth: "8rem" }, // 128px
        medium: { maxWidth: "16rem" }, // 256px
        large: { maxWidth: "24rem" }, // 384px
        full: { maxWidth: "100%" },
      };
      const radiusMap: Record<string, string> = {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-lg",
        lg: "rounded-2xl",
        full: "rounded-full",
      };

      const stickerBaseStyle: React.CSSProperties = {
        width: "100%",
        ...sizeStyles[imgSize],
      };

      if (!imgSrc)
        return positionMode === "absolute" ? (
          <div
            className="relative h-0 w-0 overflow-visible"
            style={{
              position: "absolute",
              left: posX,
              top: posY,
              transform: `rotate(${rotation}deg)`,
              opacity: Number(stickerOpacity) / 100,
              zIndex: Number(zIndex),
            }}
          />
        ) : (
          <div className="w-full max-w-xs mx-auto flex items-center justify-center rounded-xl border-2 border-dashed p-6 text-xs text-muted-foreground">
            No image set
          </div>
        );

      const imgEl = (
        <img
          src={imgSrc}
          alt={imgAlt}
          className={`${radiusMap[imgRounded]} shadow-md pointer-events-none select-none h-auto`}
          style={stickerBaseStyle}
        />
      );

      if (positionMode === "absolute") {
        // On mobile, convert absolute to centered static
        if (isMobile)
          return (
            <div className="w-full flex justify-center overflow-hidden">
              <div className="max-w-[80vw]">{imgEl}</div>
            </div>
          );
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
        <div className="w-full overflow-hidden">
          <div
            className={`${alignMap[cfg?.alignment || "center"] || "mx-auto"} max-w-full`}
          >
            {imgEl}
          </div>
        </div>
      );
    }

    case "divider": {
      const divStyle = cfg?.style || "line";
      const divHeight = Math.min(Number(cfg?.height) || 1, 8);
      if (divStyle === "dots")
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
      if (divStyle === "gradient")
        return (
          <div
            className="w-full rounded-full"
            style={{
              height: `${divHeight * 0.25}rem`,
              background: `linear-gradient(90deg, transparent, ${themeColor}44, transparent)`,
            }}
          />
        );
      if (divStyle === "space")
        return <div style={{ height: `${divHeight * 0.25}rem` }} />;
      if (divStyle === "ornament")
        return (
          <div className="flex items-center justify-center gap-3 py-4">
            <div
              className="h-px flex-1"
              style={{ background: `${themeColor}33` }}
            />
            <div
              className="h-2 w-2 rotate-45"
              style={{ background: themeColor }}
            />
            <div
              className="h-px flex-1"
              style={{ background: `${themeColor}33` }}
            />
          </div>
        );
      return (
        <div
          className="border-t w-full"
          style={{ borderColor: `${themeColor}44` }}
        />
      );
    }

    case "social_links": {
      const links = cfg?.links || [];
      const platformIconMap: Record<
        string,
        React.FC<{ className?: string; size?: number }>
      > = {
        janitorai: JanitorAIIcon,
        twitter: TwitterIcon,
        discord: DiscordIcon,
        github: GithubIcon,
        tiktok: TiktokIcon,
        youtube: YoutubeIcon,
        twitch: TwitchIcon,
        website: WebsiteIcon,
      };

      if (!Array.isArray(links) || links.length === 0)
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
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: themeColor }} />
            {section.title}
          </h2>
          <div className="flex flex-wrap gap-3">
            {links.map((link: any, i: number) => {
              const Icon = platformIconMap[link.platform] || WebsiteIcon;
              return (
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
                  <Icon className="h-4 w-4" />
                  {link.label || link.platform || "Link"}
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
              );
            })}
          </div>
        </div>
      );
    }

    case "spacer": {
      const height = cfg?.height || "3rem";
      return <div style={{ height }} />;
    }

    case "banner": {
      const bgColor = cfg?.background || "#7c3aed";
      const bg2 = cfg?.background2 || "#4c1d95";
      const bgType = cfg?.backgroundType || "gradient";
      const bgImage = cfg?.backgroundImage || "";
      const overlayOpacity = Number(cfg?.overlayOpacity) || 50;
      const subtitle = cfg?.subtitle || "";
      const alignment = cfg?.alignment || "center";
      const ctaText = cfg?.ctaText || "";
      const ctaLink = cfg?.ctaLink || "";
      const ctaColor = cfg?.ctaColor || bgColor;

      let bgValue: string;
      if (bgImage) {
        bgValue = `url(${bgImage}) center/cover no-repeat`;
      } else if (bgType === "solid") {
        bgValue = `linear-gradient(135deg, ${bgColor}44, ${bgColor}11)`;
      } else {
        bgValue = `linear-gradient(135deg, ${bgColor}44, ${bg2}22, ${bgColor}11)`;
      }

      return (
        <div
          className="relative rounded-2xl overflow-hidden py-14 px-10"
          style={{ textAlign: alignment as any }}
        >
          {/* Background */}
          <div className="absolute inset-0" style={{ background: bgValue }} />
          {/* Overlay for image backgrounds */}
          {bgImage && (
            <div
              className="absolute inset-0 bg-background"
              style={{ opacity: overlayOpacity / 100 }}
            />
          )}
          {/* Content */}
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {section.title}
            </h2>
            {subtitle && (
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
            {ctaText && (
              <div className="mt-6">
                {ctaLink ? (
                  <a href={ctaLink} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="lg"
                      className="text-white font-semibold shadow-lg cursor-pointer"
                      style={{ background: ctaColor }}
                    >
                      {ctaText}
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </a>
                ) : (
                  <Button
                    size="lg"
                    className="text-white font-semibold shadow-lg"
                    style={{ background: ctaColor }}
                  >
                    {ctaText}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    case "hero": {
      const headline = cfg?.headline || section.title;
      const subheadline = cfg?.subheadline || "";
      const heroImage = cfg?.heroImage || "";
      const overlayColor = cfg?.overlayColor || "#000000";
      const overlayOpacity = Number(cfg?.overlayOpacity) || 60;
      const heroCtaText = cfg?.ctaText || "";
      const heroCtaLink = cfg?.ctaLink || "";
      const heroCtaColor = cfg?.ctaColor || themeColor;
      const secondaryCtaText = cfg?.secondaryCtaText || "";
      const secondaryCtaLink = cfg?.secondaryCtaLink || "";
      const heroAlignment = cfg?.alignment || "center";
      const heroHeight = cfg?.height || "tall";

      const heightMap: Record<string, string> = {
        short: "min-h-[40vh]",
        medium: "min-h-[60vh]",
        tall: "min-h-[80vh]",
        fullscreen: "min-h-screen",
      };

      return (
        <div
          className={`relative ${heightMap[heroHeight] || "min-h-[80vh]"} flex items-center justify-center rounded-2xl overflow-hidden -mx-4 sm:-mx-6`}
        >
          {/* Background */}
          {heroImage ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroImage})` }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${themeColor}66, ${themeColor}22, ${themeColor}44)`,
              }}
            />
          )}
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: overlayColor,
              opacity: overlayOpacity / 100,
            }}
          />
          {/* Content */}
          <div
            className={`relative z-10 px-8 sm:px-16 py-16 max-w-4xl ${heroAlignment === "left" ? "text-left" : heroAlignment === "right" ? "text-right" : "text-center"}`}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
              {headline}
            </h1>
            {subheadline && (
              <p className="mt-4 text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
                {subheadline}
              </p>
            )}
            <div
              className={`flex flex-wrap gap-3 mt-8 ${heroAlignment === "center" ? "justify-center" : heroAlignment === "right" ? "justify-end" : "justify-start"}`}
            >
              {heroCtaText &&
                (heroCtaLink ? (
                  <a
                    href={heroCtaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="lg"
                      className="text-white font-semibold shadow-lg cursor-pointer"
                      style={{ background: heroCtaColor }}
                    >
                      {heroCtaText}
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </a>
                ) : (
                  <Button
                    size="lg"
                    className="text-white font-semibold shadow-lg"
                    style={{ background: heroCtaColor }}
                  >
                    {heroCtaText}
                  </Button>
                ))}
              {secondaryCtaText &&
                (secondaryCtaLink ? (
                  <a
                    href={secondaryCtaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-white border-white/50 hover:bg-white/10 font-semibold cursor-pointer"
                    >
                      {secondaryCtaText}
                    </Button>
                  </a>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-white border-white/50 hover:bg-white/10 font-semibold"
                  >
                    {secondaryCtaText}
                  </Button>
                ))}
            </div>
          </div>
        </div>
      );
    }

    case "gallery": {
      const images = cfg?.images || [];
      const galleryColumns = Number(cfg?.columns) || 3;
      const galleryGap = cfg?.gap || "normal";
      const rounded = cfg?.rounded || "md";

      const gapMap: Record<string, string> = {
        compact: "gap-2",
        normal: "gap-4",
        spacious: "gap-6",
      };
      const radiusMap: Record<string, string> = {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-lg",
        lg: "rounded-xl",
        full: "rounded-2xl",
      };

      const colsClass =
        galleryColumns === 2
          ? "grid-cols-2"
          : galleryColumns === 4
            ? "grid-cols-2 sm:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3";

      if (!Array.isArray(images) || images.length === 0) {
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <div className="rounded-xl border-2 border-dashed p-10 text-center text-sm text-muted-foreground">
              No images added yet.
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {section.title && (
            <h2 className="text-xl font-semibold">{section.title}</h2>
          )}
          <div className={`grid ${colsClass} ${gapMap[galleryGap] || "gap-4"}`}>
            {images.map((img: any, i: number) => (
              <div
                key={i}
                className={`overflow-hidden ${radiusMap[rounded] || "rounded-lg"} group`}
              >
                {img.url ? (
                  <img
                    src={img.url}
                    alt={img.alt || `Image ${i + 1}`}
                    className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground text-xs">
                    No image
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "embed": {
      const embedUrl = cfg?.embedUrl || "";
      const embedType = cfg?.embedType || "youtube";
      const embedHeight = Number(cfg?.height) || 400;

      if (!embedUrl) {
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <div className="rounded-xl border-2 border-dashed p-10 text-center text-sm text-muted-foreground">
              No embed URL configured.
            </div>
          </div>
        );
      }

      // Convert YouTube watch URLs to embed
      let src = embedUrl;
      if (embedType === "youtube") {
        const ytMatch = embedUrl.match(
          /(?:watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
        );
        if (ytMatch) src = `https://www.youtube.com/embed/${ytMatch[1]}`;
      }

      return (
        <div className="space-y-3">
          {section.title && (
            <h2 className="text-xl font-semibold">{section.title}</h2>
          )}
          <div
            className="rounded-xl overflow-hidden"
            style={{ height: `${embedHeight}px` }}
          >
            <iframe
              src={src}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
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
  const creatorName = creator.display_name || creator.username || "Creator";
  const themeColor = pageConfig.accentColor || "#7c3aed";
  const bgStyle = pageConfig.bgStyle || "default";
  const fontStyle = pageConfig.fontStyle || "default";
  const headerStyle = pageConfig.headerStyle || "split";
  const avatarSize = pageConfig.avatarSize || "large";
  const showBackButton = pageConfig.showBackButton !== "false";
  const showBadges = pageConfig.showBadges !== "false";

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

  const defaultGridClass =
    page.layout === "list"
      ? "space-y-3"
      : page.layout === "showcase"
        ? "grid gap-6 grid-cols-1 sm:grid-cols-2"
        : page.layout === "timeline"
          ? "space-y-6 border-l-2 border-border/70 pl-6 ml-4"
          : "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className={`min-h-screen ${bgClass} ${fontClass}`}>
      {/* Top Banner */}
      <div
        className="h-40 sm:h-56 w-full"
        style={{
          background: `linear-gradient(135deg, ${themeColor}33, ${themeColor}11, transparent)`,
        }}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 -mt-16 sm:-mt-20 pb-20">
        {/* Minimal Creator Header */}
        <div
          className={`flex ${headerStyle === "center" || headerStyle === "stacked" ? "flex-col items-center text-center" : "flex-col sm:flex-row items-start"} gap-4 sm:gap-6 mb-10`}
        >
          {/* Avatar */}
          <div
            className={`${avatarSizeClass} shrink-0 items-center justify-center rounded-2xl bg-card shadow-2xl overflow-hidden`}
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
              <span
                className="text-3xl font-bold"
                style={{ color: themeColor }}
              >
                {creatorName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Info — minimal */}
          <div
            className={`flex-1 min-w-0 pt-2 ${headerStyle === "center" || headerStyle === "stacked" ? "flex flex-col items-center" : ""}`}
          >
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {creatorName}
            </h1>
            {creator.username && (
              <p
                className="text-sm mt-0.5"
                style={{ color: `${themeColor}aa` }}
              >
                @{creator.username}
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
                  <Bot className="h-3 w-3 mr-1" />
                  {bots.length} bots
                </Badge>
              </div>
            )}

            {/* Page navigation — if creator has multiple pages */}
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
                          : {
                              borderColor: `${themeColor}44`,
                              color: themeColor,
                            }
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
            {showBackButton && (
              <Link
                href={creator.username ? `/profile/${creator.username}` : "/"}
              >
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

        {/* Page Title */}
        {page.title && page.title !== "My Creator Page" && (
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold">{page.title}</h2>
            {page.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {page.description}
              </p>
            )}
          </div>
        )}

        {/* Sections */}
        {sections.length > 0 ? (
          <div className="space-y-10">
            {sections.map((section) => (
              <SectionRenderer
                key={section.id}
                section={section}
                bots={bots}
                worlds={worlds}
                layout={page.layout}
                themeColor={themeColor}
                onBotClick={setBotDetailBot}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bot className="h-5 w-5" style={{ color: themeColor }} />
              Bots by {creatorName}
            </h2>
            {bots.length > 0 ? (
              <div className={defaultGridClass}>
                {bots.map((bot) => (
                  <BotCardGrid
                    key={bot.id}
                    bot={bot}
                    themeColor={themeColor}
                    onClick={() => setBotDetailBot(bot)}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-border/70">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No content yet.
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Bot Detail Modal */}
        <BotDetailModal
          open={!!botDetailBot}
          onOpenChange={(v) => {
            if (!v) setBotDetailBot(null);
          }}
          bot={botDetailBot}
        />

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
