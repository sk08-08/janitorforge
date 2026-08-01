// ============================================================================
// JanitorForge - Profile View
// Rich profile display with banner, avatar, badges, social links, stats
// Fully responsive with improved visual hierarchy
// ============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { renderMarkdown } from "@/lib/markdown";
import {
  Pencil,
  MapPin,
  Globe,
  Calendar,
  Loader2,
  Award,
  Star,
  ExternalLink,
  MessageCircle,
  Users,
  Heart,
  UserRound,
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
import {
  getOwnProfile,
  getFollowCounts,
  followUser,
  unfollowUser,
  checkIsFollowing,
} from "@/app/actions/profile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProfileBadgesSection } from "./profile-badges";
import { ProfileCompletenessCard } from "./profile-completeness";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface ProfileViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

interface ProfileBadge {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  awardedAt?: string;
}

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

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

function AvatarDisplay({
  url,
  name,
  color,
  size = "md",
}: {
  url?: string | null;
  name?: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const [error, setError] = useState(false);
  const sizeClasses = {
    sm: "h-14 w-14 border-2",
    md: "h-20 w-20 border-4",
    lg: "h-24 w-24 border-4",
  };
  const iconSizes = { sm: "h-6 w-6", md: "h-8 w-8", lg: "h-10 w-10" };

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden shadow-lg",
        sizeClasses[size],
      )}
      style={{ borderColor: color || "hsl(var(--background))" }}
    >
      {url && !error ? (
        <img
          src={url}
          alt={name || "Avatar"}
          className="h-full w-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <div
          className="h-full w-full flex items-center justify-center"
          style={{ backgroundColor: `${color}22` }}
        >
          <UserRound className={iconSizes[size]} style={{ color }} />
        </div>
      )}
    </div>
  );
}

function BannerDisplay({
  url,
  color,
  height = "h-28 sm:h-36",
}: {
  url?: string | null;
  color: string;
  height?: string;
}) {
  const [error, setError] = useState(false);

  return (
    <div
      className={cn("w-full relative", height)}
      style={{
        background:
          url && !error
            ? `url(${url}) center/cover no-repeat`
            : `linear-gradient(135deg, ${color}88, ${color}22, ${color}44)`,
      }}
    >
      {url && (
        <img
          src={url}
          alt=""
          className="hidden"
          onError={() => setError(true)}
        />
      )}
      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-linear-to-t from-background/20 to-transparent" />
    </div>
  );
}

function SocialLinkButton({
  platform,
  value,
}: {
  platform: string;
  value: string;
}) {
  const Icon = socialIconMap[platform] || Globe;
  const isUrl = value.startsWith("http");
  const label = platform.charAt(0).toUpperCase() + platform.slice(1);

  const content = (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
        "hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {isUrl ? label : value}
    </div>
  );

  if (isUrl) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return content;
}

