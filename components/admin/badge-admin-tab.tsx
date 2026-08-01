"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Check,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Slash,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomColorPicker } from "@/components/ui/custom-color-picker";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  awardProfileBadge,
  createBadgeDefinition,
  listBadgeDefinitions,
  listProfileBadgesForAdmin,
  revokeProfileBadge,
  searchProfilesForBadgeAdmin,
  setBadgeDefinitionActive,
  updateBadgeDefinition,
  type BadgeDefinitionRecord,
} from "@/app/actions/profile-badges";
import {
  getProfileBadgeIcon,
  getProfileBadgeIconOptions,
} from "@/lib/profile-badge-icons";
import type { ProfileBadgeRecord } from "@/lib/profile-badges";
import { cn } from "@/lib/utils";

type EditableBadgeForm = {
  slug: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  sortOrder: string;
  isActive: boolean;
};

type ProfileSearchResult = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  slug: string | null;
};

type CatalogStatusFilter = "all" | "active" | "inactive";

const EMPTY_FORM: EditableBadgeForm = {
  slug: "",
  label: "",
  description: "",
  icon: "Award",
  color: "#7c3aed",
  category: "general",
  sortOrder: "0",
  isActive: true,
};

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatDateLabel(value?: string) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No date";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function BadgePreview({ badge }: { badge: EditableBadgeForm }) {
  const Icon = getProfileBadgeIcon(badge.icon);
  return (
    <div
      className="inline-flex min-w-0 items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm"
      style={{ borderColor: badge.color || "#7c3aed" }}
    >
      <Icon
        className="h-4 w-4 shrink-0"
        style={{ color: badge.color || "#7c3aed" }}
      />
      <span className="truncate font-medium">
        {badge.label || "Badge preview"}
      </span>
    </div>
  );
}

