// ============================================================================
// JanitorForge - Public Profile View
// Read-only view of another user's profile at /profile/[username]
// Shows profile info, bots, creator pages, worlds, follow button
// ============================================================================

"use client";

import {
  Globe,
  Bot,
  ExternalLink,
  Calendar,
  ArrowLeft,
  Star,
  MapPin,
  Heart,
  UsersRound,
  FileText,
  AppWindow,
} from "lucide-react";
import {
  TwitterIcon,
  DiscordIcon,
  GithubIcon,
  TiktokIcon,
  YoutubeIcon,
  TwitchIcon,
  WebsiteIcon,
} from "@/components/ui/social-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  followUser,
  unfollowUser,
  checkIsFollowing,
} from "@/app/actions/profile";
import { toast } from "sonner";
import { FollowListModal } from "./follow-list-modal";
import { BotDetailModal } from "@/components/bots/bot-detail-modal";
import { renderMarkdown } from "@/lib/markdown";
import { ProfileBadgesSection } from "./profile-badges";
import { ProfileSectionEmpty } from "./profile-section-empty";
import {
  ProfileBotGridCard,
  ProfileFeaturedBotListCard,
} from "./profile-bot-cards";
import { cn } from "@/lib/utils";
import type { ProfileBadgeRecord } from "@/lib/profile-badges";
import {
  getProfileBackgroundTintColor,
  getProfileBackgroundStyles,
  getProfileBorderTintColor,
  getProfileCardClass,
  getProfileFontStyle,
  getProfileGridClass,
  getReadableProfileAccentColor,
  getReadableProfileMutedAccentColor,
  resolveProfileTheme,
} from "@/lib/profile-theme";

const PROFILE_BOTS_PAGE_SIZE = 12;

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
  theme: Record<string, unknown> | null;
  created_at: string;
  pronouns?: string | null;
  location?: string | null;
  website_url?: string | null;
  specialties?: string[] | null;
  status_message?: string | null;
  social_links?: Record<string, string> | null;
  active_profile_featured_bots?: Array<{
    sort_order: number;
    bot: BotPreview;
  }> | null;
  profile_badges?: ProfileBadgeRecord[] | null;
  _followers?: number;
  _following?: number;
}

interface BotPreview {
  id: string;
  name: string;
  shortDescription: string;
  tags: string[];
  rating: string;
  imageUrl: string | null;
  created_at: string;
}

interface CreatorPageSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  is_published: boolean;
}

interface WorldPreview {
  id: string;
  title: string;
  slug: string;
  kind: string;
  status: string;
  description: string;
  active_atlas_world_bots?: { bot_id: string }[];
}

interface FormPreview {
  id: string;
  title: string;
  description: string;
  shareable_link: string;
  is_active: boolean;
  sections: Array<Record<string, unknown>>;
  responses_count: number;
}

