// ============================================================================
// JanitorForge - Profile Editor (Tabbed)
// Rich profile customization with General, Social, Appearance, Featured, Privacy
// Fully responsive with improved UX
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Share2,
  Palette,
  Star,
  Shield,
  Save,
  Loader2,
  X,
  Plus,
  MapPin,
  Globe,
  MessageCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from "lucide-react";
import { getOwnProfile, updateProfile } from "@/app/actions/profile";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------------
// Types & Constants
// ----------------------------------------------------------------------------

interface ProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const socialPlatforms = [
  { key: "twitter", label: "Twitter / X", placeholder: "https://x.com/..." },
  { key: "discord", label: "Discord", placeholder: "username#0000" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/..." },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/..." },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/..." },
  { key: "twitch", label: "Twitch", placeholder: "https://twitch.tv/..." },
  { key: "website", label: "Website", placeholder: "https://..." },
];

const accentPresets = [
  { label: "Violet", value: "#7c3aed" },
  { label: "Emerald", value: "#10b981" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Slate", value: "#64748b" },
  { label: "Fuchsia", value: "#d946ef" },
  { label: "Teal", value: "#14b8a6" },
];

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-9 rounded-full cursor-pointer border-2 border-border appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-xs h-9"
          maxLength={7}
        />
      </div>
      <div className="flex gap-1 mt-1">
        {accentPresets.slice(0, 6).map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={cn(
              "h-5 w-5 rounded-full border cursor-pointer transition-transform hover:scale-110",
              value === preset.value && "ring-2 ring-primary ring-offset-1",
            )}
            style={{ backgroundColor: preset.value }}
            onClick={() => onChange(preset.value)}
            title={preset.label}
          />
        ))}
      </div>
    </div>
  );
}

