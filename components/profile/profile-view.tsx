// ============================================================================
// JanitorForge - Profile View
// Displays user profile with edit button
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { User, Pencil, Calendar, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getOwnProfile } from "@/app/actions/profile";
import { ProfileEditor } from "./profile-editor";

interface ProfileData {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  tagline: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  slug: string | null;
  is_admin: boolean;
  created_at: string;
}

interface ProfileViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAvatarUpdate?: (url: string | null) => void;
}

export function ProfileView({
  open,
  onOpenChange,
  onAvatarUpdate,
}: ProfileViewProps) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    const result = await getOwnProfile();
    if (result.success && result.profile) {
      setProfile(result.profile);
      onAvatarUpdate?.(result.profile.avatar_url);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    loadProfile();
  }, [open]);

  const handleEditorClose = () => {
    setEditorOpen(false);
    // Reload profile after editing
    loadProfile();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              My Profile
            </DialogTitle>
            <DialogDescription>
              Your public profile visible to other users.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading profile...
            </div>
          ) : profile ? (
            <div className="space-y-5">
              {/* Avatar + Name */}
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden ring-2 ring-primary/20">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || profile.username || "Avatar"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold tracking-tight">
                    {profile.display_name || profile.username || "Unnamed"}
                  </h2>
                  {profile.username && (
                    <p className="text-sm text-muted-foreground">
                      @{profile.username}
                    </p>
                  )}
                  {profile.tagline && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {profile.tagline}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {profile.is_admin && (
                      <Badge variant="secondary" className="text-[10px]">
                        Admin
                      </Badge>
                    )}
                    {profile.slug && (
                      <Badge variant="outline" className="text-[10px]">
                        /{profile.slug}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Username</p>
                  <p className="text-sm font-medium mt-0.5">
                    {profile.username || "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="text-sm font-medium mt-0.5">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Public URL */}
              {profile.slug && (
                <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">
                    janitorforge.com/{profile.slug}
                  </span>
                </div>
              )}

              {/* Edit Button */}
              <Button
                className="w-full cursor-pointer"
                onClick={() => setEditorOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Could not load profile.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nested Editor */}
      <ProfileEditor open={editorOpen} onOpenChange={handleEditorClose} />
    </>
  );
}
