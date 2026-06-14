// ============================================================================
// JanitorForge - Profile View
// Rich profile display with banner, avatar, badges, social links, stats
// ============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
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
  Bot,
  FileText,
  Share2,
  Twitter,
  Heart,
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
  const socialLinks = (p.social_links as Record<string, string>) || {};
  const badges = (p.profile_badges as ProfileBadge[]) || [];
  const specialtiesList = (p.specialties as string[]) || [];
  const showStats = theme.showStats !== false;
  const showBadges = theme.showBadges !== false;
  const showFeatured = theme.showFeatured !== false;

  const hasSocialLinks = Object.values(socialLinks).some((v) => v && v.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Banner */}
        <div
          className="h-28 sm:h-36 w-full rounded-t-lg relative"
          style={{
            background: p.banner_url
              ? `url(${p.banner_url}) center/cover no-repeat`
              : `linear-gradient(135deg, ${primaryColor}88, ${primaryColor}33)`,
          }}
        >
          {/* Edit button overlay */}
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-3 right-3 cursor-pointer bg-background/80 backdrop-blur-sm"
            onClick={() => {
              onOpenChange(false);
              onEdit();
            }}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        </div>

        {/* Avatar - overlapping banner */}
        <div className="px-5 -mt-10 relative z-10">
          <div
            className="h-20 w-20 rounded-full border-4 border-background overflow-hidden shadow-lg"
            style={{ borderColor: "hsl(var(--background))" }}
          >
            {p.avatar_url ? (
              <img
                src={p.avatar_url as string}
                alt={(p.display_name as string) || "Avatar"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="h-full w-full flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}22` }}
              >
                <User className="h-8 w-8" style={{ color: primaryColor }} />
              </div>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="px-5 pt-3 pb-5 space-y-4">
          {/* Name & Handle */}
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
              <p className="text-sm mt-1 italic text-muted-foreground">
                &ldquo;{p.status_message as string}&rdquo;
              </p>
            )}
          </div>

          {/* Follow counts */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{followCounts.followers}</span>
              <span className="text-muted-foreground">followers</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{followCounts.following}</span>
              <span className="text-muted-foreground">following</span>
            </div>
          </div>

          {/* Tagline */}
          {(p.tagline as string) && (
            <p className="text-sm">{p.tagline as string}</p>
          )}

          {/* Bio */}
          {(p.bio as string) && (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {p.bio as string}
            </div>
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
                {new URL(p.website_url as string).hostname}
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
            <div className="flex flex-wrap gap-2">
              {Object.entries(socialLinks).map(([key, value]) => {
                if (!value || !value.trim()) return null;
                const Icon = socialIconMap[key] || Globe;
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
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Badge>
                  </a>
                ) : (
                  <Badge key={key} variant="outline">
                    <Icon className="h-3 w-3 mr-1" />
                    {value}
                  </Badge>
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

          {/* Badges */}
          {showBadges && badges.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Badges
              </p>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1"
                    style={{
                      borderColor: badge.color || primaryColor,
                    }}
                  >
                    <Award
                      className="h-3.5 w-3.5"
                      style={{ color: badge.color || primaryColor }}
                    />
                    <span className="text-xs font-medium">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          {showStats && (
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Activity
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p
                    className="text-lg font-bold"
                    style={{ color: primaryColor }}
                  >
                    {(p.profile_completeness as number) || 0}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Profile Complete
                  </p>
                </div>
                <div>
                  <p
                    className="text-lg font-bold"
                    style={{ color: primaryColor }}
                  >
                    {followCounts.followers}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Followers</p>
                </div>
                <div>
                  <p
                    className="text-lg font-bold"
                    style={{ color: primaryColor }}
                  >
                    {badges.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Badges</p>
                </div>
              </div>
            </div>
          )}

          {/* Profile completeness nudge */}
          {(p.profile_completeness as number) < 100 && (
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground text-center">
              Your profile is{" "}
              <span className="font-semibold">
                {(p.profile_completeness as number) || 0}%
              </span>{" "}
              complete.
              <button
                className="ml-1 text-primary hover:underline cursor-pointer"
                onClick={() => {
                  onOpenChange(false);
                  onEdit();
                }}
              >
                Complete your profile
              </button>
            </div>
          )}
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
    <div className="rounded-xl border overflow-hidden">
      {/* Banner */}
      <div
        className="h-24 w-full"
        style={{
          background: p.banner_url
            ? `url(${p.banner_url}) center/cover no-repeat`
            : `linear-gradient(135deg, ${primaryColor}88, ${primaryColor}33)`,
        }}
      />

      <div className="px-4 pb-4 -mt-8 relative z-10">
        {/* Avatar */}
        <div
          className="h-16 w-16 rounded-full border-3 border-background overflow-hidden shadow-md mb-2"
          style={{ borderColor: "hsl(var(--background))" }}
        >
          {p.avatar_url ? (
            <img
              src={p.avatar_url as string}
              alt={(p.display_name as string) || "Avatar"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}22` }}
            >
              <User className="h-6 w-6" style={{ color: primaryColor }} />
            </div>
          )}
        </div>

        {/* Name */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold truncate">
              {(p.display_name as string) || "Unnamed"}
            </h3>
            <p className="text-xs text-muted-foreground">
              @{((p.slug as string) || (p.username as string)) ?? "unknown"}
            </p>
          </div>
          {!isOwn && currentUserId && (
            <Button
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              className="cursor-pointer shrink-0"
              onClick={handleFollow}
              disabled={followLoading}
            >
              {isFollowing ? (
                <>
                  <Heart className="h-3.5 w-3.5 mr-1 fill-current" /> Following
                </>
              ) : (
                <>
                  <Users className="h-3.5 w-3.5 mr-1" /> Follow
                </>
              )}
            </Button>
          )}
        </div>

        {(p.tagline as string) && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {p.tagline as string}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{counts.followers}</strong>{" "}
            followers
          </span>
          <span>
            <strong className="text-foreground">{counts.following}</strong>{" "}
            following
          </span>
        </div>

        {/* Specialties */}
        {specialtiesList.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {specialtiesList.slice(0, 3).map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="text-[10px]"
                style={{
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor,
                }}
              >
                {s}
              </Badge>
            ))}
            {specialtiesList.length > 3 && (
              <Badge variant="secondary" className="text-[10px]">
                +{specialtiesList.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Social links */}
        {hasSocialLinks && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(socialLinks)
              .filter(([, v]) => v && v.trim())
              .slice(0, 4)
              .map(([key, value]) => {
                const Icon = socialIconMap[key] || Globe;
                return value.startsWith("http") ? (
                  <a
                    key={key}
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Badge
                      variant="outline"
                      className="text-[10px] cursor-pointer hover:bg-muted"
                    >
                      <Icon className="h-2.5 w-2.5 mr-0.5" />
                      {key}
                    </Badge>
                  </a>
                ) : (
                  <Badge key={key} variant="outline" className="text-[10px]">
                    <Icon className="h-2.5 w-2.5 mr-0.5" />
                    {value}
                  </Badge>
                );
              })}
          </div>
        )}

        {/* Badges */}
        {showBadges && badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {badges.slice(0, 3).map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-1 rounded-full border px-2 py-0.5"
                style={{ borderColor: badge.color || primaryColor }}
              >
                <Award
                  className="h-2.5 w-2.5"
                  style={{ color: badge.color || primaryColor }}
                />
                <span className="text-[10px]">{badge.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
