// ============================================================================
// JanitorForge - Shared Section Renderer (V2)
// Renders creator page sections — handles ALL 14 section kinds with
// full config support matching the Atlas editor
// ============================================================================

"use client";

import {
  Globe,
  Bot,
  ExternalLink,
  Layout,
  Layers,
  Sparkles,
  MessageCircle,
  Image as ImageIcon,
  Share2,
  Send,
  SquarePen,
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
  InstagramIcon,
  RedditIcon,
  BlueskyIcon,
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BotCardGrid } from "./bot-card-grid";
import { BotCardList } from "./bot-card-list";
import type {
  BotPreview,
  WorldPreview,
} from "@/features/creator-pages/types/creator-page-types";

interface SectionData {
  id: string;
  page_id: string;
  kind: string;
  title: string;
  config: Record<string, unknown>;
  position: number;
  formId?: string;
}

export interface SectionRendererProps {
  section: SectionData;
  bots: BotPreview[];
  worlds: WorldPreview[];
  layout: string;
  themeColor: string;
  onBotClick?: (bot: BotPreview) => void;
  gridClass?: string;
}

const socialIconMap: Record<
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
  instagram: InstagramIcon,
  reddit: RedditIcon,
  bluesky: BlueskyIcon,
};

export function getDefaultGridClass(layout: string): string {
  switch (layout) {
    case "list":
      return "space-y-3";
    case "showcase":
      return "grid gap-6 grid-cols-1 sm:grid-cols-2";
    case "timeline":
      return "space-y-6 border-l-2 border-border/70 pl-6 ml-4";
    default:
      return "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  }
}

export function SectionRenderer({
  section,
  bots,
  worlds,
  layout,
  themeColor,
  onBotClick,
  gridClass,
}: SectionRendererProps) {
  const cfg = section.config || {};
  const gc = gridClass || getDefaultGridClass(layout);

  switch (section.kind) {
    // ================================ HERO ==================================
    case "hero": {
      const heroTitle = (cfg.heroTitle as string) || section.title;
      const heroSub = (cfg.heroSubtitle as string) || "";
      const ctaT = (cfg.heroCtaText as string) || "";
      const ctaL = (cfg.heroCtaLink as string) || "";
      return (
        <div
          className="relative overflow-hidden rounded-2xl p-8 sm:p-12 text-center"
          style={{
            background: `linear-gradient(135deg, ${themeColor}22, ${themeColor}08, transparent)`,
            borderColor: `${themeColor}33`,
            borderWidth: "1px",
          }}
        >
          <Sparkles
            className="h-10 w-10 mx-auto mb-4"
            style={{ color: themeColor }}
          />
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {heroTitle}
          </h1>
          {heroSub && (
            <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
              {heroSub}
            </p>
          )}
          {ctaT && ctaL && (
            <Link href={ctaL}>
              <Button className="mt-6" style={{ background: themeColor }}>
                {ctaT}
              </Button>
            </Link>
          )}
        </div>
      );
    }

    // ============================ BOT SHOWCASE ===============================
    case "bot_showcase": {
      const columns = Number(cfg.columns) || 0;
      const desc = (cfg.description as string) || "";
      const grid =
        columns > 0
          ? `grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(columns, 4)}`
          : gc;
      const botIds =
        (cfg.selectedBotIds as string[]) || (cfg.botIds as string[]) || [];
      const displayBots =
        botIds.length > 0 ? bots.filter((b) => botIds.includes(b.id)) : bots;
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 shrink-0" style={{ color: themeColor }} />{" "}
            {section.title}
          </h2>
          {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
          {displayBots.length > 0 ? (
            <div className={grid}>
              {displayBots.map((bot) =>
                layout === "list" ? (
                  <BotCardList
                    key={bot.id}
                    bot={bot}
                    onClick={() => onBotClick?.(bot)}
                  />
                ) : (
                  <BotCardGrid
                    key={bot.id}
                    bot={bot}
                    themeColor={themeColor}
                    onClick={() => onBotClick?.(bot)}
                  />
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border/50 rounded-lg">
              No bots to display.
            </p>
          )}
        </div>
      );
    }

    // ============================== BOT GROUP ================================
    case "bot_group": {
      const botIds =
        (cfg.selectedBotIds as string[]) || (cfg.botIds as string[]) || [];
      const selected =
        botIds.length > 0 ? bots.filter((b) => botIds.includes(b.id)) : bots;
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 shrink-0" style={{ color: themeColor }} />{" "}
            {section.title}
          </h2>
          {selected.length > 0 ? (
            <div className={gc}>
              {selected.map((bot) => (
                <BotCardGrid
                  key={bot.id}
                  bot={bot}
                  themeColor={themeColor}
                  onClick={() => onBotClick?.(bot)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border/50 rounded-lg">
              No bots in this group.
            </p>
          )}
        </div>
      );
    }

    // ============================ WORLD SHOWCASE =============================
    case "world_showcase":
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 shrink-0" style={{ color: themeColor }} />{" "}
            {section.title}
          </h2>
          {worlds.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {worlds.map((w) => (
                <Card
                  key={w.id}
                  className="transition-all hover:border-primary/30 hover:shadow-md"
                  style={{ borderColor: `${themeColor}33` }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        className="text-[10px] capitalize"
                      >
                        {w.kind}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {w.bot_ids.length} bots
                      </Badge>
                    </div>
                    <CardTitle className="text-base">{w.title}</CardTitle>
                    {w.description && (
                      <CardDescription className="line-clamp-2 mt-1">
                        {w.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border/50 rounded-lg">
              No worlds to display.
            </p>
          )}
        </div>
      );

    // ============================= TEXT BLOCK ================================
    case "text_block": {
      const body = (cfg.body as string) || "";
      const bgColor = (cfg.backgroundColor as string) || "";
      const textColor = (cfg.textColor as string) || "";
      const alignment = (cfg.textAlignment as string) || "left";
      const fontSize = (cfg.fontSize as string) || "normal";
      const padding = (cfg.padding as string) || "normal";
      const bordered = cfg.bordered !== "false" && cfg.bordered !== false;
      const padClass =
        padding === "compact"
          ? "p-4"
          : padding === "large"
            ? "p-8 sm:p-10"
            : "p-6";
      return (
        <div className="space-y-3">
          {section.title && (
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Layout
                className="h-5 w-5 shrink-0"
                style={{ color: themeColor }}
              />{" "}
              {section.title}
            </h2>
          )}
          <Card
            className={
              bordered
                ? "border-border/70"
                : "border-transparent shadow-none bg-transparent"
            }
            style={bgColor ? { backgroundColor: bgColor } : undefined}
          >
            <CardContent
              className={padClass}
              style={{ textAlign: alignment as any }}
            >
              {body ? (
                <div
                  className={`prose prose-sm dark:prose-invert max-w-none ${fontSize === "large" ? "text-base" : fontSize === "small" ? "text-xs" : "text-sm"}`}
                  style={textColor ? { color: textColor } : undefined}
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

    // ================================ BANNER =================================
    case "banner": {
      const subtitle = (cfg.subtitle as string) || "";
      const bg = (cfg.background as string) || themeColor;
      const bg2 = (cfg.background2 as string) || "#4c1d95";
      const bgType = (cfg.backgroundType as string) || "gradient";
      const bgImage = (cfg.backgroundImage as string) || "";
      const overlay = Number(cfg.overlayOpacity ?? 50);
      const align = (cfg.alignment as string) || "center";
      const ctaText = (cfg.ctaText as string) || "";
      const ctaLink = (cfg.ctaLink as string) || "";
      const cta2Text = (cfg.secondaryCtaText as string) || "";
      const cta2Link = (cfg.secondaryCtaLink as string) || "";
      const bgStyle: React.CSSProperties = bgImage
        ? {
            backgroundImage: `url(${bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
        : bgType === "gradient"
          ? { background: `linear-gradient(135deg, ${bg}, ${bg2})` }
          : { backgroundColor: bg };
      return (
        <div
          className="relative overflow-hidden rounded-2xl min-h-[220px] flex items-center"
          style={bgStyle}
        >
          <div
            className="absolute inset-0 bg-black/50"
            style={{ opacity: overlay / 100 }}
          />
          <div
            className={`relative z-10 w-full p-8 sm:p-12 ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}
          >
            {section.title && (
              <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">
                {section.title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-2 text-white/80 max-w-2xl drop-shadow-sm">
                {subtitle}
              </p>
            )}
            {(ctaText || cta2Text) && (
              <div
                className={`flex flex-wrap gap-3 mt-5 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : ""}`}
              >
                {ctaText && ctaLink && (
                  <Link href={ctaLink}>
                    <Button className="bg-white text-black hover:bg-white/90 font-semibold shadow-lg">
                      {ctaText}
                    </Button>
                  </Link>
                )}
                {cta2Text && cta2Link && (
                  <Link href={cta2Link}>
                    <Button
                      variant="outline"
                      className="border-white/40 text-white hover:bg-white/10"
                    >
                      {cta2Text}
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // ================================ FORM ===================================
    case "form": {
      const fId = (cfg.formId as string) || section.formId || "";
      const share = (cfg.shareableLink as string) || "";
      const desc = (cfg.description as string) || "";
      const cta = (cfg.ctaText as string) || "Submit a Request";
      return (
        <div className="space-y-4">
          {section.title && (
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageCircle
                className="h-5 w-5 shrink-0"
                style={{ color: themeColor }}
              />{" "}
              {section.title}
            </h2>
          )}
          <div
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card/95 to-card/80 shadow-lg transition-all duration-500 hover:shadow-2xl"
            style={{ boxShadow: `0 8px 32px -12px ${themeColor}33` }}
          >
            {/* Animated gradient background blobs */}
            <div
              className="absolute -inset-1 opacity-20 blur-3xl pointer-events-none group-hover:opacity-30 transition-opacity duration-700"
              style={{
                background: `radial-gradient(circle at 0% 0%, ${themeColor}33, transparent 60%), radial-gradient(circle at 100% 100%, ${themeColor}22, transparent 60%)`,
              }}
            />
            {/* Floating particle decorations */}
            <div
              className="absolute top-6 left-8 h-2 w-2 rounded-full opacity-0 group-hover:opacity-40 transition-all duration-1000"
              style={{
                background: themeColor,
                boxShadow: `0 0 8px ${themeColor}`,
              }}
            />
            <div
              className="absolute bottom-8 right-12 h-1.5 w-1.5 rounded-full opacity-0 group-hover:opacity-30 transition-all duration-1000 delay-200"
              style={{
                background: themeColor,
                boxShadow: `0 0 6px ${themeColor}`,
              }}
            />
            <div
              className="absolute top-1/3 right-6 h-1 w-1 rounded-full opacity-0 group-hover:opacity-25 transition-all duration-1000 delay-500"
              style={{
                background: themeColor,
                boxShadow: `0 0 4px ${themeColor}`,
              }}
            />
            <CardContent className="relative p-0">
              <div className="relative p-6 sm:p-8 md:p-10">
                {/* Icon + Title row */}
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-md"
                    style={{
                      background: `linear-gradient(135deg, ${themeColor}, ${themeColor}aa)`,
                      boxShadow: `0 4px 14px -4px ${themeColor}55`,
                    }}
                  >
                    <SquarePen className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">
                      Open for Submissions
                    </h3>
                    {desc && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {desc}
                      </p>
                    )}
                  </div>
                </div>
                {/* CTA Footer */}
                <div
                  className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border/40 bg-card/40 p-4 sm:p-5"
                  style={{ borderColor: `${themeColor}15` }}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className="flex h-2 w-2 rounded-full"
                      style={{ background: themeColor }}
                    />
                    Ready to start? Hit the button below
                  </div>
                  {share ? (
                    <Link href={`/form/${share}`} className="w-full sm:w-auto">
                      <Button
                        size="lg"
                        className="relative w-full sm:w-auto overflow-hidden text-white font-bold shadow-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl active:scale-[0.97] group/btn"
                        style={{
                          background: `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)`,
                          boxShadow: `0 4px 20px -4px ${themeColor}55`,
                        }}
                      >
                        <span
                          className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"
                          style={{
                            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`,
                          }}
                        />
                        <Send className="h-4 w-4 mr-2 relative z-10" />
                        <span className="relative z-10 cursor-pointer">
                          {cta}
                        </span>
                      </Button>
                    </Link>
                  ) : fId ? (
                    <p className="text-sm text-muted-foreground italic">
                      Form linked but no public link yet.
                    </p>
                  ) : (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <MessageCircle className="h-5 w-5 opacity-30" />
                      <span>No form linked yet</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      );
    }

    // ============================ SOCIAL LINKS ================================
    case "social_links": {
      const links =
        (cfg.links as Array<{
          platform: string;
          url: string;
          label?: string;
        }>) || [];
      return (
        <div className="space-y-3">
          {section.title && (
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Share2
                className="h-5 w-5 shrink-0"
                style={{ color: themeColor }}
              />{" "}
              {section.title}
            </h2>
          )}
          <div className="flex flex-wrap gap-3">
            {links.map((link, i) => {
              const platform = link.platform.toLowerCase();
              const Icon = socialIconMap[platform] || WebsiteIcon;
              return (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                  style={{ borderColor: `${themeColor}44`, color: themeColor }}
                >
                  <Icon className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
                  {link.label ||
                    platform.charAt(0).toUpperCase() + platform.slice(1)}
                </a>
              );
            })}
          </div>
          {links.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No social links set.
            </p>
          )}
        </div>
      );
    }

    // =============================== GALLERY ================================
    case "gallery": {
      const images = (cfg.images as Array<{ url: string; alt?: string }>) || [];
      const cols = Number(cfg.columns) || 3;
      const colClass = `grid-cols-2 sm:grid-cols-${Math.min(cols, 4)}`;
      return (
        <div className="space-y-3">
          {section.title && (
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ImageIcon
                className="h-5 w-5 shrink-0"
                style={{ color: themeColor }}
              />{" "}
              {section.title}
            </h2>
          )}
          {images.length > 0 ? (
            <div className={`grid ${colClass} gap-3`}>
              {images.map((img, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl overflow-hidden bg-muted shadow-sm transition-transform hover:shadow-md hover:scale-[1.02]"
                >
                  <img
                    src={img.url}
                    alt={img.alt || ""}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border/50 rounded-lg">
              No images added yet.
            </p>
          )}
        </div>
      );
    }

    // ================================ EMBED =================================
    case "embed": {
      const embedUrl = (cfg.embedUrl as string) || "";
      const embedH = (cfg.embedHeight as string) || "400";
      if (!embedUrl) return null;
      return (
        <div className="space-y-3">
          {section.title && (
            <h2 className="text-xl font-semibold">{section.title}</h2>
          )}
          <div className="rounded-xl overflow-hidden border border-border/70 bg-black/5">
            <iframe
              src={embedUrl}
              width="100%"
              height={embedH}
              allowFullScreen
              className="w-full"
              style={{ border: "none" }}
              title={section.title || "Embed"}
            />
          </div>
        </div>
      );
    }

    // ============================== STICKER =================================
    case "sticker": {
      const imgSrc = (cfg.imageUrl as string) || "";
      const imgAlt = (cfg.alt as string) || section.title;
      const imgSize = (cfg.size as string) || "medium";
      const imgRounded = (cfg.rounded as string) || "md";
      const imgAlign = (cfg.alignment as string) || "center";
      const positionMode = (cfg.positionMode as string) || "static";
      const posX = (cfg.posX as string) || "0px";
      const posY = (cfg.posY as string) || "0px";
      const rotation = Number(cfg.rotation) || 0;
      const opacity = Number(cfg.opacity) ?? 100;
      if (!imgSrc) return null;
      const sizeMap: Record<string, string> = {
        small: "max-w-32",
        medium: "max-w-64",
        large: "max-w-96",
        full: "w-full",
      };
      const radiusMap: Record<string, string> = {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-lg",
        lg: "rounded-2xl",
        full: "rounded-full",
      };
      const alignClass =
        imgAlign === "left"
          ? "mr-auto"
          : imgAlign === "right"
            ? "ml-auto"
            : "mx-auto";
      if (positionMode === "absolute") {
        return (
          <div className="relative" style={{ height: 0, overflow: "visible" }}>
            <img
              src={imgSrc}
              alt={imgAlt}
              className={`${sizeMap[imgSize]} ${radiusMap[imgRounded]}`}
              style={{
                position: "absolute",
                left: posX,
                top: posY,
                transform: `rotate(${rotation}deg)`,
                opacity: opacity / 100,
                zIndex: 10,
              }}
            />
          </div>
        );
      }
      return (
        <div className="w-full">
          <img
            src={imgSrc}
            alt={imgAlt}
            className={`${sizeMap[imgSize]} ${radiusMap[imgRounded]} ${alignClass} block`}
            style={{
              transform: rotation ? `rotate(${rotation}deg)` : undefined,
              opacity: opacity / 100,
            }}
          />
        </div>
      );
    }

    // ============================ LOREBOOK GALLERY ============================
    case "lorebook_gallery": {
      const lorebookIds = (cfg.lorebookIds as string[]) || [];
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Layers
              className="h-5 w-5 shrink-0"
              style={{ color: themeColor }}
            />{" "}
            {section.title}
          </h2>
          {lorebookIds.length > 0 ? (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {lorebookIds.map((id) => (
                <Card key={id} className="border-border/70">
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    Lorebook: {id}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border/50 rounded-lg">
              No lorebooks linked.
            </p>
          )}
        </div>
      );
    }

    // =============================== DIVIDER ================================
    case "divider":
      return (
        <hr className="border-t" style={{ borderColor: `${themeColor}33` }} />
      );

    // =============================== SPACER =================================
    case "spacer":
      return <div style={{ height: (cfg.height as string) || "3rem" }} />;

    // =============================== DEFAULT =================================
    default:
      return (
        <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
          Unknown section: {section.kind}
        </div>
      );
  }
}
