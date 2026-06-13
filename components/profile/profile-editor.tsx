// ============================================================================
// JanitorForge - Profile Editor
// Dialog/drawer for editing user profile
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { User, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getOwnProfile, updateProfile } from "@/app/actions/profile";
import { toast } from "sonner";

interface ProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileEditor({ open, onOpenChange }: ProfileEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [slug, setSlug] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setLoading(true);

    getOwnProfile().then((result) => {
      if (!mounted) return;
      if (result.success && result.profile) {
        setDisplayName(result.profile.display_name || "");
        setTagline(result.profile.tagline || "");
        setBio(result.profile.bio || "");
        setSlug(result.profile.slug || "");
        setAvatarUrl(result.profile.avatar_url || "");
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateProfile({
      display_name: displayName,
      tagline,
      bio,
      slug: slug || undefined,
      avatar_url: avatarUrl || undefined,
    });
    setSaving(false);

    if (result.success) {
      toast.success("Profile updated");
      onOpenChange(false);
    } else {
      toast.error(result.error || "Failed to update profile");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Customize your public profile. Other users will see this when they
            visit your creator page.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading profile...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-display-name">Display Name</Label>
              <Input
                id="profile-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                maxLength={64}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-slug">
                Profile URL
                <span className="ml-1 text-xs text-muted-foreground font-normal">
                  (unique)
                </span>
              </Label>
              <div className="flex items-center gap-0">
                <span className="flex h-10 items-center rounded-l-md border border-r-0 bg-muted px-3 text-xs text-muted-foreground">
                  /
                </span>
                <Input
                  id="profile-slug"
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "-")
                        .replace(/-+/g, "-"),
                    )
                  }
                  placeholder="your-username"
                  maxLength={48}
                  className="rounded-l-none"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Your public profile will be at janitorforge.com/
                {slug || "your-slug"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-tagline">Tagline</Label>
              <Input
                id="profile-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="A short description of what you create"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-bio">Bio</Label>
              <Textarea
                id="profile-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others about yourself, your creative process, and your bots."
                rows={4}
                maxLength={2000}
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {bio.length}/2000
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-avatar">Avatar URL</Label>
              <Input
                id="profile-avatar"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
                maxLength={512}
              />
              {avatarUrl && (
                <div className="flex items-center gap-2 mt-1">
                  <img
                    src={avatarUrl}
                    alt="Avatar preview"
                    className="h-10 w-10 rounded-full object-cover border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Preview</span>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || saving}
            className="cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Save Profile
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
