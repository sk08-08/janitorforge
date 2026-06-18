// ============================================================================
// JanitorForge - Collaborator Dialog
// Invite and manage bot co-creators
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import {
  Users,
  User,
  UserPlus,
  Trash2,
  Check,
  X,
  Loader2,
  Eye,
  Pencil,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  inviteCollaborator,
  getBotCollaborators,
  removeCollaborator,
  getMyFollowing,
} from "@/app/actions/collaboration";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CollaboratorRole = "viewer" | "editor" | "co_owner";

interface CollaboratorProfile {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface CollaboratorRecord {
  id: string;
  user_id: string;
  invited_by: string;
  role: CollaboratorRole;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  profile?: CollaboratorProfile | null;
  inviter?: { username: string | null; display_name: string | null } | null;
}

interface CollaboratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botId: string;
  botName: string;
}

const roleConfig: Record<
  CollaboratorRole,
  { label: string; icon: typeof Eye; description: string; className: string }
> = {
  viewer: {
    label: "Viewer",
    icon: Eye,
    description: "Can view the bot",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  editor: {
    label: "Editor",
    icon: Pencil,
    description: "Can view and edit the bot",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  co_owner: {
    label: "Co-owner",
    icon: Crown,
    description: "Full control over the bot",
    className: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  accepted: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  declined: {
    label: "Declined",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function CollaboratorDialog({
  open,
  onOpenChange,
  botId,
  botName,
}: CollaboratorDialogProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>("editor");
  const [inviting, setInviting] = useState(false);
  const [suggestions, setSuggestions] = useState<
    Array<{
      id: string;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
    }>
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setLoading(true);

    // Load collaborators and following list in parallel
    Promise.all([getBotCollaborators(botId), getMyFollowing()]).then(
      ([collabResult, followingResult]) => {
        if (!mounted) return;
        setCollaborators(collabResult.collaborators as CollaboratorRecord[]);
        if (followingResult.success && followingResult.following) {
          setSuggestions(followingResult.following as typeof suggestions);
        }
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
    };
  }, [open, botId]);

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;

    setInviting(true);
    const result = await inviteCollaborator(botId, inviteUsername, inviteRole);
    setInviting(false);

    if (result.success) {
      toast.success(`Invitation sent to @${result.invitedUsername}`);
      setInviteUsername("");
      // Refresh list
      const refreshed = await getBotCollaborators(botId);
      setCollaborators(refreshed.collaborators as CollaboratorRecord[]);
    } else {
      toast.error(result.error || "Failed to send invitation");
    }
  };

  const handleRemove = async (collaboratorId: string) => {
    const result = await removeCollaborator(collaboratorId);
    if (result.success) {
      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
      toast.success("Collaborator removed");
    } else {
      toast.error(result.error || "Failed to remove collaborator");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Collaborators
          </DialogTitle>
          <DialogDescription>
            Invite co-creators to work on "{botName}". They can view or edit the
            bot based on their assigned role.
          </DialogDescription>
        </DialogHeader>

        {/* Invite form */}
        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-4">
          <Label className="text-sm font-medium">Invite a collaborator</Label>
          <div className="flex flex-col gap-2 sm:flex-row relative">
            <div className="flex-1 relative">
              <Input
                value={inviteUsername}
                onChange={(e) => {
                  setInviteUsername(e.target.value.toLowerCase());
                  setShowSuggestions(e.target.value.length > 0);
                }}
                onFocus={() => setShowSuggestions(inviteUsername.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Username"
                className="w-full"
                maxLength={48}
              />
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                  {suggestions
                    .filter(
                      (s) =>
                        (s.username || "")
                          .toLowerCase()
                          .includes(inviteUsername) ||
                        (s.display_name || "")
                          .toLowerCase()
                          .includes(inviteUsername),
                    )
                    .filter(
                      (s) => !collaborators.some((c) => c.user_id === s.id),
                    )
                    .slice(0, 5)
                    .map((s) => (
                      <button
                        key={s.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted cursor-pointer"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setInviteUsername(s.username || "");
                          setShowSuggestions(false);
                        }}
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 overflow-hidden shrink-0">
                          {s.avatar_url ? (
                            <img
                              src={s.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-3 w-3 text-primary" />
                          )}
                        </div>
                        <span className="font-medium">
                          {s.display_name || s.username}
                        </span>
                        {s.username && s.display_name && (
                          <span className="text-muted-foreground text-xs">
                            @{s.username}
                          </span>
                        )}
                      </button>
                    ))}
                  {suggestions.filter(
                    (s) =>
                      ((s.username || "")
                        .toLowerCase()
                        .includes(inviteUsername) ||
                        (s.display_name || "")
                          .toLowerCase()
                          .includes(inviteUsername)) &&
                      !collaborators.some((c) => c.user_id === s.id),
                  ).length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      No matches in your following list
                    </p>
                  )}
                </div>
              )}
            </div>
            <Select
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as CollaboratorRole)}
            >
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="co_owner">Co-owner</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleInvite}
              disabled={!inviteUsername.trim() || inviting}
              className="cursor-pointer"
            >
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1" /> Invite
                </>
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {roleConfig[inviteRole].description}
          </p>
        </div>

        {/* Collaborator list */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Current collaborators
            {collaborators.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground font-normal">
                ({collaborators.length})
              </span>
            )}
          </Label>

          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </div>
          ) : collaborators.length > 0 ? (
            <div className="space-y-2">
              {collaborators.map((collab) => {
                const roleConf = roleConfig[collab.role];
                const statusConf = statusConfig[collab.status];
                const RoleIcon = roleConf.icon;

                return (
                  <div
                    key={collab.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/50 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <RoleIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {collab.profile?.display_name ||
                            collab.profile?.username ||
                            "Unknown user"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              roleConf.className,
                            )}
                          >
                            {roleConf.label}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              statusConf.className,
                            )}
                          >
                            {statusConf.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer flex-shrink-0"
                      onClick={() => handleRemove(collab.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
              No collaborators yet. Invite someone to co-create this bot.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
