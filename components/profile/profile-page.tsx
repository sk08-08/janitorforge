// ============================================================================
// JanitorForge - Profile Page
// Full-page profile view with edit capability
// ============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotDetailModal } from "@/components/bots/bot-detail-modal";
import { renderMarkdown } from "@/lib/markdown";
import {
  Pencil,
  MapPin,
  Globe,
  Calendar,
  ExternalLink,
  Star,
  Layout,
  Inbox,
  Bot,
  AppWindow,
  FileText,
  UserRound,
} from "lucide-react";
import {
  TwitterIcon,
  DiscordIcon,
  GithubIcon,
  TiktokIcon,
  YoutubeIcon,
  TwitchIcon,
  WebsiteIcon,
  socialIcons,
} from "@/components/ui/social-icons";
import { getOwnProfile, getFollowCounts } from "@/app/actions/profile";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ProfileEditor } from "./profile-editor";
import { FollowListModal } from "./follow-list-modal";
import { ProfileBadgesSection } from "./profile-badges";
import { ProfileCompletenessCard } from "./profile-completeness";
import { cn } from "@/lib/utils";

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
  pronouns?: string | null;
  location?: string | null;
  website_url?: string | null;
  specialties?: string[] | null;
  status_message?: string | null;
  social_links?: Record<string, string> | null;
  profile_badges?: ProfileBadge[] | null;
  profile_completeness?: number | null;
  featured_bot_ids?: string[] | null;
}

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    type: "bot" | "world";
    data: any;
  } | null>(null);
  const [botDetailBot, setBotDetailBot] = useState<any>(null);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<
    "followers" | "following"
  >("followers");
  const [followCounts, setFollowCounts] = useState({
    followers: 0,
    following: 0,
  });
  const { bots, forms, requests } = useStore();
  const [creatorPages, setCreatorPages] = useState<
    Array<{
      id: string;
      title: string;
      slug: string;
      description: string;
      is_published: boolean;
    }>
  >([]);
  const [worlds, setWorlds] = useState<
    Array<{
      id: string;
      title: string;
      slug: string;
      kind: string;
      description: string;
      bot_ids: string[];
    }>
  >([]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOwnProfile();
      if (result.success && result.profile) {
        setProfile(result.profile);
        const counts = await getFollowCounts(result.profile.id);
        setFollowCounts(counts);

        // Fetch creator pages and worlds
        const supabase = createClient();
        const [{ data: pages }, { data: worldData }] = await Promise.all([
          supabase
            .from("creator_pages")
            .select("id, title, slug, description, is_published")
            .eq("user_id", result.profile.id)
            .order("updated_at", { ascending: false }),
          supabase
            .from("atlas_worlds")
            .select("id, title, slug, kind, description, bot_ids")
            .eq("user_id", result.profile.id)
            .is("deleted_at", null)
            .order("updated_at", { ascending: false }),
        ]);
        if (pages) setCreatorPages(pages);
        if (worldData) setWorlds(worldData);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <p className="text-sm">Failed to load profile.</p>
        </div>
      </div>
    );
  }

  const p = profile;
  const theme = p.theme || {};
  const primaryColor = (theme.primaryColor as string) || "#7c3aed";
  const avatarBorderColor = (theme.avatarBorderColor as string) || primaryColor;
  const socialLinks = p.social_links || {};
  const badges = p.profile_badges || [];
  const specialtiesList = p.specialties || [];
  const showStats = theme.showStats !== false;
  const showBadges = theme.showBadges !== false;
  const showFeatured = theme.showFeatured !== false;
  const hideCompletenessNudge =
    theme.hideCompletenessNudge === true ||
    theme.hideCompletenessNudge === "true";
  const featuredBotIds = p.featured_bot_ids || [];
  const featuredBots = featuredBotIds
    .map((id) => bots.find((b) => b.id === id))
    .filter(Boolean);
  const ownForms = forms.filter(
    (f) => f.ownerId === (p.id as string) || f.ownerId === undefined,
  );
  const hasSocialLinks = Object.values(socialLinks).some((v) => v && v.trim());

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 space-y-6">
      {/* Main Profile Card */}
      <Card className="overflow-hidden">
        {/* Banner */}
        <div
          className="h-32 sm:h-44 w-full relative"
          style={{
            background: p.banner_url
              ? `url(${p.banner_url}) center/cover no-repeat`
              : `linear-gradient(135deg, ${primaryColor}88, ${primaryColor}22)`,
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-3 right-3 cursor-pointer bg-background/80 backdrop-blur-sm"
            onClick={() => setEditorOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit Profile
          </Button>
        </div>

        <CardContent className="px-4 sm:px-6 pb-6 -mt-12 relative z-10">
          {/* Avatar */}
          <div
            className="h-24 w-24 rounded-full border-4 overflow-hidden shadow-lg mb-4"
            style={{ borderColor: avatarBorderColor }}
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
                <UserRound
                  className="h-10 w-10"
                  style={{ color: primaryColor }}
                />
              </div>
            )}
          </div>

          {/* Name & Handle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">
                  {String(p.display_name || "Unnamed Creator")}
                </h1>
                {typeof p.pronouns === "string" && p.pronouns !== "none" && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {p.pronouns}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                @{String(p.slug || p.username || "unknown")}
              </p>
              {typeof p.status_message === "string" && (
                <p className="text-sm mt-1 italic text-muted-foreground">
                  &ldquo;{p.status_message}&rdquo;
                </p>
              )}
            </div>

            {/* Follow counts — clickable */}
            <div className="flex items-center gap-5 text-sm">
              <button
                className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  setFollowModalTab("followers");
                  setFollowModalOpen(true);
                }}
              >
                <p
                  className="text-lg font-bold"
                  style={{ color: primaryColor }}
                >
                  {followCounts.followers}
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
                  style={{ color: primaryColor }}
                >
                  {followCounts.following}
                </p>
                <p className="text-xs text-muted-foreground">Following</p>
              </button>
              {showStats && (
                <div className="text-center">
                  <p
                    className="text-lg font-bold"
                    style={{ color: primaryColor }}
                  >
                    {(p.profile_completeness as number) || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
              )}
            </div>
          </div>

          {/* Tagline */}
          {typeof p.tagline === "string" && p.tagline && (
            <p className="text-sm mt-3">{p.tagline}</p>
          )}

          {/* Bio */}
          {typeof p.bio === "string" && p.bio && (
            <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {p.bio}
            </div>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-muted-foreground">
            {typeof p.location === "string" && p.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {p.location}
              </span>
            )}
            {typeof p.website_url === "string" && p.website_url && (
              <a
                href={p.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Globe className="h-3 w-3" />
                {(() => {
                  try {
                    return new URL(p.website_url).hostname;
                  } catch {
                    return p.website_url;
                  }
                })()}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            {typeof p.created_at === "string" && p.created_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Joined{" "}
                {new Date(p.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          {/* Social Links */}
          {hasSocialLinks && (
            <div className="flex flex-wrap gap-2 mt-4">
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

          {/* Featured Bots */}
          {showFeatured && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Featured Bots
              </p>
              {featuredBots.length > 0 ? (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {featuredBots.map((bot) => (
                    <div
                      key={bot!.id}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/30 cursor-pointer"
                      onClick={() => setBotDetailBot(bot)}
                    >
                      <div className="h-10 w-10 rounded bg-muted overflow-hidden shrink-0">
                        {bot!.imageUrl ? (
                          <img
                            src={bot!.imageUrl}
                            alt={bot!.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className="h-full w-full flex items-center justify-center"
                            style={{ backgroundColor: `${primaryColor}22` }}
                          >
                            <Star
                              className="h-5 w-5"
                              style={{
                                color: primaryColor,
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {bot!.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {bot!.shortDescription || "No description"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {bot!.rating}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty className="rounded-lg border border-dashed bg-card/40 px-5 py-7">
                  <EmptyContent>
                    <EmptyMedia variant="icon">
                      <Star
                        className="h-5 w-5"
                        style={{
                          color: primaryColor,
                        }}
                      />
                    </EmptyMedia>
                    <EmptyTitle>No featured bots yet</EmptyTitle>
                    <EmptyDescription>
                      Pick bots in the editor to highlight them here and make
                      the profile feel more complete.
                    </EmptyDescription>
                  </EmptyContent>
                </Empty>
              )}
            </div>
          )}

          <ProfileBadgesSection
            badges={badges}
            themeColor={primaryColor}
            showBadges={showBadges}
            className="mt-4"
            emptyClassName="rounded-lg border border-dashed bg-card/40 px-5 py-7"
            emptyDescription="Badges will appear here once they are awarded."
          />

          <ProfileCompletenessCard
            profile={p}
            completeness={(p.profile_completeness as number) || 0}
            themeColor={primaryColor}
            hideNudge={hideCompletenessNudge}
            onEdit={() => setEditorOpen(true)}
            className="mt-4"
          />
        </CardContent>
      </Card>

      {/* Follow List Modal */}
      {p.id && (
        <FollowListModal
          open={followModalOpen}
          onOpenChange={setFollowModalOpen}
          userId={p.id as string}
          tab={followModalTab}
          themeColor={primaryColor}
        />
      )}

      {/* ===== Unified Content Sections ===== */}
      {/* Bots */}
      {bots.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5" style={{ color: primaryColor }} />
            <h2 className="text-lg font-semibold">Bots</h2>
            <Badge variant="outline">{bots.length}</Badge>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="rounded-lg border overflow-hidden transition-all hover:border-primary/30 hover:shadow-md cursor-pointer"
                onClick={() => setBotDetailBot(bot)}
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
                      <Bot
                        className="h-8 w-8"
                        style={{
                          color: primaryColor,
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{bot.name}</p>
                    <Badge
                      variant={
                        bot.rating === "SFW" ? "secondary" : "destructive"
                      }
                      className="text-[10px] shrink-0"
                    >
                      {bot.rating}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {bot.shortDescription || "No description"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <hr
            className="border-t"
            style={{ borderColor: `${primaryColor}33` }}
          />
        </div>
      )}

      {/* Creator Pages */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <AppWindow className="h-5 w-5" style={{ color: primaryColor }} />
          <h2 className="text-lg font-semibold">Creator Pages</h2>
          <Badge variant="outline">{creatorPages.length}</Badge>
        </div>
        {creatorPages.length > 0 ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {creatorPages.map((page) => (
              <a
                key={page.id}
                href={page.is_published ? `/page/${page.slug}` : "#"}
                target={page.is_published ? "_blank" : undefined}
                rel="noopener noreferrer"
              >
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
              </a>
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
        <hr className="border-t" style={{ borderColor: `${primaryColor}33` }} />
      </div>

      {/* Worlds */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5" style={{ color: primaryColor }} />
          <h2 className="text-lg font-semibold">Worlds</h2>
          <Badge variant="outline">{worlds.length}</Badge>
        </div>
        {worlds.length > 0 ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {worlds.map((world) => (
              <div
                key={world.id}
                className="rounded-lg border p-3 transition-all hover:border-primary/30 hover:shadow-md cursor-pointer"
                onClick={() => {
                  setSelectedItem({ type: "world", data: world });
                  setDetailOpen(true);
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {world.kind}
                  </Badge>
                  <p className="text-sm font-medium truncate">{world.title}</p>
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
        <hr className="border-t" style={{ borderColor: `${primaryColor}33` }} />
      </div>

      {/* Forms — only user's own forms */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5" style={{ color: primaryColor }} />
          <h2 className="text-lg font-semibold">Forms</h2>
          <Badge variant="outline">{ownForms.length}</Badge>
        </div>
        {ownForms.length > 0 ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {ownForms.map((form) => (
              <Link
                href={`/form/${form.shareableLink}`}
                target="_blank"
                key={form.id}
                rel="noopener noreferrer"
              >
                <div
                  key={form.id}
                  className="rounded-lg border p-3 transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p
                      className="text-sm font-medium truncate rendered-markdown"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(form.title),
                      }}
                    />
                    <Badge
                      variant={form.isActive ? "default" : "secondary"}
                      className="text-[10px] shrink-0"
                    >
                      {form.isActive ? "Active" : "Inactive"}
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
                    {requests.filter((r) => r.formId === form.id).length}{" "}
                    responses · {form.sections.length} sections
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Inbox className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No forms yet</p>
          </div>
        )}
      </div>

      {/* Bot Detail Modal — shared component */}
      <BotDetailModal
        open={!!botDetailBot}
        onOpenChange={(v) => {
          if (!v) setBotDetailBot(null);
        }}
        bot={botDetailBot}
      />

      {/* Detail Modal for Worlds only */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedItem?.type === "world" && (
            <>
              <DialogHeader>
                <DialogTitle>{(selectedItem.data as any).title}</DialogTitle>
                <DialogDescription>
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {(selectedItem.data as any).kind}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Description
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {(selectedItem.data as any).description || "No description"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Bots in this world
                  </p>
                  <p className="text-sm">
                    {(selectedItem.data as any).bot_ids?.length || 0} bots
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Editor Dialog */}
      <ProfileEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={loadProfile}
      />
    </div>
  );
}
