"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowRight,
  Calendar,
  Globe,
  Loader2,
  MapPin,
  Sparkles,
  SlidersHorizontal,
  Star,
  BadgeCheck,
} from "lucide-react";

type ProfileCard = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  tagline: string | null;
  bio: string | null;
  pronouns: string | null;
  location: string | null;
  website_url: string | null;
  specialties: string[] | null;
  status_message: string | null;
  visibility: string | null;
  profile_completeness: number | null;
  created_at: string;
  updated_at: string;
};

type SortMode = "discover" | "top" | "new" | "alpha";
type FilterMode = "all" | "avatar" | "bio" | "complete";

const PAGE_SIZE = 24;
const PROFILE_COLUMNS =
  "id, username, display_name, avatar_url, tagline, bio, pronouns, location, website_url, specialties, status_message, visibility, profile_completeness, created_at, updated_at";

const discoveryTracks = [
  {
    title: "Top",
    description:
      "Profiles with a strong presence and recent activity rise to the top.",
    icon: Star,
  },
  {
    title: "Fresh",
    description: "Recently updated profiles give you something new to explore.",
    icon: Sparkles,
  },
  {
    title: "Structured",
    description:
      "Profiles arranged for featured picks, lists, and themed collections.",
    icon: SlidersHorizontal,
  },
];

type ProfilesCacheEntry = {
  expiresAt: number;
  profiles: ProfileCard[];
  totalCount: number;
  hasMore: boolean;
};

const PROFILES_CACHE_TTL_MS = 15_000;
const profilesHubCache = new Map<string, ProfilesCacheEntry>();

