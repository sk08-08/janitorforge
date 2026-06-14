// ============================================================================
// JanitorForge - Profile Editor (Tabbed)
// Rich profile customization with General, Social, Appearance, Featured, Privacy
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
} from "lucide-react";
import { getOwnProfile, updateProfile } from "@/app/actions/profile";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

interface ProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

interface SocialLink {
  platform: string;
  url: string;
  label: string;
  icon: string;
}

const socialPlatforms = [
  { key: "twitter", label: "Twitter / X", icon: "Twitter" },
  { key: "discord", label: "Discord", icon: "MessageCircle" },
  { key: "github", label: "GitHub", icon: "Globe" },
  { key: "tiktok", label: "TikTok", icon: "Globe" },
  { key: "youtube", label: "YouTube", icon: "Globe" },
  { key: "twitch", label: "Twitch", icon: "Globe" },
  { key: "website", label: "Website", icon: "Globe" },
];

const accentPresets = [
  { label: "Violet", value: "#7c3aed" },
  { label: "Emerald", value: "#10b981" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Slate", value: "#64748b" },
];

export function ProfileEditor({
  open,
  onOpenChange,
  onSaved,
}: ProfileEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // General
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
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
        setSlug(p.slug || "");
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
        setShowStats(theme.showStats !== false);
        setShowBadges(theme.showBadges !== false);
        setShowFeatured(theme.showFeatured !== false);
        setHideCompletenessNudge(theme.hideCompletenessNudge === "true");
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
        slug,
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
          showStats: String(showStats),
          showBadges: String(showBadges),
          showFeatured: String(showFeatured),
          hideCompletenessNudge: String(hideCompletenessNudge),
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
    if (specialtyInput.trim() && !specialties.includes(specialtyInput.trim())) {
      setSpecialties([...specialties, specialtyInput.trim()]);
      setSpecialtyInput("");
    }
  };

  const removeSpecialty = (s: string) => {
    setSpecialties(specialties.filter((t) => t !== s));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
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
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="general" className="text-xs px-1 py-1.5">
                <User className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                General
              </TabsTrigger>
              <TabsTrigger value="social" className="text-xs px-1 py-1.5">
                <Share2 className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Social
              </TabsTrigger>
              <TabsTrigger value="appearance" className="text-xs px-1 py-1.5">
                <Palette className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Theme
              </TabsTrigger>
              <TabsTrigger value="featured" className="text-xs px-1 py-1.5">
                <Star className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Featured
              </TabsTrigger>
              <TabsTrigger value="privacy" className="text-xs px-1 py-1.5">
                <Shield className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Privacy
              </TabsTrigger>
            </TabsList>

            {/* ===== GENERAL TAB ===== */}
            <TabsContent value="general" className="space-y-4 mt-4">
              {/* Avatar preview */}
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <div className="h-20 w-20 rounded-full border-2 border-dashed border-border overflow-hidden bg-muted flex items-center justify-center">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                        onError={(e) =>
                          ((e.target as HTMLImageElement).style.display =
                            "none")
                        }
                      />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <Label>Avatar URL</Label>
                  <Input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                  />
                </div>
              </div>

              {/* Banner URL */}
              <div className="space-y-1.5">
                <Label>Banner Image URL</Label>
                <Input
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://example.com/banner.png"
                />
                {bannerUrl && (
                  <div className="h-20 w-full rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={bannerUrl}
                      alt="Banner preview"
                      className="h-full w-full object-cover"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).style.display = "none")
                      }
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Display Name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    maxLength={64}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Profile URL</Label>
                  <div className="flex items-center gap-0">
                    <span className="flex h-10 shrink-0 items-center rounded-l-md border border-r-0 bg-muted px-3 text-xs text-muted-foreground">
                      /
                    </span>
                    <Input
                      value={slug}
                      onChange={(e) =>
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "-")
                            .replace(/-+/g, "-"),
                        )
                      }
                      placeholder="your-slug"
                      maxLength={48}
                      className="rounded-l-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Pronouns</Label>
                  <Select value={pronouns} onValueChange={setPronouns}>
                    <SelectTrigger>
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
                  <Label>
                    <MapPin className="inline h-3 w-3 mr-1" />
                    Location
                  </Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, Country"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Tagline</Label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="A short tagline about yourself"
                  maxLength={120}
                />
                <p className="text-[10px] text-muted-foreground">
                  {tagline.length}/120 characters
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>
                  <MessageCircle className="inline h-3 w-3 mr-1" />
                  Status Message
                </Label>
                <Input
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  placeholder="What are you working on?"
                  maxLength={128}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community about yourself..."
                  rows={5}
                  maxLength={2000}
                />
                <p className="text-[10px] text-muted-foreground">
                  {bio.length}/2000 characters
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>
                  <Globe className="inline h-3 w-3 mr-1" />
                  Website URL
                </Label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </div>

              {/* Specialties */}
              <div className="space-y-1.5">
                <Label>Specialties</Label>
                <div className="flex gap-2">
                  <Input
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    placeholder="e.g., horror bots, romance..."
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addSpecialty())
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addSpecialty}
                    className="cursor-pointer"
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
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeSpecialty(s)}
                      >
                        {s} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ===== SOCIAL TAB ===== */}
            <TabsContent value="social" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Add your social media links. They will appear as icons on your
                public profile.
              </p>
              {socialPlatforms.map((platform) => (
                <div key={platform.key} className="space-y-1.5">
                  <Label>{platform.label}</Label>
                  <Input
                    value={socialLinks[platform.key] || ""}
                    onChange={(e) =>
                      setSocialLinks({
                        ...socialLinks,
                        [platform.key]: e.target.value,
                      })
                    }
                    placeholder={
                      platform.key === "discord"
                        ? "username#0000"
                        : `https://${platform.key}.com/...`
                    }
                  />
                </div>
              ))}
            </TabsContent>

            {/* ===== APPEARANCE TAB ===== */}
            <TabsContent value="appearance" className="space-y-4 mt-4">
              {/* Avatar Border Color */}
              <div className="space-y-1.5">
                <Label>Avatar Border Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={avatarBorderColor}
                    onChange={(e) => setAvatarBorderColor(e.target.value)}
                    className="h-10 w-10 rounded-full cursor-pointer border"
                  />
                  <Input
                    value={avatarBorderColor}
                    onChange={(e) => setAvatarBorderColor(e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex gap-1.5">
                    {accentPresets.map((preset) => (
                      <button
                        key={preset.value}
                        className="h-5 w-5 rounded-full border cursor-pointer"
                        style={{ backgroundColor: preset.value }}
                        onClick={() => setAvatarBorderColor(preset.value)}
                        title={preset.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-10 rounded cursor-pointer border"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    {accentPresets.map((preset) => (
                      <button
                        key={preset.value}
                        className="h-5 w-5 rounded-full border cursor-pointer"
                        style={{ backgroundColor: preset.value }}
                        onClick={() => setPrimaryColor(preset.value)}
                        title={preset.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 w-10 rounded cursor-pointer border"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Layout</Label>
                  <Select value={layout} onValueChange={setLayout}>
                    <SelectTrigger>
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
                  <Label>Card Style</Label>
                  <Select value={cardStyle} onValueChange={setCardStyle}>
                    <SelectTrigger>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Font Family</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger>
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
                  <Label>Background Style</Label>
                  <Select
                    value={profileBackground}
                    onValueChange={setProfileBackground}
                  >
                    <SelectTrigger>
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

              {/* Visibility toggles */}
              <div className="space-y-3 pt-2">
                <Label>Profile Sections</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={showStats} onCheckedChange={setShowStats} />
                  <Label className="cursor-pointer text-sm">
                    Show Statistics
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showBadges}
                    onCheckedChange={setShowBadges}
                  />
                  <Label className="cursor-pointer text-sm">Show Badges</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showFeatured}
                    onCheckedChange={setShowFeatured}
                  />
                  <Label className="cursor-pointer text-sm">
                    Show Featured Bots
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={hideCompletenessNudge}
                    onCheckedChange={setHideCompletenessNudge}
                  />
                  <Label className="cursor-pointer text-sm">
                    Hide "Complete Profile" Nudge
                  </Label>
                </div>
              </div>
            </TabsContent>

            {/* ===== FEATURED TAB ===== */}
            <TabsContent value="featured" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Select bots to feature on your profile. Featured bots appear as
                highlighted cards.
              </p>
              {bots.length > 0 ? (
                <div className="space-y-2">
                  {bots.map((bot) => {
                    const isSelected = featuredBotIds.includes(bot.id);
                    return (
                      <label
                        key={bot.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/30"
                        }`}
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
                          className="rounded"
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
                          <p className="text-sm font-medium truncate">
                            {bot.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {bot.shortDescription || "No description"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0"
                        >
                          {bot.rating}
                        </Badge>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No bots created yet. Create a bot first to feature it on your
                  profile.
                </div>
              )}
              {featuredBotIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {featuredBotIds.length} bot
                  {featuredBotIds.length !== 1 ? "s" : ""} selected for
                  featuring
                </p>
              )}
            </TabsContent>

            {/* ===== PRIVACY TAB ===== */}
            <TabsContent value="privacy" className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label>Profile Visibility</Label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      Public - Anyone can view
                    </SelectItem>
                    <SelectItem value="followers">
                      Followers Only - Only followers can view
                    </SelectItem>
                    <SelectItem value="private">
                      Private - Only you can view
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {visibility === "public" &&
                    "Your profile is visible to everyone, including search engines."}
                  {visibility === "followers" &&
                    "Only users who follow you can see your full profile."}
                  {visibility === "private" &&
                    "Your profile is hidden from everyone except you."}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Save button */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
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