function AwardedBadgePill({
  badge,
  onRevoke,
  revoking,
}: {
  badge: ProfileBadgeRecord;
  onRevoke: (slug: string) => void;
  revoking: boolean;
}) {
  const Icon = getProfileBadgeIcon(badge.icon);
  const accent = badge.color || "#7c3aed";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
          style={{
            borderColor: accent,
            backgroundColor: `${accent}14`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{badge.label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {badge.slug} • {formatDateLabel(badge.awardedAt)}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRevoke(badge.slug)}
        disabled={revoking}
        className="cursor-pointer text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function BadgeAdminTab() {
  const [badges, setBadges] = useState<BadgeDefinitionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogStatus, setCatalogStatus] =
    useState<CatalogStatusFilter>("all");
  const [catalogCategory, setCatalogCategory] = useState<string>("all");

  const [selectedBadgeSlug, setSelectedBadgeSlug] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState<EditableBadgeForm>(EMPTY_FORM);
  const [savingBadge, setSavingBadge] = useState(false);

  const [searchingProfiles, setSearchingProfiles] = useState(false);
  const [profileQuery, setProfileQuery] = useState("");
  const [profiles, setProfiles] = useState<ProfileSearchResult[]>([]);
  const [selectedProfile, setSelectedProfile] =
    useState<ProfileSearchResult | null>(null);
  const [selectedProfileBadges, setSelectedProfileBadges] = useState<
    ProfileBadgeRecord[]
  >([]);
  const [selectedAwardBadgeSlug, setSelectedAwardBadgeSlug] =
    useState<string>("");
  const [awardNote, setAwardNote] = useState("");
  const [submittingAward, setSubmittingAward] = useState(false);
  const [revokingSlug, setRevokingSlug] = useState<string | null>(null);
  const profileSearchRequestRef = useRef(0);

  const loadBadges = useCallback(async () => {
    setLoading(true);
    const result = await listBadgeDefinitions({ includeInactive: true });
    if (!result.success) {
      toast.error(result.error || "Failed to load badges");
      setLoading(false);
      return;
    }
    setBadges(result.badges || []);
    setLoading(false);
  }, []);

  const loadProfileBadges = useCallback(async (profileId: string) => {
    const result = await listProfileBadgesForAdmin(profileId);
    if (!result.success) {
      toast.error(result.error || "Failed to load profile badges");
      return;
    }
    setSelectedProfileBadges(result.badges || []);
  }, []);

  const loadInitialProfiles = useCallback(async () => {
    const requestId = profileSearchRequestRef.current + 1;
    profileSearchRequestRef.current = requestId;

    setSearchingProfiles(true);
    const result = await searchProfilesForBadgeAdmin("", 10);

    if (requestId !== profileSearchRequestRef.current) {
      return;
    }

    setSearchingProfiles(false);

    if (!result.success) {
      setProfiles([]);
      return;
    }

    setProfiles((result.profiles || []) as ProfileSearchResult[]);
  }, []);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  useEffect(() => {
    void loadInitialProfiles();
  }, [loadInitialProfiles]);

  useEffect(() => {
    if (!selectedBadgeSlug) {
      setForm(EMPTY_FORM);
      return;
    }

    const selected = badges.find((badge) => badge.slug === selectedBadgeSlug);
    if (!selected) return;

    setForm({
      slug: selected.slug,
      label: selected.label,
      description: selected.description || "",
      icon: selected.icon || "Award",
      color: selected.color || "#7c3aed",
      category: selected.category || "general",
      sortOrder: String(selected.sort_order ?? 0),
      isActive: selected.is_active !== false,
    });
  }, [badges, selectedBadgeSlug]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const badge of badges) {
      unique.add((badge.category || "general").toLowerCase());
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [badges]);

  const filteredBadges = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();

    return badges.filter((badge) => {
      if (catalogStatus === "active" && badge.is_active === false) return false;
      if (catalogStatus === "inactive" && badge.is_active !== false)
        return false;
      if (
        catalogCategory !== "all" &&
        (badge.category || "general").toLowerCase() !== catalogCategory
      ) {
        return false;
      }

      if (!query) return true;

      return [badge.slug, badge.label, badge.category, badge.description || ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [badges, catalogQuery, catalogStatus, catalogCategory]);

  const activeBadgeOptions = useMemo(
    () => badges.filter((badge) => badge.is_active !== false),
    [badges],
  );

  const selectedBadge = useMemo(
    () => badges.find((badge) => badge.slug === selectedBadgeSlug) || null,
    [badges, selectedBadgeSlug],
  );

  const alreadyAwarded = useMemo(
    () =>
      selectedProfileBadges.some(
        (badge) => badge.slug === selectedAwardBadgeSlug,
      ),
    [selectedProfileBadges, selectedAwardBadgeSlug],
  );

  const catalogMetrics = useMemo(() => {
    const active = badges.filter((badge) => badge.is_active !== false).length;
    const inactive = badges.length - active;

    return {
      total: badges.length,
      active,
      inactive,
      categories: categories.length,
    };
  }, [badges, categories.length]);

  const handleCreateNew = () => {
    setSelectedBadgeSlug(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmitBadge = async () => {
    setSavingBadge(true);

    const input = {
      slug: form.slug,
      label: form.label,
      description: form.description,
      icon: form.icon,
      color: form.color,
      category: form.category,
      sortOrder: Number(form.sortOrder || 0),
      isActive: form.isActive,
    };

    const result = selectedBadgeSlug
      ? await updateBadgeDefinition(selectedBadgeSlug, input)
      : await createBadgeDefinition(input);

    setSavingBadge(false);

    if (!result.success) {
      toast.error(result.error || "Failed to save badge");
      return;
    }

    toast.success(selectedBadgeSlug ? "Badge updated" : "Badge created");
    await loadBadges();
    setSelectedBadgeSlug(result.badge?.slug || input.slug || null);
  };

  const handleToggleBadgeActive = async (badge: BadgeDefinitionRecord) => {
    const result = await setBadgeDefinitionActive(badge.slug, !badge.is_active);
    if (!result.success) {
      toast.error(result.error || "Failed to update badge");
      return;
    }

    toast.success(badge.is_active ? "Badge deactivated" : "Badge activated");
    await loadBadges();
  };

  const handleSearchProfiles = useCallback(
    async (queryOverride?: string) => {
      const queryValue = String(queryOverride ?? profileQuery).trim();
      if (!queryValue) {
        await loadInitialProfiles();
        return;
      }

      const requestId = profileSearchRequestRef.current + 1;
      profileSearchRequestRef.current = requestId;

      setSearchingProfiles(true);
      const result = await searchProfilesForBadgeAdmin(queryValue, 12);

      if (requestId !== profileSearchRequestRef.current) {
        return;
      }

      setSearchingProfiles(false);

      if (!result.success) {
        toast.error(result.error || "Failed to search profiles");
        return;
      }

      setProfiles((result.profiles || []) as ProfileSearchResult[]);
    },
    [profileQuery, loadInitialProfiles],
  );

  useEffect(() => {
    const queryValue = profileQuery.trim();
    if (!queryValue) {
      profileSearchRequestRef.current += 1;
      void loadInitialProfiles();
      return;
    }

    const timeout = setTimeout(() => {
      void handleSearchProfiles(queryValue);
    }, 220);

    return () => clearTimeout(timeout);
  }, [profileQuery, handleSearchProfiles, loadInitialProfiles]);

  const shouldConstrainCatalogList = filteredBadges.length > 7;
  const shouldConstrainProfileResults =
    profiles.length > 5 || searchingProfiles;
  const shouldConstrainAwardList = selectedProfileBadges.length > 8;

  const handleResetBadgeForm = () => {
    setSelectedBadgeSlug(null);
    setForm(EMPTY_FORM);
  };

  const handleSelectProfile = async (profile: ProfileSearchResult) => {
    setSelectedProfile(profile);
    await loadProfileBadges(profile.id);
  };

  const handleAwardBadge = async () => {
    if (!selectedProfile || !selectedAwardBadgeSlug) {
      toast.error("Pick a profile and badge first");
      return;
    }

    if (alreadyAwarded) {
      toast.error("That profile already has this badge");
      return;
    }

    setSubmittingAward(true);
    const result = await awardProfileBadge({
      profileId: selectedProfile.id,
      badgeSlug: selectedAwardBadgeSlug,
      note: awardNote,
    });
    setSubmittingAward(false);

    if (!result.success) {
      toast.error(result.error || "Failed to award badge");
      return;
    }

    setSelectedProfileBadges(result.badges || []);
    setAwardNote("");
    toast.success("Badge awarded");
  };

  const handleRevokeBadge = async (badgeSlug: string) => {
    if (!selectedProfile) return;

    setRevokingSlug(badgeSlug);
    const result = await revokeProfileBadge(selectedProfile.id, badgeSlug);
    setRevokingSlug(null);

    if (!result.success) {
      toast.error(result.error || "Failed to revoke badge");
      return;
    }

    setSelectedProfileBadges(result.badges || []);
    toast.success("Badge revoked");
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shield className="h-5 w-5 text-primary" /> Badge Operations Center
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Curate the catalog, keep badge quality high, and manage awards with
            a normalized flow.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-card/80 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total badges
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {catalogMetrics.total}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-xs uppercase tracking-wide text-emerald-600">
              Active
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">
              {catalogMetrics.active}
            </p>
          </div>
          <div className="rounded-xl border border-muted bg-muted/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Inactive
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {catalogMetrics.inactive}
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
            <p className="text-xs uppercase tracking-wide text-blue-600">
              Categories
            </p>
            <p className="mt-1 text-2xl font-semibold text-blue-600">
              {catalogMetrics.categories}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Award className="h-5 w-5 text-primary" /> Badge Catalog
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Search and filter definitions, then open any badge to edit.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadBadges}
                  className="cursor-pointer"
                >
                  <RefreshCw
                    className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
                  />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <SearchInput
                value={catalogQuery}
                onChange={setCatalogQuery}
                placeholder="Search by label, slug, category"
                debounce={120}
                className="w-full"
              />
              <Select
                value={catalogStatus}
                onValueChange={(value) =>
                  setCatalogStatus(value as CatalogStatusFilter)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="inactive">Inactive only</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={catalogCategory}
                onValueChange={setCatalogCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quick categories
                </span>
                {categories.slice(0, 8).map((category) => (
                  <Button
                    key={category}
                    type="button"
                    size="sm"
                    data-state={catalogCategory === category ? "on" : "off"}
                    variant={
                      catalogCategory === category ? "secondary" : "outline"
                    }
                    onClick={() => setCatalogCategory(category)}
                    className="h-7 rounded-full px-3 text-xs data-[state=off]:cursor-pointer data-[state=on]:cursor-default data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {category}
                  </Button>
                ))}
                {catalogCategory !== "all" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setCatalogCategory("all")}
                    className="h-7 px-2 text-xs cursor-pointer bg-accent/10 text-accent-foreground hover:bg-accent/20"
                  >
                    Reset
                  </Button>
                )}
              </div>
            )}
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex min-h-56 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea
                className={cn(
                  "pr-3",
                  shouldConstrainCatalogList
                    ? "max-h-[min(42rem,62vh)]"
                    : "max-h-none",
                )}
              >
                <div
                  className={cn(
                    "space-y-3",
                    filteredBadges.length === 0 && "min-h-[14rem]",
                  )}
                >
                  {filteredBadges.map((badge) => {
                    const Icon = getProfileBadgeIcon(badge.icon);
                    const isSelected = selectedBadgeSlug === badge.slug;
                    const stateColor = badge.is_active
                      ? "text-emerald-600"
                      : "text-muted-foreground";

                    return (
                      <button
                        key={badge.slug}
                        type="button"
                        onClick={() => setSelectedBadgeSlug(badge.slug)}
                        className={cn(
                          "w-full rounded-2xl border p-4 text-left transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border/70 hover:bg-muted/40",
                        )}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
                                style={{
                                  borderColor: badge.color,
                                  backgroundColor: `${badge.color}14`,
                                }}
                              >
                                <Icon
                                  className="h-4 w-4"
                                  style={{ color: badge.color }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {badge.label}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {badge.slug}
                                </p>
                              </div>
                            </div>

                            {badge.description && (
                              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                                {badge.description}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {badge.category}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", stateColor)}
                            >
                              {badge.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Sort {badge.sort_order}</span>
                          <span>•</span>
                          <span>{badge.icon}</span>
                          {selectedBadge?.slug === badge.slug && (
                            <>
                              <span>•</span>
                              <span className="text-primary">Editing</span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {filteredBadges.length === 0 && (
                    <Empty className="rounded-2xl border border-dashed bg-card/30 px-4 py-8">
                      <EmptyContent>
                        <EmptyMedia variant="icon">
                          <Search className="h-5 w-5" />
                        </EmptyMedia>
                        <EmptyTitle>No badges match this filter</EmptyTitle>
                        <EmptyDescription>
                          Try another search term or reset category and status
                          filters.
                        </EmptyDescription>
                      </EmptyContent>
                    </Empty>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Pencil className="h-5 w-5 text-primary" />
              {selectedBadgeSlug ? "Edit badge" : "Create badge"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure a reusable definition with icon, color, category and
              priority.
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="badge-label">Label</Label>
                <Input
                  id="badge-label"
                  value={form.label}
                  onChange={(event) => {
                    const nextLabel = event.target.value;
                    setForm((current) => {
                      const previousSlug = slugify(current.label);
                      const shouldAutofillSlug =
                        !selectedBadgeSlug &&
                        (!current.slug || current.slug === previousSlug);

                      return {
                        ...current,
                        label: nextLabel,
                        slug: shouldAutofillSlug
                          ? slugify(nextLabel)
                          : current.slug,
                      };
                    });
                  }}
                  placeholder="Early Adopter"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="badge-slug">Slug</Label>
                <Input
                  id="badge-slug"
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                  placeholder="early_adopter"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge-description">Description</Label>
              <Textarea
                id="badge-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Explain what this badge represents and how users can earn it"
                className="min-h-24"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="badge-icon">Icon</Label>
                <Select
                  value={form.icon}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, icon: value }))
                  }
                >
                  <SelectTrigger id="badge-icon">
                    <SelectValue placeholder="Select icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {getProfileBadgeIconOptions().map((iconName) => {
                      const Icon = getProfileBadgeIcon(iconName);
                      return (
                        <SelectItem key={iconName} value={iconName}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5" />
                            <span>{iconName}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <CustomColorPicker
                label="Badge color"
                value={form.color}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    color: value,
                  }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="badge-category">Category</Label>
                <Input
                  id="badge-category"
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  placeholder="community"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="badge-order">Sort order</Label>
                <Input
                  id="badge-order"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sortOrder: event.target.value,
                    }))
                  }
                  inputMode="numeric"
                />
              </div>
            </div>

            <Separator />

            <div className="min-w-0 rounded-xl border border-border/70 bg-card/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Live preview</p>
                  <p className="text-xs text-muted-foreground">
                    This is how the badge label and icon pair will look.
                  </p>
                </div>
                <BadgePreview badge={form} />
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-background/70 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Active status</p>
                  <p className="text-xs text-muted-foreground">
                    Inactive badges stay saved but are hidden from normal
                    awarding.
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, isActive: checked }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleSubmitBadge}
                disabled={savingBadge}
                className="cursor-pointer"
              >
                {savingBadge ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {selectedBadgeSlug ? "Save badge" : "Create badge"}
              </Button>

              {selectedBadgeSlug && selectedBadge && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleToggleBadgeActive(selectedBadge)}
                  className="cursor-pointer"
                >
                  <Slash className="mr-2 h-4 w-4" />
                  {form.isActive ? "Deactivate" : "Activate"}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={handleResetBadgeForm}
                className="cursor-pointer"
              >
                Reset fields
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Layers3 className="h-5 w-5 text-primary" /> Award & revoke badges
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Search a profile, assign active badges, and revoke awards with one
            panel.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <SearchInput
                  value={profileQuery}
                  onChange={setProfileQuery}
                  placeholder="Search by username, display name or slug"
                  className="flex-1"
                  debounce={120}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleSearchProfiles()}
                  disabled={searchingProfiles}
                  className="w-full cursor-pointer sm:w-auto"
                >
                  {searchingProfiles ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Search
                </Button>
              </div>

              <ScrollArea
                className={cn(
                  "pr-3",
                  shouldConstrainProfileResults
                    ? "h-[min(34rem,74vh)]"
                    : "min-h-56",
                )}
              >
                <div
                  className={cn(
                    "space-y-2 pb-1",
                    profiles.length === 0 && "h-full",
                  )}
                >
                  {profiles.map((profile) => {
                    const isSelected = selectedProfile?.id === profile.id;
                    const displayName =
                      profile.display_name ||
                      profile.username ||
                      profile.slug ||
                      "Unnamed user";

                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => void handleSelectProfile(profile)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border/70 hover:bg-muted/40",
                        )}
                      >
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage
                            src={profile.avatar_url || undefined}
                            alt=""
                          />
                          <AvatarFallback>
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p className="truncate font-medium">{displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            @
                            {profile.username ||
                              profile.slug ||
                              profile.id.slice(0, 8)}
                          </p>
                        </div>
                      </button>
                    );
                  })}

                  {!searchingProfiles && profiles.length === 0 && (
                    <Empty className="h-full min-h-[14rem] rounded-xl border border-dashed bg-card/30 px-4 py-7">
                      <EmptyContent>
                        <EmptyMedia variant="icon">
                          <UserRound className="h-5 w-5" />
                        </EmptyMedia>
                        <EmptyTitle>No users found</EmptyTitle>
                        <EmptyDescription>
                          Try another search term to find profiles.
                        </EmptyDescription>
                      </EmptyContent>
                    </Empty>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Selected profile</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedProfile
                        ? selectedProfile.display_name ||
                          selectedProfile.username ||
                          selectedProfile.slug ||
                          selectedProfile.id
                        : "Pick a profile from the left to continue."}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {selectedProfileBadges.length} awards
                  </Badge>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-4">
                <div>
                  <p className="text-sm font-medium">Award a badge</p>
                  <p className="text-xs text-muted-foreground">
                    Only active badges are shown in this picker.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="space-y-2">
                    <Label>Award badge</Label>
                    <Select
                      value={selectedAwardBadgeSlug}
                      onValueChange={setSelectedAwardBadgeSlug}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a badge" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {activeBadgeOptions.map((badge) => {
                          const Icon = getProfileBadgeIcon(badge.icon);
                          return (
                            <SelectItem key={badge.slug} value={badge.slug}>
                              <div className="flex items-center gap-2">
                                <Icon
                                  className="h-3.5 w-3.5"
                                  style={{ color: badge.color }}
                                />
                                <span>{badge.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="award-note">Award note</Label>
                    <Textarea
                      id="award-note"
                      value={awardNote}
                      onChange={(event) => setAwardNote(event.target.value)}
                      placeholder="Optional admin note"
                      className="min-h-20"
                    />
                  </div>
                </div>

                {alreadyAwarded && (
                  <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                    This profile already has the selected badge.
                  </p>
                )}

                <Button
                  type="button"
                  onClick={handleAwardBadge}
                  disabled={
                    !selectedProfile ||
                    !selectedAwardBadgeSlug ||
                    submittingAward ||
                    alreadyAwarded
                  }
                  className="cursor-pointer"
                >
                  {submittingAward ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Award badge
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">Current awards</h3>
                  <Badge variant="outline">
                    {selectedProfileBadges.length}
                  </Badge>
                </div>

                {selectedProfile ? (
                  selectedProfileBadges.length > 0 ? (
                    <ScrollArea
                      className={cn(
                        "pr-2",
                        shouldConstrainAwardList
                          ? "max-h-[min(24rem,50vh)]"
                          : "max-h-none",
                      )}
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        {selectedProfileBadges.map((badge) => (
                          <AwardedBadgePill
                            key={`${badge.slug}-${badge.awardedAt || ""}`}
                            badge={badge}
                            revoking={revokingSlug === badge.slug}
                            onRevoke={handleRevokeBadge}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <Empty className="rounded-xl border border-dashed bg-card/30 px-4 py-7">
                      <EmptyContent>
                        <EmptyMedia variant="icon">
                          <Award className="h-5 w-5" />
                        </EmptyMedia>
                        <EmptyTitle>No awards yet</EmptyTitle>
                        <EmptyDescription>
                          Select a badge above and grant the first award.
                        </EmptyDescription>
                      </EmptyContent>
                    </Empty>
                  )
                ) : (
                  <Empty className="rounded-xl border border-dashed bg-card/30 px-4 py-7">
                    <EmptyContent>
                      <EmptyMedia variant="icon">
                        <Shield className="h-5 w-5" />
                      </EmptyMedia>
                      <EmptyTitle>No profile selected</EmptyTitle>
                      <EmptyDescription>
                        Pick a user from search results to inspect and manage
                        awards.
                      </EmptyDescription>
                    </EmptyContent>
                  </Empty>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