export function ProfilesHub() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("discover");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [hasScrolledPastIntro, setHasScrolledPastIntro] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroCardRef = useRef<HTMLDivElement | null>(null);
  const profilesLengthRef = useRef(0);
  const requestIdRef = useRef(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    profilesLengthRef.current = profiles.length;
  }, [profiles.length]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const supabase = createClient();
        const access = await getCurrentUserAccess(supabase);
        if (!mounted) return;
        setCurrentUserId(access.user?.id ?? null);
      } catch {
        if (!mounted) return;
        setCurrentUserId(null);
      } finally {
        if (!mounted) return;
        setAuthResolved(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const loadProfiles = useCallback(
    async (replace = false) => {
      const requestId = ++requestIdRef.current;
      const offset = replace ? 0 : profilesLengthRef.current;
      const cacheKey = [
        currentUserId || "anonymous",
        search.trim().toLowerCase(),
        sortMode,
        filterMode,
        String(offset),
        String(PAGE_SIZE),
      ].join("|");

      const cached = profilesHubCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        setTotalCount(cached.totalCount);
        setProfiles((prev) =>
          replace ? cached.profiles : [...prev, ...cached.profiles],
        );
        setHasMore(cached.hasMore);
        setLoadingInitial(false);
        setLoadingMore(false);
        return;
      }

      if (replace) {
        setLoadingInitial(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const supabase = createClient();
        let query: any = supabase
          .from("profiles")
          .select(PROFILE_COLUMNS, { count: "exact" })
          .not("username", "is", null)
          .neq("visibility", "private");

        if (currentUserId) {
          query = query.neq("id", currentUserId);
        }

        const searchTerm = search.trim();
        if (searchTerm) {
          const safeTerm = searchTerm.replace(/[%_]/g, "");
          query = query.or(
            `display_name.ilike.%${safeTerm}%,username.ilike.%${safeTerm}%`,
          );
        }

        if (filterMode === "avatar") {
          query = query.not("avatar_url", "is", null);
        }

        if (filterMode === "bio") {
          query = query.not("bio", "is", null);
        }

        if (filterMode === "complete") {
          query = query
            .not("avatar_url", "is", null)
            .not("bio", "is", null)
            .gte("profile_completeness", 70);
        }

        if (sortMode === "top") {
          query = query
            .order("profile_completeness", { ascending: false })
            .order("updated_at", { ascending: false });
        } else if (sortMode === "new") {
          query = query.order("created_at", { ascending: false });
        } else if (sortMode === "alpha") {
          query = query
            .order("display_name", { ascending: true })
            .order("username", { ascending: true });
        } else {
          query = query
            .order("profile_completeness", { ascending: false })
            .order("updated_at", { ascending: false });
        }

        query = query.range(offset, offset + PAGE_SIZE - 1);

        const { data, error, count } = await query;
        if (requestId !== requestIdRef.current) return;
        if (error) throw error;

        const nextProfiles = ((data || []) as ProfileCard[]).filter(
          (profile) => !!profile.username,
        );

        profilesHubCache.set(cacheKey, {
          expiresAt: Date.now() + PROFILES_CACHE_TTL_MS,
          profiles: nextProfiles,
          totalCount: count || 0,
          hasMore: nextProfiles.length === PAGE_SIZE,
        });

        setTotalCount(count || 0);
        setProfiles((prev) =>
          replace ? nextProfiles : [...prev, ...nextProfiles],
        );
        setHasMore(nextProfiles.length === PAGE_SIZE);
      } catch (fetchError: any) {
        if (requestId !== requestIdRef.current) return;
        console.error("Failed to load profiles hub:", fetchError);
        setError(fetchError.message || "Failed to load profiles");
        setHasMore(false);
        if (replace) setProfiles([]);
      } finally {
        if (requestId !== requestIdRef.current) return;
        setLoadingInitial(false);
        setLoadingMore(false);
      }
    },
    [currentUserId, filterMode, search, sortMode],
  );

  useEffect(() => {
    if (!authResolved) return;
    setProfiles([]);
    setHasMore(true);
    setTotalCount(0);
    void loadProfiles(true);
  }, [authResolved, loadProfiles]);

  useEffect(() => {
    const root = rootRef.current;
    const scrollContainer =
      root?.closest("main") instanceof HTMLElement
        ? root.closest("main")
        : null;
    scrollContainerRef.current = scrollContainer;

    const handleScroll = () => {
      const scrollTop = scrollContainerRef.current?.scrollTop ?? window.scrollY;
      const heroHeight = heroCardRef.current?.offsetHeight ?? 0;
      const switchThreshold = Math.max(480, heroHeight - 80);
      setHasScrolledPastIntro(scrollTop > switchThreshold);
    };

    handleScroll();
    const target: HTMLElement | Window = scrollContainer || window;
    target.addEventListener("scroll", handleScroll, {
      passive: true,
    } as AddEventListenerOptions);
    return () => {
      target.removeEventListener("scroll", handleScroll as EventListener);
    };
  }, []);

  const scrollToTop = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const applySortMode = useCallback(
    (value: SortMode) => {
      setSortMode(value);
      scrollToTop();
    },
    [scrollToTop],
  );

  const applyFilterMode = useCallback(
    (value: FilterMode) => {
      setFilterMode(value);
      scrollToTop();
    },
    [scrollToTop],
  );

  const visibleCount = profiles.length;
  const featuredProfiles = useMemo(() => profiles.slice(0, 3), [profiles]);

  const formatCompleteness = (value: number | null) => {
    if (value == null) return "Fresh profile";
    return `${value}% complete`;
  };

  return (
    <div ref={rootRef} className="min-h-full p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <Card
          ref={heroCardRef}
          className="relative isolate overflow-hidden border-border/70 bg-card/95 shadow-lg"
        >
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_34%),linear-gradient(to_br,rgba(255,255,255,0.02),transparent_40%)]" />
          <CardContent className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Browse people, profiles, and creativity
              </div>

              <div className="flex items-center gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Hub
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Creator Profiles
                  </h1>
                </div>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Explore creators across the platform, jump into their profile,
                and discover new people through search, filters, and curated
                sorting.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Community
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {totalCount || "--"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Visible now
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{visibleCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Featured
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {featuredProfiles.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-3xl border border-border/70 bg-background/70 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                Discover creators
              </div>
              <p className="text-sm text-muted-foreground">
                Browse by vibe, by quality, or by what feels fresh today.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  "Featured",
                  "New faces",
                  "Complete profiles",
                  "Community picks",
                ].map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-foreground/80"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-6">
            <Card className="border-border/70 bg-card/95 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <SearchInput
                      value={search}
                      onChange={setSearch}
                      placeholder="Search by username or display name"
                      className="w-full"
                      debounce={250}
                      shortcutKey="/"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                      {(
                        [
                          ["discover", "Discover"],
                          ["top", "Top"],
                          ["new", "Newest"],
                          ["alpha", "A-Z"],
                        ] as Array<[SortMode, string]>
                      ).map(([value, label]) => (
                        <Button
                          key={value}
                          type="button"
                          variant={sortMode === value ? "default" : "outline"}
                          data-state={sortMode === value ? "on" : "off"}
                          className="justify-center rounded-full data-[state=off]:cursor-pointer data-[state=on]:cursor-default"
                          onClick={() => applySortMode(value)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["all", "All profiles"],
                      ["avatar", "With avatar"],
                      ["bio", "With bio"],
                      ["complete", "Most complete"],
                    ] as Array<[FilterMode, string]>
                  ).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      variant={filterMode === value ? "secondary" : "ghost"}
                      data-state={filterMode === value ? "on" : "off"}
                      size="sm"
                      className="rounded-full data-[state=off]:cursor-pointer data-[state=on]:cursor-default"
                      onClick={() => applyFilterMode(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {loadingInitial ? (
              <Card className="border-border/70 bg-card/95">
                <CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-56 animate-pulse rounded-3xl border border-border/70 bg-muted/40"
                    />
                  ))}
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="border-border/70 bg-card/95">
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                  {error}
                </CardContent>
              </Card>
            ) : profiles.length === 0 ? (
              <Card className="border-border/70 bg-card/95">
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                  No profiles found with the current filters.
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
                  {profiles.map((profile) => {
                    const handle = profile.username || profile.id;
                    const displayName =
                      profile.display_name ||
                      profile.username ||
                      "Unnamed user";
                    const initials = displayName
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <Link
                        key={profile.id}
                        href={`/profile/${handle}`}
                        className="group block touch-manipulation"
                        onClick={(event) => {
                          if (event.defaultPrevented) return;
                          router.push(`/profile/${handle}`);
                        }}
                      >
                        <Card className="h-full cursor-pointer overflow-hidden border-border/70 bg-card/95 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                          <CardContent className="space-y-5 p-5">
                            <div className="relative rounded-3xl border border-border/70 bg-linear-to-br from-primary/8 via-background to-emerald-500/5 p-4 sm:p-5">
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.10),transparent_38%)]" />
                              <div className="relative flex items-start gap-3 sm:gap-4">
                                <Avatar className="h-14 w-14 shrink-0 border border-border/70 shadow-sm">
                                  <AvatarImage
                                    src={profile.avatar_url || undefined}
                                  />
                                  <AvatarFallback>
                                    {initials || "U"}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="min-w-0 wrap-break-word text-base font-semibold leading-tight">
                                      {displayName}
                                    </h3>
                                    {profile.profile_completeness != null && (
                                      <Badge
                                        variant="outline"
                                        className="shrink-0"
                                      >
                                        {formatCompleteness(
                                          profile.profile_completeness,
                                        )}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="wrap-break-word text-sm text-muted-foreground">
                                    @{handle}
                                  </p>
                                  {profile.tagline && (
                                    <p className="line-clamp-3 text-sm text-foreground/90">
                                      {profile.tagline}
                                    </p>
                                  )}
                                </div>

                                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                              </div>
                            </div>

                            <div className="space-y-2 text-sm text-muted-foreground">
                              {profile.status_message && (
                                <p className="line-clamp-3 italic">
                                  {profile.status_message}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {profile.pronouns && (
                                  <Badge variant="secondary">
                                    {profile.pronouns}
                                  </Badge>
                                )}
                                {profile.location && (
                                  <Badge variant="outline" className="gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {profile.location}
                                  </Badge>
                                )}
                                {profile.website_url && (
                                  <Badge variant="outline" className="gap-1">
                                    <Globe className="h-3.5 w-3.5" />
                                    Website
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {profile.bio && (
                              <p className="line-clamp-3 text-sm text-muted-foreground">
                                {profile.bio}
                              </p>
                            )}

                            {profile.specialties &&
                              profile.specialties.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {profile.specialties
                                    .slice(0, 3)
                                    .map((specialty) => (
                                      <Badge key={specialty} variant="outline">
                                        {specialty}
                                      </Badge>
                                    ))}
                                </div>
                              )}

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Joined{" "}
                                {new Date(
                                  profile.created_at,
                                ).toLocaleDateString()}
                              </span>
                              <span className="inline-flex items-center gap-1 font-medium text-primary">
                                View profile{" "}
                                <ArrowRight className="h-3.5 w-3.5" />
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>

                <div className="flex flex-col items-center gap-3 py-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {visibleCount} of {totalCount || visibleCount}{" "}
                    profiles
                  </p>
                  {hasMore && (
                    <Button
                      variant="outline"
                      onClick={() => loadProfiles(false)}
                      disabled={loadingMore}
                      className="min-w-40"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading more...
                        </>
                      ) : (
                        "Load more profiles"
                      )}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:h-fit">
            <Card className="border-border/70 bg-card/95 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {hasScrolledPastIntro ? "Quick filters" : "Ways to explore"}
                  </h2>
                </div>
                {hasScrolledPastIntro ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Filter profiles
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            ["all", "All profiles"],
                            ["avatar", "With avatar"],
                            ["bio", "With bio"],
                            ["complete", "Most complete"],
                          ] as Array<[FilterMode, string]>
                        ).map(([value, label]) => (
                          <Button
                            key={value}
                            type="button"
                            size="sm"
                            variant={
                              filterMode === value ? "secondary" : "ghost"
                            }
                            data-state={filterMode === value ? "on" : "off"}
                            className="rounded-full data-[state=off]:cursor-pointer data-[state=on]:cursor-default"
                            onClick={() => applyFilterMode(value)}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Sort results
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            ["discover", "Discover"],
                            ["top", "Top"],
                            ["new", "Newest"],
                            ["alpha", "A-Z"],
                          ] as Array<[SortMode, string]>
                        ).map(([value, label]) => (
                          <Button
                            key={value}
                            type="button"
                            size="sm"
                            data-state={sortMode === value ? "on" : "off"}
                            className="justify-center rounded-full data-[state=off]:cursor-pointer data-[state=on]:cursor-default"
                            variant={sortMode === value ? "default" : "outline"}
                            onClick={() => applySortMode(value)}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {discoveryTracks.map((track) => {
                      const Icon = track.icon;
                      return (
                        <div
                          key={track.title}
                          className="rounded-2xl border border-border/70 bg-background/60 p-4 transition-transform hover:-translate-y-0.5"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <p className="font-medium">{track.title}</p>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {track.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* <Card className="border-border/70 bg-card/95 shadow-sm">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Built for discovery
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Browse stays smooth and responsive, even as the community
                  grows.
                </p>
                <p className="text-sm text-muted-foreground">
                  Featured creators, rankings, and themed collections can live
                  here without changing how the page feels.
                </p>
                {featuredProfiles.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Featured creators
                    </p>
                    <div className="space-y-2">
                      {featuredProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-3 py-2 text-sm"
                        >
                          <span className="truncate">
                            {profile.display_name || profile.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatCompleteness(profile.profile_completeness)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card> */}
          </aside>
        </div>
      </div>
    </div>
  );
}