interface PublicProfileProps {
  profile: Profile;
  creatorPages: CreatorPageSummary[];
  bots: BotPreview[];
  worlds: WorldPreview[];
  forms: FormPreview[];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FollowButton({
  profileId,
  themeColor,
}: {
  profileId: string;
  themeColor: string;
}) {
  const readablePrimaryColor = getReadableProfileAccentColor(themeColor);
  const readablePrimaryMutedColor =
    getReadableProfileMutedAccentColor(themeColor);
  const primaryBorderTint = getProfileBorderTintColor(themeColor, 30);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    checkIsFollowing(profileId).then((r) => {
      if (mounted) {
        setIsFollowing(r.isFollowing);
        setChecked(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [profileId]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isFollowing) {
        const r = await unfollowUser(profileId);
        if (r.success) setIsFollowing(false);
        else toast.error(r.error || "Failed to unfollow");
      } else {
        const r = await followUser(profileId);
        if (r.success) setIsFollowing(true);
        else toast.error(r.error || "Failed to follow");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!checked) return null;

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      className="cursor-pointer transition-all"
      style={
        isFollowing
          ? { borderColor: primaryBorderTint, color: readablePrimaryMutedColor }
          : {
              backgroundColor: readablePrimaryColor,
              color: "var(--background)",
            }
      }
      onClick={handleToggle}
      disabled={loading}
    >
      {isFollowing ? (
        <>
          <Heart className="h-4 w-4 mr-1 fill-current" /> Following
        </>
      ) : (
        <>
          <UsersRound className="h-4 w-4 mr-1" /> Follow
        </>
      )}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Social icon map
// ---------------------------------------------------------------------------

const socialIconMap: Record<
  string,
  React.FC<{ className?: string; size?: number }>
> = {
  twitter: TwitterIcon,
  discord: DiscordIcon,
  github: GithubIcon,
  tiktok: TiktokIcon,
  youtube: YoutubeIcon,
  twitch: TwitchIcon,
  website: WebsiteIcon,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PublicProfile({
  profile,
  creatorPages,
  bots,
  worlds,
  forms,
}: PublicProfileProps) {
  const [botDetailBot, setBotDetailBot] = useState<any>(null);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<
    "followers" | "following"
  >("followers");
  const [botsPage, setBotsPage] = useState(0);

  const displayName = profile.display_name || profile.username || "User";
  const resolvedTheme = resolveProfileTheme(
    (profile.theme as Record<string, unknown>) || {},
  );
  const {
    primaryColor,
    accentColor,
    avatarBorderColor,
    cardStyle,
    layout,
    showBadges,
    showFeatured,
    showBots,
    showCreatorPages,
    showWorlds,
    showForms,
  } = resolvedTheme;
  const readablePrimaryColor = getReadableProfileAccentColor(primaryColor);
  const readablePrimaryMutedColor =
    getReadableProfileMutedAccentColor(primaryColor);
  const readableAccentColor = getReadableProfileAccentColor(
    accentColor,
    "medium",
  );
  const accentBorderTint = getProfileBorderTintColor(accentColor, 30);
  const primaryBorderTint = getProfileBorderTintColor(primaryColor, 30);
  const primarySoftTint = getProfileBackgroundTintColor(primaryColor, 10);
  const accentSoftTint = getProfileBackgroundTintColor(accentColor, 18);
  const profileBackground = getProfileBackgroundStyles(
    resolvedTheme.profileBackground,
    primaryColor,
    accentColor,
  );
  const profileFontStyle = getProfileFontStyle(resolvedTheme.fontFamily);
  const collectionGridClass = getProfileGridClass(layout);
  const cardClass = getProfileCardClass(cardStyle);
  const sectionCardStyle =
    cardStyle !== "minimal"
      ? ({ borderColor: accentBorderTint } as const)
      : undefined;
  const themeColor = primaryColor;
  const socialLinks = profile.social_links || {};
  const badges = profile.profile_badges || [];
  const featuredBots = (profile.active_profile_featured_bots || [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((relation: any) => {
      const rawBot = relation.bot;
      if (!rawBot) return null;

      // 1. Evaluate the privacy flag
      const isHidden = rawBot.hide_sensitive_fields === true;

      // 2. Map snake_case to camelCase and enforce privacy masking
      return {
        ...rawBot, // Keep raw properties just in case, but override specific ones
        id: rawBot.id,
        name: rawBot.name,
        rating: rawBot.rating,
        tags: rawBot.tags || [],

        // Fix the image rendering issue
        imageUrl: rawBot.image_url,

        // Enforce the hide_sensitive_fields rule
        personality: isHidden ? "" : rawBot.personality,
        firstMessage: isHidden
          ? ""
          : rawBot.firstMessage || rawBot.first_message,
        scenario: isHidden ? "" : rawBot.scenario,
        exampleDialogues: isHidden
          ? ""
          : rawBot.exampleDialogues || rawBot.example_dialogues,

        // Ensure the frontend flag matches the DB flag
        hideSensitiveFields: isHidden,
      };
    })
    .filter(Boolean);
  const specialtiesList = profile.specialties || [];
  const hasSocialLinks = Object.values(socialLinks).some((v) => v && v.trim());
  const totalBotPages = Math.max(
    1,
    Math.ceil(bots.length / PROFILE_BOTS_PAGE_SIZE),
  );

  const paginatedBots = bots.slice(
    botsPage * PROFILE_BOTS_PAGE_SIZE,
    (botsPage + 1) * PROFILE_BOTS_PAGE_SIZE,
  );

  const botsRangeStart =
    bots.length === 0 ? 0 : botsPage * PROFILE_BOTS_PAGE_SIZE + 1;
  const botsRangeEnd = Math.min(
    (botsPage + 1) * PROFILE_BOTS_PAGE_SIZE,
    bots.length,
  );

  useEffect(() => {
    if (botsPage > totalBotPages - 1) {
      setBotsPage(Math.max(0, totalBotPages - 1));
    }
  }, [botsPage, totalBotPages]);

  return (
    <ScrollArea className="h-screen w-full overflow-hidden bg-background">
      <div
        className={cn("min-h-screen", profileBackground.className)}
        style={{ ...profileBackground.style, ...profileFontStyle }}
      >
        {/* Banner */}
        <div
          className="relative z-0 h-40 sm:h-56 w-full"
          style={{
            background: profile.banner_url
              ? `url(${profile.banner_url}) center/cover no-repeat`
              : `linear-gradient(135deg, ${themeColor}33, ${themeColor}11, transparent)`,
          }}
        >
          <div className="absolute inset-x-0 top-15 sm:top-40 z-10 flex justify-end p-3 sm:p-4">
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <FollowButton profileId={profile.id} themeColor={themeColor} />
              <Link href="/" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full cursor-pointer border-background/70 bg-background/80 backdrop-blur-sm sm:w-auto"
                  style={{
                    borderColor: primaryBorderTint,
                    color: readablePrimaryMutedColor,
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 sm:pt-8 pb-20">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-10">
            {/* Avatar */}
            <div
              className="h-24 w-24 sm:h-32 sm:w-32 shrink-0 rounded-2xl bg-card shadow-2xl overflow-hidden"
              style={{
                borderWidth: "4px",
                borderStyle: "solid",
                borderColor: avatarBorderColor,
              }}
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="h-full w-full flex items-center justify-center"
                  style={{ backgroundColor: primarySoftTint }}
                >
                  <span
                    className="text-3xl font-bold"
                    style={{ color: readablePrimaryColor }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-2">
              {/* Name + pronouns */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {displayName}
                </h1>
                {profile.pronouns && profile.pronouns !== "none" && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {profile.pronouns}
                  </Badge>
                )}
              </div>
              {profile.username && (
                <p
                  className="text-sm mt-0.5"
                  style={{ color: readablePrimaryMutedColor }}
                >
                  @{profile.username}
                </p>
              )}
              {profile.status_message && (
                <p className="text-sm italic text-muted-foreground mt-1">
                  &ldquo;{profile.status_message}&rdquo;
                </p>
              )}

              {/* Follow counts */}
              {(profile._followers !== undefined ||
                profile._following !== undefined) && (
                <div className="flex items-center gap-5 mt-2 text-sm">
                  <button
                    className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setFollowModalTab("followers");
                      setFollowModalOpen(true);
                    }}
                  >
                    <p
                      className="text-lg font-bold"
                      style={{ color: readablePrimaryColor }}
                    >
                      {profile._followers || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Followers</p>
                  </button>
                  <button
                    className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setFollowModalTab("following");
                      setFollowModalOpen(true);
                    }}
                  >
                    <p
                      className="text-lg font-bold"
                      style={{ color: readablePrimaryColor }}
                    >
                      {profile._following || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Following</p>
                  </button>
                </div>
              )}

              {/* Tagline */}
              {profile.tagline && (
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                  {profile.tagline}
                </p>
              )}

              {/* Bio */}
              {profile.bio && (
                <div
                  className="mt-3 text-sm text-muted-foreground leading-relaxed rendered-markdown"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(profile.bio),
                  }}
                />
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-muted-foreground">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {profile.location}
                  </span>
                )}
                {profile.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:underline"
                    style={{ color: readablePrimaryMutedColor }}
                  >
                    <Globe className="h-3 w-3" />
                    {(() => {
                      try {
                        return new URL(profile.website_url).hostname;
                      } catch {
                        return profile.website_url;
                      }
                    })()}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
                {profile.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Joined{" "}
                    {new Date(profile.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>

              {/* Social links */}
              {hasSocialLinks && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {Object.entries(socialLinks).map(([key, value]) => {
                    if (!value || !value.trim()) return null;
                    const Icon = socialIconMap[key] || WebsiteIcon;
                    const isUrl = value.startsWith("http");
                    return isUrl ? (
                      <a
                        key={key}
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Badge
                          variant="outline"
                          className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            borderColor: primaryBorderTint,
                            color: readablePrimaryMutedColor,
                          }}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Badge>
                      </a>
                    ) : (
                      <Badge
                        key={key}
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: primaryBorderTint }}
                      >
                        <Icon className="h-3 w-3 mr-1" /> {value}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Specialties */}
              {specialtiesList.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Specialties
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {specialtiesList.map((s) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="text-xs"
                        style={{
                          backgroundColor: accentSoftTint,
                          color: readableAccentColor,
                        }}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Featured Bots */}
          {showFeatured && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-3">
                <Star
                  className="h-5 w-5"
                  style={{ color: readablePrimaryColor }}
                />
                <h2 className="text-lg font-semibold">Featured Bots</h2>
                <Badge variant="outline">{featuredBots.length}</Badge>
              </div>
              {featuredBots.length > 0 ? (
                <div className="space-y-2.5">
                  {featuredBots.map((bot) => (
                    <ProfileFeaturedBotListCard
                      key={bot!.id}
                      bot={bot!}
                      cardStyle={cardStyle}
                      accentColor={accentColor}
                      onClick={() => setBotDetailBot(bot)}
                    />
                  ))}
                </div>
              ) : (
                <ProfileSectionEmpty
                  icon={<Star className="h-5 w-5" />}
                  iconColor={themeColor}
                  title="No featured bots yet"
                  description="Pick bots in the editor to highlight them here and make the profile feel more complete."
                />
              )}
            </div>
          )}

          <ProfileBadgesSection
            badges={badges}
            themeColor={themeColor}
            showBadges={showBadges}
            className="mt-4 mb-14"
            emptyClassName="rounded-lg border border-dashed bg-card/40 px-5 py-7"
          />

          {/* Bots */}
          {showBots && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Bot
                    className="h-5 w-5"
                    style={{ color: readablePrimaryColor }}
                  />
                  <h2 className="text-lg font-semibold">Bots</h2>
                  <Badge variant="outline">{bots.length}</Badge>
                </div>
                {bots.length > 0 ? (
                  <>
                    <div className={collectionGridClass}>
                      {paginatedBots.map((bot) => (
                        <ProfileBotGridCard
                          key={bot.id}
                          bot={bot}
                          cardStyle={cardStyle}
                          layout={layout}
                          accentColor={accentColor}
                          onClick={() => setBotDetailBot(bot)}
                        />
                      ))}
                    </div>
                    {totalBotPages > 1 && (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Showing {botsRangeStart}-{botsRangeEnd} of{" "}
                          {bots.length} bots
                        </p>
                        <Pagination className="w-auto">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (botsPage > 0) {
                                    setBotsPage((prev) => prev - 1);
                                  }
                                }}
                                className={cn(
                                  "cursor-pointer",
                                  botsPage === 0 &&
                                    "pointer-events-none opacity-50",
                                )}
                              />
                            </PaginationItem>
                            {Array.from(
                              { length: Math.min(totalBotPages, 5) },
                              (_, i) => {
                                const page =
                                  totalBotPages <= 5
                                    ? i
                                    : Math.max(
                                        0,
                                        Math.min(
                                          botsPage - 2,
                                          totalBotPages - 5,
                                        ),
                                      ) + i;
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      href="#"
                                      isActive={page === botsPage}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setBotsPage(page);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      {page + 1}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              },
                            )}
                            <PaginationItem>
                              <PaginationNext
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (botsPage < totalBotPages - 1) {
                                    setBotsPage((prev) => prev + 1);
                                  }
                                }}
                                className={cn(
                                  "cursor-pointer",
                                  botsPage >= totalBotPages - 1 &&
                                    "pointer-events-none opacity-50",
                                )}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                ) : (
                  <ProfileSectionEmpty
                    icon={<Bot className="h-5 w-5" />}
                    iconColor={themeColor}
                    title="No bots published yet"
                  />
                )}
              </div>
              <hr
                className="border-t"
                style={{ borderColor: accentBorderTint }}
              />
            </div>
          )}

          {/* Creator Pages */}
          {showCreatorPages && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-3">
                <AppWindow
                  className="h-5 w-5"
                  style={{ color: readablePrimaryColor }}
                />
                <h2 className="text-lg font-semibold">Creator Pages</h2>
                <Badge variant="outline">{creatorPages.length}</Badge>
              </div>
              {creatorPages.length > 0 ? (
                <div className={collectionGridClass}>
                  {creatorPages.map((page) => (
                    <Link key={page.id} href={`/page/${page.slug}`}>
                      <div
                        className={cn(
                          cardClass,
                          "cursor-pointer h-full",
                          layout === "list" && "sm:flex sm:flex-col",
                        )}
                        style={sectionCardStyle}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate">
                            {page.title || "Untitled"}
                          </p>
                          <Badge
                            variant={
                              page.is_published ? "default" : "secondary"
                            }
                            className="text-[10px] shrink-0"
                          >
                            {page.is_published ? "Live" : "Draft"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {page.description || "No description"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <ProfileSectionEmpty
                  icon={<AppWindow className="h-5 w-5" />}
                  iconColor={themeColor}
                  title="No creator pages yet"
                />
              )}
            </div>
          )}

          {/* Worlds */}
          {showWorlds && (
            <div className="space-y-4 mt-12">
              <div className="flex items-center gap-3">
                <Globe
                  className="h-5 w-5"
                  style={{ color: readablePrimaryColor }}
                />
                <h2 className="text-lg font-semibold">Worlds</h2>
                <Badge variant="outline">{worlds.length}</Badge>
              </div>
              {worlds.length > 0 ? (
                <div className={collectionGridClass}>
                  {worlds.map((world) => (
                    <div
                      key={world.id}
                      className={cardClass}
                      style={sectionCardStyle}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="secondary"
                          className="text-[10px] capitalize"
                        >
                          {world.kind}
                        </Badge>
                        <p className="text-sm font-medium truncate">
                          {world.title}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {world.description || "No description"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {world.active_atlas_world_bots?.length || 0} bots
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <ProfileSectionEmpty
                  icon={<Globe className="h-5 w-5" />}
                  iconColor={themeColor}
                  title="No worlds created yet"
                />
              )}
            </div>
          )}

          {/* Modals */}
          <BotDetailModal
            open={!!botDetailBot}
            onOpenChange={(v) => {
              if (!v) setBotDetailBot(null);
            }}
            bot={botDetailBot}
          />
          <FollowListModal
            open={followModalOpen}
            onOpenChange={setFollowModalOpen}
            userId={profile.id}
            tab={followModalTab}
            themeColor={themeColor}
          />

          {/* Forms */}
          {showForms && (
            <div className="space-y-4 mt-12">
              <div className="flex items-center gap-3">
                <FileText
                  className="h-5 w-5"
                  style={{ color: readablePrimaryColor }}
                />
                <h2 className="text-lg font-semibold">Forms</h2>
                <Badge variant="outline">{forms.length}</Badge>
              </div>
              {forms.length > 0 ? (
                <div
                  className={cn(collectionGridClass, "justify-items-stretch")}
                >
                  {forms.map((form) => (
                    <Link
                      href={`/form/${form.shareable_link}`}
                      target="_blank"
                      key={form.id}
                      rel="noopener noreferrer"
                      className="block h-full w-full"
                    >
                      <div
                        className={cn(cardClass, "h-full w-full")}
                        style={sectionCardStyle}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p
                            className="text-sm font-medium truncate rendered-markdown"
                            style={{ color: readablePrimaryMutedColor }}
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(form.title),
                            }}
                          />
                          <Badge
                            variant={form.is_active ? "default" : "secondary"}
                            className="text-[10px] shrink-0"
                          >
                            {form.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p
                          className="text-xs text-muted-foreground line-clamp-2 rendered-markdown"
                          dangerouslySetInnerHTML={{
                            __html: form.description
                              ? renderMarkdown(form.description)
                              : "No description",
                          }}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {form.responses_count} responses ·{" "}
                          {form.sections.length} sections
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <ProfileSectionEmpty
                  icon={<FileText className="h-5 w-5" />}
                  iconColor={themeColor}
                  title="No forms yet"
                />
              )}
            </div>
          )}

          {/* Footer */}
          <div
            className="mt-20 pt-8 border-t text-center text-xs text-muted-foreground"
            style={{ borderColor: accentBorderTint }}
          >
            <p>
              Powered by{" "}
              <Link
                href="/"
                className="hover:underline"
                style={{ color: readablePrimaryMutedColor }}
              >
                JanitorForge
              </Link>{" "}
              — Bot Creator Toolkit
            </p>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