function ImagePreview({
  url,
  alt,
  fallback,
  aspectRatio = "square",
  className,
}: {
  url: string;
  alt: string;
  fallback: React.ReactNode;
  aspectRatio?: "square" | "banner";
  className?: string;
}) {
  const [error, setError] = useState(false);

  if (!url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted border-2 border-dashed border-border",
          aspectRatio === "square"
            ? "h-20 w-20 rounded-full"
            : "h-24 w-full rounded-lg",
          className,
        )}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden border bg-muted relative",
        aspectRatio === "square"
          ? "h-20 w-20 rounded-full"
          : "h-24 w-full rounded-lg",
        className,
      )}
    >
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          {fallback}
        </div>
      ) : (
        <img
          src={url}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------------

export function ProfileEditor({
  open,
  onOpenChange,
  onSaved,
}: ProfileEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // General
  const [displayName, setDisplayName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Specialties
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState("");

  // Social links
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  // Theme
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [accentColor, setAccentColor] = useState("#a78bfa");
  const [avatarBorderColor, setAvatarBorderColor] = useState("#7c3aed");
  const [layout, setLayout] = useState("grid");
  const [cardStyle, setCardStyle] = useState("default");
  const [fontFamily, setFontFamily] = useState("default");
  const [profileBackground, setProfileBackground] = useState("default");
  const [showStats, setShowStats] = useState(true);
  const [showBadges, setShowBadges] = useState(true);
  const [showFeatured, setShowFeatured] = useState(true);
  const [hideCompletenessNudge, setHideCompletenessNudge] = useState(false);

  // Privacy
  const [visibility, setVisibility] = useState("public");

  // Featured bots
  const [featuredBotIds, setFeaturedBotIds] = useState<string[]>([]);
  const { bots } = useStore();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOwnProfile();
      if (result.success && result.profile) {
        const p = result.profile;
        setDisplayName(p.display_name || "");
        setPronouns(p.pronouns || "");
        setTagline(p.tagline || "");
        setBio(p.bio || "");
        setAvatarUrl(p.avatar_url || "");
        setBannerUrl(p.banner_url || "");
        setLocation(p.location || "");
        setWebsiteUrl(p.website_url || "");
        setStatusMessage(p.status_message || "");
        setSpecialties(p.specialties || []);
        setSocialLinks(p.social_links || {});
        setVisibility(p.visibility || "public");
        setFeaturedBotIds(p.featured_bot_ids || []);

        const theme = (p.theme as Record<string, unknown>) || {};
        setPrimaryColor((theme.primaryColor as string) || "#7c3aed");
        setAccentColor((theme.accentColor as string) || "#a78bfa");
        setAvatarBorderColor(
          (theme.avatarBorderColor as string) ||
            (theme.primaryColor as string) ||
            "#7c3aed",
        );
        setLayout((theme.layout as string) || "grid");
        setCardStyle((theme.cardStyle as string) || "default");
        setFontFamily((theme.fontFamily as string) || "default");
        setProfileBackground((theme.profileBackground as string) || "default");
        setShowStats(theme.showStats === true || theme.showStats === "true");
        setShowBadges(theme.showBadges === true || theme.showBadges === "true");
        setShowFeatured(
          theme.showFeatured === true || theme.showFeatured === "true",
        );
        setHideCompletenessNudge(
          theme.hideCompletenessNudge === true ||
            theme.hideCompletenessNudge === "true",
        );
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateProfile({
        display_name: displayName,
        pronouns,
        tagline,
        bio,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        location,
        website_url: websiteUrl,
        status_message: statusMessage,
        specialties,
        social_links: socialLinks,
        visibility,
        featured_bot_ids: featuredBotIds,
        theme: {
          primaryColor,
          accentColor,
          avatarBorderColor,
          layout,
          cardStyle,
          fontFamily,
          profileBackground,
          showStats,
          showBadges,
          showFeatured,
          hideCompletenessNudge,
        },
      });

      if (result.success) {
        toast.success("Profile saved!");
        onSaved?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to save profile");
      }
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const addSpecialty = () => {
    const trimmed = specialtyInput.trim();
    if (trimmed && !specialties.includes(trimmed) && specialties.length < 10) {
      setSpecialties([...specialties, trimmed]);
      setSpecialtyInput("");
    }
  };

  const removeSpecialty = (s: string) => {
    setSpecialties(specialties.filter((t) => t !== s));
  };

  const filledSocialCount = Object.values(socialLinks).filter(
    (v) => v && v.trim(),
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Customize your public profile. Changes are saved when you click
            Save.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs
            defaultValue="general"
            className="flex-1 overflow-hidden flex flex-col min-h-0"
          >
            {/* Responsive tab bar — horizontal scroll on mobile */}
            <TabsList className="shrink-0 w-full overflow-x-auto flex sm:grid sm:grid-cols-5 h-auto gap-0.5 sm:gap-1 scrollbar-none">
              <TabsTrigger
                value="general"
                className="text-xs px-2 sm:px-1 py-1.5 whitespace-nowrap flex-shrink-0 sm:flex-shrink"
              >
                <User className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                General
              </TabsTrigger>
              <TabsTrigger
                value="social"
                className="text-xs px-2 sm:px-1 py-1.5 whitespace-nowrap flex-shrink-0 sm:flex-shrink"
              >
                <Share2 className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Social
                {filledSocialCount > 0 && (
                  <span className="ml-1 text-[10px] opacity-60">
                    ({filledSocialCount})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="text-xs px-2 sm:px-1 py-1.5 whitespace-nowrap flex-shrink-0 sm:flex-shrink"
              >
                <Palette className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Theme
              </TabsTrigger>
              <TabsTrigger
                value="featured"
                className="text-xs px-2 sm:px-1 py-1.5 whitespace-nowrap flex-shrink-0 sm:flex-shrink"
              >
                <Star className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Featured
                {featuredBotIds.length > 0 && (
                  <span className="ml-1 text-[10px] opacity-60">
                    ({featuredBotIds.length})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="text-xs px-2 sm:px-1 py-1.5 whitespace-nowrap flex-shrink-0 sm:flex-shrink"
              >
                <Shield className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Privacy
              </TabsTrigger>
            </TabsList>

            {/* ===== GENERAL TAB ===== */}
            <TabsContent
              value="general"
              className="space-y-4 mt-4 overflow-y-auto pr-1 flex-1 min-h-0"
            >
              {/* Avatar & Banner Preview — stacked on mobile */}
              <div className="space-y-3">
                {/* Banner */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> Banner
                  </Label>
                  <ImagePreview
                    url={bannerUrl}
                    alt="Banner preview"
                    aspectRatio="banner"
                    fallback={
                      <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                    }
                  />
                  <Input
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://example.com/banner.png"
                    className="text-xs"
                  />
                </div>

                {/* Avatar */}
                <div className="flex items-end gap-3">
                  <ImagePreview
                    url={avatarUrl}
                    alt="Avatar preview"
                    aspectRatio="square"
                    fallback={
                      <User className="h-8 w-8 text-muted-foreground/40" />
                    }
                  />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <Label className="text-xs flex items-center gap-1">
                      <User className="h-3 w-3" /> Avatar URL
                    </Label>
                    <Input
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Name & Slug */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Display Name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    maxLength={64}
                  />
                </div>
              </div>

              {/* Pronouns & Location */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Pronouns</Label>
                  <Select value={pronouns} onValueChange={setPronouns}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="he/him">he/him</SelectItem>
                      <SelectItem value="she/her">she/her</SelectItem>
                      <SelectItem value="they/them">they/them</SelectItem>
                      <SelectItem value="he/they">he/they</SelectItem>
                      <SelectItem value="she/they">she/they</SelectItem>
                      <SelectItem value="any">any pronouns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Location
                  </Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, Country"
                    maxLength={100}
                  />
                </div>
              </div>

              {/* Tagline */}
              <div className="space-y-1.5">
                <Label className="text-xs">Tagline</Label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="A short tagline about yourself"
                  maxLength={120}
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {tagline.length}/120
                </p>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" /> Status Message
                </Label>
                <Input
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  placeholder="What are you working on?"
                  maxLength={128}
                />
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <Label className="text-xs">Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community about yourself..."
                  rows={4}
                  maxLength={2000}
                  className="resize-none"
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {bio.length}/2000
                </p>
              </div>

              {/* Website */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Website
                </Label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </div>

              {/* Specialties */}
              <div className="space-y-1.5">
                <Label className="text-xs">Specialties</Label>
                <div className="flex gap-2">
                  <Input
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    placeholder="e.g., horror bots, romance..."
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addSpecialty())
                    }
                    maxLength={30}
                    disabled={specialties.length >= 10}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addSpecialty}
                    className="cursor-pointer shrink-0 h-9 w-9 p-0"
                    disabled={
                      !specialtyInput.trim() ||
                      specialties.includes(specialtyInput.trim()) ||
                      specialties.length >= 10
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {specialties.map((s) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors gap-1"
                        onClick={() => removeSpecialty(s)}
                      >
                        {s}
                        <X className="h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {specialties.length}/10 specialties
                </p>
              </div>
            </TabsContent>

            {/* ===== SOCIAL TAB ===== */}
            <TabsContent
              value="social"
              className="space-y-3 mt-4 overflow-y-auto pr-1 flex-1 min-h-0"
            >
              <p className="text-xs text-muted-foreground">
                Add your social media links. They will appear as icons on your
                public profile.
              </p>
              {socialPlatforms.map((platform) => (
                <div key={platform.key} className="space-y-1">
                  <Label className="text-xs">{platform.label}</Label>
                  <Input
                    value={socialLinks[platform.key] || ""}
                    onChange={(e) =>
                      setSocialLinks({
                        ...socialLinks,
                        [platform.key]: e.target.value,
                      })
                    }
                    placeholder={platform.placeholder}
                    className="text-xs"
                  />
                </div>
              ))}
            </TabsContent>

            {/* ===== APPEARANCE TAB ===== */}
            <TabsContent
              value="appearance"
              className="space-y-5 mt-4 overflow-y-auto pr-1 flex-1 min-h-0"
            >
              {/* Avatar Border */}
              <ColorPickerField
                label="Avatar Border Color"
                value={avatarBorderColor}
                onChange={setAvatarBorderColor}
              />

              {/* Primary & Accent */}
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorPickerField
                  label="Primary Color"
                  value={primaryColor}
                  onChange={setPrimaryColor}
                />
                <ColorPickerField
                  label="Accent Color"
                  value={accentColor}
                  onChange={setAccentColor}
                />
              </div>

              {/* Layout & Card Style */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Layout</Label>
                  <Select value={layout} onValueChange={setLayout}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="showcase">Showcase</SelectItem>
                      <SelectItem value="list">List</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Card Style</Label>
                  <Select value={cardStyle} onValueChange={setCardStyle}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="bordered">Bordered</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="glass">Glass</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Font & Background */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Font Family</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (Inter)</SelectItem>
                      <SelectItem value="serif">Serif</SelectItem>
                      <SelectItem value="mono">Monospace</SelectItem>
                      <SelectItem value="display">Display</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Background Style</Label>
                  <Select
                    value={profileBackground}
                    onValueChange={setProfileBackground}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="ambient">Ambient</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Section Toggles */}
              <div className="space-y-3">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Profile Sections
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      label: "Show Statistics",
                      value: showStats,
                      onChange: setShowStats,
                    },
                    {
                      label: "Show Badges",
                      value: showBadges,
                      onChange: setShowBadges,
                    },
                    {
                      label: "Show Featured Bots",
                      value: showFeatured,
                      onChange: setShowFeatured,
                    },
                    {
                      label: "Hide Completeness Nudge",
                      value: hideCompletenessNudge,
                      onChange: setHideCompletenessNudge,
                    },
                  ].map((toggle) => (
                    <div
                      key={toggle.label}
                      className="flex items-center justify-between rounded-lg border p-2.5"
                    >
                      <Label className="text-xs cursor-pointer">
                        {toggle.label}
                      </Label>
                      <Switch
                        checked={toggle.value}
                        onCheckedChange={toggle.onChange}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ===== FEATURED TAB ===== */}
            <TabsContent
              value="featured"
              className="space-y-3 mt-4 overflow-y-auto pr-1 flex-1 min-h-0"
            >
              <p className="text-xs text-muted-foreground">
                Select bots to feature on your profile.
              </p>
              {bots.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {bots.map((bot) => {
                    const isSelected = featuredBotIds.includes(bot.id);
                    return (
                      <label
                        key={bot.id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "hover:border-primary/30",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFeaturedBotIds([...featuredBotIds, bot.id]);
                            } else {
                              setFeaturedBotIds(
                                featuredBotIds.filter((id) => id !== bot.id),
                              );
                            }
                          }}
                          className="rounded shrink-0"
                        />
                        <div className="h-8 w-8 rounded bg-muted overflow-hidden shrink-0">
                          {bot.imageUrl ? (
                            <img
                              src={bot.imageUrl}
                              alt={bot.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Star className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {bot.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {bot.shortDescription || "No description"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] shrink-0"
                        >
                          {bot.rating}
                        </Badge>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                  No bots created yet. Create a bot first to feature it.
                </div>
              )}
            </TabsContent>

            {/* ===== PRIVACY TAB ===== */}
            <TabsContent
              value="privacy"
              className="space-y-4 mt-4 overflow-y-auto pr-1 flex-1 min-h-0"
            >
              <div className="space-y-1.5">
                <Label className="text-xs">Profile Visibility</Label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5 text-emerald-500" />
                        Public
                      </div>
                    </SelectItem>
                    <SelectItem value="followers">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-amber-500" />
                        Followers Only
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <EyeOff className="h-3.5 w-3.5 text-red-500" />
                        Private
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Visibility explanation card */}
              <div
                className={cn(
                  "rounded-lg border p-3 text-xs space-y-1",
                  visibility === "public" &&
                    "border-emerald-500/30 bg-emerald-500/5",
                  visibility === "followers" &&
                    "border-amber-500/30 bg-amber-500/5",
                  visibility === "private" && "border-red-500/30 bg-red-500/5",
                )}
              >
                {visibility === "public" && (
                  <>
                    <p className="font-medium text-emerald-600">
                      🌐 Public Profile
                    </p>
                    <p className="text-muted-foreground">
                      Anyone can view your profile, including search engines.
                      Your profile will appear in the public creator directory.
                    </p>
                  </>
                )}
                {visibility === "followers" && (
                  <>
                    <p className="font-medium text-amber-600">
                      👥 Followers Only
                    </p>
                    <p className="text-muted-foreground">
                      Only users who follow you can see your full profile.
                      Non-followers will see a limited preview.
                    </p>
                  </>
                )}
                {visibility === "private" && (
                  <>
                    <p className="font-medium text-red-600">🔒 Private</p>
                    <p className="text-muted-foreground">
                      Your profile is hidden from everyone except you. It won't
                      appear in directories or search results.
                    </p>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Save button — fixed at bottom */}
        <div className="shrink-0 flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="cursor-pointer"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