function StatBox({
  value,
  label,
  color,
  icon: Icon,
}: {
  value: number | string;
  label: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border p-3 bg-card/50">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="text-lg font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground text-center">{label}</p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// ProfileView (Own Profile Dialog)
// ----------------------------------------------------------------------------

export function ProfileView({ open, onOpenChange, onEdit }: ProfileViewProps) {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [followCounts, setFollowCounts] = useState({
    followers: 0,
    following: 0,
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOwnProfile();
      if (result.success && result.profile) {
        setProfile(result.profile);
        const counts = await getFollowCounts(result.profile.id);
        setFollowCounts(counts);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadProfile();
  }, [open, loadProfile]);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-lg">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!profile) return null;

  const p = profile as Record<string, unknown>;
  const theme = (p.theme as Record<string, unknown>) || {};
  const primaryColor = (theme.primaryColor as string) || "#7c3aed";
  const avatarBorderColor = (theme.avatarBorderColor as string) || primaryColor;
  const socialLinks = (p.social_links as Record<string, string>) || {};
  const badges = (p.profile_badges as ProfileBadge[]) || [];
  const specialtiesList = (p.specialties as string[]) || [];
  const showStats = theme.showStats !== false;
  const showBadges = theme.showBadges !== false;
  const hasSocialLinks = Object.values(socialLinks).some((v) => v && v.trim());
  const completeness = (p.profile_completeness as number) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Banner */}
        <BannerDisplay
          url={p.banner_url as string}
          color={primaryColor}
          height="h-32 sm:h-40"
        />

        {/* Edit button */}
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-3 right-3 cursor-pointer bg-background/80 backdrop-blur-sm z-10"
          onClick={() => {
            onOpenChange(false);
            onEdit();
          }}
        >
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Edit
        </Button>

        {/* Avatar overlapping banner */}
        <div className="px-5 -mt-12 relative z-10">
          <AvatarDisplay
            url={p.avatar_url as string}
            name={(p.display_name as string) || "Avatar"}
            color={avatarBorderColor}
            size="lg"
          />
        </div>

        {/* Profile Content */}
        <div className="px-5 pt-3 pb-5 space-y-4">
          {/* Name, Pronouns, Handle */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">
                {(p.display_name as string) || "Unnamed Creator"}
              </h2>
              {(p.pronouns as string) && (p.pronouns as string) !== "none" && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {p.pronouns as string}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              @{(p.slug as string) || (p.username as string) || "unknown"}
            </p>
            {(p.status_message as string) && (
              <p className="text-sm mt-1.5 italic text-muted-foreground flex items-start gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                &ldquo;{p.status_message as string}&rdquo;
              </p>
            )}
          </div>

          {/* Follow counts */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <UsersRound className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{followCounts.followers}</span>
              <span className="text-muted-foreground text-xs">followers</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{followCounts.following}</span>
              <span className="text-muted-foreground text-xs">following</span>
            </div>
          </div>

          {/* Tagline */}
          {(p.tagline as string) && (
            <p className="text-sm font-medium">{p.tagline as string}</p>
          )}

          {/* Bio */}
          {(p.bio as string) && (
            <div
              className="text-sm text-muted-foreground leading-relaxed rendered-markdown"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(p.bio as string),
              }}
            />
          )}

          {/* Meta info row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {(p.location as string) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {p.location as string}
              </span>
            )}
            {(p.website_url as string) && (
              <a
                href={p.website_url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Globe className="h-3 w-3" />
                {(() => {
                  try {
                    return new URL(p.website_url as string).hostname;
                  } catch {
                    return p.website_url as string;
                  }
                })()}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            {(p.created_at as string) && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Joined{" "}
                {new Date(p.created_at as string).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          {/* Social Links */}
          {hasSocialLinks && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(socialLinks).map(([key, value]) => {
                if (!value || !value.trim()) return null;
                return (
                  <SocialLinkButton key={key} platform={key} value={value} />
                );
              })}
            </div>
          )}

          {/* Specialties */}
          {specialtiesList.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Specialties
              </p>
              <div className="flex flex-wrap gap-1.5">
                {specialtiesList.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: `${primaryColor}15`,
                      color: primaryColor,
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
            themeColor={primaryColor}
            showBadges={showBadges}
            className="space-y-1.5"
            emptyClassName="rounded-lg border border-dashed bg-muted/20 px-4 py-5"
          />

          {/* Stats */}
          {showStats && completeness < 100 && (
            <div className="grid grid-cols-3 gap-2">
              <StatBox
                value={`${completeness}%`}
                label="Complete"
                color={primaryColor}
                icon={Star}
              />
              <StatBox
                value={followCounts.followers}
                label="Followers"
                color={primaryColor}
                icon={Users}
              />
              <StatBox
                value={badges.length}
                label="Badges"
                color={primaryColor}
                icon={Award}
              />
            </div>
          )}

          <ProfileCompletenessCard
            profile={p}
            completeness={completeness}
            themeColor={primaryColor}
            hideNudge={
              theme.hideCompletenessNudge === true ||
              theme.hideCompletenessNudge === "true"
            }
            onEdit={() => {
              onOpenChange(false);
              onEdit();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Public Profile Card (for displaying other users' profiles)
// ============================================================================

interface PublicProfileCardProps {
  profile: Record<string, unknown>;
  currentUserId?: string | null;
  onFollowChange?: () => void;
}

export function PublicProfileCard({
  profile,
  currentUserId,
  onFollowChange,
}: PublicProfileCardProps) {
  const p = profile;
  const theme = (p.theme as Record<string, unknown>) || {};
  const primaryColor = (theme.primaryColor as string) || "#7c3aed";
  const avatarBorderColor = (theme.avatarBorderColor as string) || primaryColor;
  const socialLinks = (p.social_links as Record<string, string>) || {};
  const badges = (p.profile_badges as ProfileBadge[]) || [];
  const specialtiesList = (p.specialties as string[]) || [];
  const showBadges = theme.showBadges !== false;
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });

  const isOwn = currentUserId === p.id;

  useEffect(() => {
    if (!p.id || isOwn) return;
    checkIsFollowing(p.id as string).then((r) => setIsFollowing(r.isFollowing));
    getFollowCounts(p.id as string).then(setCounts);
  }, [p.id, isOwn]);

  const handleFollow = async () => {
    if (!p.id) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(p.id as string);
        setIsFollowing(false);
        setCounts((c) => ({ ...c, followers: c.followers - 1 }));
      } else {
        await followUser(p.id as string);
        setIsFollowing(true);
        setCounts((c) => ({ ...c, followers: c.followers + 1 }));
      }
      onFollowChange?.();
    } catch {
      toast.error("Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const hasSocialLinks = Object.values(socialLinks).some((v) => v && v.trim());

  return (
    <div className="rounded-xl border overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 group">
      {/* Banner */}
      <BannerDisplay
        url={p.banner_url as string}
        color={primaryColor}
        height="h-24"
      />

      <div className="px-4 pb-4 -mt-8 relative z-10">
        {/* Avatar */}
        <AvatarDisplay
          url={p.avatar_url as string}
          name={(p.display_name as string) || "Avatar"}
          color={avatarBorderColor}
          size="md"
        />

        {/* Name & handle */}
        <div className="mt-2">
          <h3 className="text-sm font-bold truncate">
            {(p.display_name as string) || "Unnamed"}
          </h3>
          <p className="text-xs text-muted-foreground">
            @{(p.slug as string) || (p.username as string) || "?"}
          </p>
        </div>

        {/* Tagline */}
        {(p.tagline as string) && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
            {p.tagline as string}
          </p>
        )}

        {/* Specialties */}
        {specialtiesList.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {specialtiesList.slice(0, 3).map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
                style={{
                  backgroundColor: `${primaryColor}10`,
                  color: primaryColor,
                }}
              >
                {s}
              </Badge>
            ))}
            {specialtiesList.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{specialtiesList.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <UsersRound className="h-3 w-3" />
            <span className="font-medium text-foreground">
              {counts.followers}
            </span>{" "}
            followers
          </span>
          {showBadges && badges.length > 0 && (
            <span className="flex items-center gap-1">
              <Award className="h-3 w-3" />
              {badges.length}
            </span>
          )}
        </div>

        {/* Social links (compact) */}
        {hasSocialLinks && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(socialLinks)
              .filter(([, v]) => v && v.trim())
              .slice(0, 4)
              .map(([key]) => {
                const Icon = socialIconMap[key] || Globe;
                return (
                  <div
                    key={key}
                    className="h-6 w-6 rounded-full bg-muted flex items-center justify-center"
                    title={key}
                  >
                    <Icon className="h-3 w-3 text-muted-foreground" />
                  </div>
                );
              })}
          </div>
        )}

        {/* Follow button (for other users) */}
        {!isOwn && currentUserId && (
          <Button
            variant={isFollowing ? "outline" : "default"}
            size="sm"
            className="mt-3 w-full cursor-pointer text-xs h-8"
            onClick={handleFollow}
            disabled={followLoading}
          >
            {followLoading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : isFollowing ? (
              <>
                <Heart className="h-3 w-3 mr-1 fill-current" />
                Following
              </>
            ) : (
              <>
                <Heart className="h-3 w-3 mr-1" />
                Follow
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
