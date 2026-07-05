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
  Layout,
  ArrowLeft,
  Star,
  MapPin,
  Heart,
  UsersRound,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ProfileBadgesSection } from "./profile-badges";

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
  profile_badges?: Array<{
    id: string;
    label: string;
    icon?: string;
    color?: string;
  }> | null;
  _followers?: number;
  _following?: number;
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
  bot_ids: string[];
}

interface PublicProfileProps {
  profile: Profile;
  creatorPages: CreatorPageSummary[];
  bots: BotPreview[];
  worlds: WorldPreview[];
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
          ? { borderColor: `${themeColor}44`, color: themeColor }
          : { background: themeColor }
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

function BotCard({
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
      <div className="relative aspect-16/10 w-full overflow-hidden bg-muted">
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
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/10 via-primary/5 to-transparent">
            <Bot className="h-16 w-16 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/60 to-transparent" />
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
}: PublicProfileProps) {
  const [botDetailBot, setBotDetailBot] = useState<any>(null);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<
    "followers" | "following"
  >("followers");

  const displayName = profile.display_name || profile.username || "User";
  const themeColor =
    (profile.theme as Record<string, string>)?.primaryColor || "#7c3aed";
  const socialLinks = profile.social_links || {};
  const badges = profile.profile_badges || [];
  const specialtiesList = profile.specialties || [];
  const hasSocialLinks = Object.values(socialLinks).some((v) => v && v.trim());

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div
        className="h-40 sm:h-56 w-full"
        style={{
          background: profile.banner_url
            ? `url(${profile.banner_url}) center/cover no-repeat`
            : `linear-gradient(135deg, ${themeColor}33, ${themeColor}11, transparent)`,
        }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 -mt-16 sm:-mt-20 pb-20">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-10">
          {/* Avatar */}
          <div
            className="h-24 w-24 sm:h-32 sm:w-32 shrink-0 rounded-2xl bg-card shadow-2xl overflow-hidden"
            style={{
              borderWidth: "4px",
              borderStyle: "solid",
              borderColor: themeColor,
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
                style={{ backgroundColor: `${themeColor}22` }}
              >
                <span
                  className="text-3xl font-bold"
                  style={{ color: themeColor }}
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
                style={{ color: `${themeColor}aa` }}
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
                    style={{ color: themeColor }}
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
                    style={{ color: themeColor }}
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
              <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {profile.bio}
              </p>
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
                  style={{ color: themeColor }}
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
                          borderColor: `${themeColor}44`,
                          color: themeColor,
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
                      style={{ borderColor: `${themeColor}44` }}
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
                        backgroundColor: `${themeColor}15`,
                        color: themeColor,
                      }}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <ProfileBadgesSection
              badges={badges}
              themeColor={themeColor}
              showBadges={true}
              className="mt-4"
              emptyClassName="rounded-lg border border-dashed bg-card/40 px-5 py-7"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <FollowButton profileId={profile.id} themeColor={themeColor} />
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                style={{ borderColor: `${themeColor}44`, color: themeColor }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
          </div>
        </div>

        {/* Bots */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5" style={{ color: themeColor }} />
              <h2 className="text-lg font-semibold">Bots</h2>
              <Badge variant="outline">{bots.length}</Badge>
            </div>
            {bots.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {bots.map((bot) => (
                  <BotCard
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
                  No bots published yet.
                </CardContent>
              </Card>
            )}
          </div>
          <hr className="border-t" style={{ borderColor: `${themeColor}33` }} />

          {/* Creator Pages */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Layout className="h-5 w-5" style={{ color: themeColor }} />
              <h2 className="text-lg font-semibold">Creator Pages</h2>
              <Badge variant="outline">{creatorPages.length}</Badge>
            </div>
            {creatorPages.length > 0 ? (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {creatorPages.map((page) => (
                  <Link key={page.id} href={`/page/${page.slug}`}>
                    <div className="rounded-lg border p-3 transition-all hover:border-primary/30 hover:shadow-md cursor-pointer h-full">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">
                          {page.title || "Untitled"}
                        </p>
                        <Badge
                          variant={page.is_published ? "default" : "secondary"}
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
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Layout className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No creator pages yet
                </p>
              </div>
            )}
          </div>
          <hr className="border-t" style={{ borderColor: `${themeColor}33` }} />

          {/* Worlds */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5" style={{ color: themeColor }} />
              <h2 className="text-lg font-semibold">Worlds</h2>
              <Badge variant="outline">{worlds.length}</Badge>
            </div>
            {worlds.length > 0 ? (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {worlds.map((world) => (
                  <div
                    key={world.id}
                    className="rounded-lg border p-3 transition-all hover:border-primary/30 hover:shadow-md"
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
                      {world.bot_ids?.length || 0} bots
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Globe className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No worlds created yet
                </p>
              </div>
            )}
          </div>
        </div>

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
