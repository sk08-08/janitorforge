// ============================================================================
// JanitorForge - Collaborator Dialog (Overhaul v2)
// Full-featured collaboration: Members, Activity, Comments, Workspace
// ============================================================================

"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  Loader2,
  Eye,
  Pencil,
  Crown,
  MessageSquare,
  Activity,
  Clock,
  Shield,
  ChevronDown,
  Send,
  UserMinus,
  GitBranch,
  FileText,
  Download,
  Lock,
  UserRound,
  Zap,
  CheckCircle2,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  inviteCollaborator,
  getBotCollaborators,
  removeCollaborator,
  updateCollaboratorRole,
  getMyFollowing,
  getBotActivity,
  addBotComment,
  getBotComments,
  deleteBotComment,
  forkBot,
} from "@/app/actions/collaboration";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { botToCharacterCard } from "@/lib/bot-utils";
import { useStore } from "@/lib/store";
import type {
  CollaboratorRole,
  BotActivityEntry,
  BotComment,
} from "@/lib/types";
import { roleConfig } from "@/lib/types";
import { UserSearchInput } from "@/components/ui/user-search-input";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

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
  /** The current user's role for this bot. "owner" means they own the bot. */
  currentUserRole?: "owner" | CollaboratorRole;
}

type TabType = "members" | "activity" | "comments" | "workspace";

const roleIcons = {
  viewer: Eye,
  editor: Pencil,
  co_owner: Crown,
};

const activityLabels: Record<string, string> = {
  created: "created this bot",
  edited: "edited this bot",
  exported: "exported this bot",
  forked: "forked this bot",
  collaborator_invited: "invited a collaborator",
  collaborator_accepted: "accepted the invitation",
  collaborator_declined: "declined the invitation",
  collaborator_removed: "removed a collaborator",
  role_changed: "changed a collaborator's role",
  commented: "left a comment",
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function CollaboratorDialog({
  open,
  onOpenChange,
  botId,
  botName,
  currentUserRole = "owner",
}: CollaboratorDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>("members");
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

  // Activity state
  const [activity, setActivity] = useState<BotActivityEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Comments state
  const [comments, setComments] = useState<BotComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Store access for navigation
  const { setCurrentView, setSelectedBotId, getBot } = useStore();

  // Quick Action loading states
  const [forkingBot, setForkingBot] = useState(false);
  const [exportingCard, setExportingCard] = useState(false);

  const isOwner = currentUserRole === "owner";
  const canManage = isOwner || currentUserRole === "co_owner";
  const canEdit =
    isOwner || currentUserRole === "editor" || currentUserRole === "co_owner";

  // Load data when dialog opens
  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setLoading(true);

    Promise.all([getBotCollaborators(botId), getMyFollowing()]).then(
      ([collabResult, followingResult]) => {
        if (!mounted) return;
        if (collabResult.success) {
          setCollaborators(collabResult.collaborators as CollaboratorRecord[]);
        }
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

  // Load activity
  const loadActivity = useCallback(async () => {
    setLoadingActivity(true);
    const result = await getBotActivity(botId, 30);
    if (result.success) {
      setActivity(result.activity as BotActivityEntry[]);
    }
    setLoadingActivity(false);
  }, [botId]);

  // Load comments
  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    const result = await getBotComments(botId);
    if (result.success) {
      setComments(result.comments as BotComment[]);
    }
    setLoadingComments(false);
  }, [botId]);

  // Load data when tab changes
  useEffect(() => {
    if (!open) return;
    if (activeTab === "activity") loadActivity();
    if (activeTab === "comments") loadComments();
  }, [open, activeTab, loadActivity, loadComments]);

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;

    setInviting(true);
    const result = await inviteCollaborator(botId, inviteUsername, inviteRole);
    setInviting(false);

    if (result.success) {
      toast.success(`Invitation sent to @${result.invitedUsername}`);
      setInviteUsername("");
      const refreshed = await getBotCollaborators(botId);
      if (refreshed.success) {
        setCollaborators(refreshed.collaborators as CollaboratorRecord[]);
      }
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

  const handleRoleChange = async (
    collaboratorId: string,
    newRole: CollaboratorRole,
  ) => {
    const result = await updateCollaboratorRole(collaboratorId, newRole);
    if (result.success) {
      setCollaborators((prev) =>
        prev.map((c) =>
          c.id === collaboratorId ? { ...c, role: newRole } : c,
        ),
      );
      toast.success("Role updated");
    } else {
      toast.error(result.error || "Failed to update role");
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    const result = await addBotComment(botId, newComment);
    setSendingComment(false);
    if (result.success) {
      setNewComment("");
      toast.success("Comment added");
      // Reload comments immediately
      await loadComments();
    } else {
      toast.error(result.error || "Failed to add comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const result = await deleteBotComment(commentId);
    if (result.success) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Comment deleted");
    }
  };

  // Filter suggestions
  const filteredSuggestions = suggestions
    .filter(
      (s) =>
        (s.username || "").toLowerCase().includes(inviteUsername) ||
        (s.display_name || "").toLowerCase().includes(inviteUsername),
    )
    .filter((s) => !collaborators.some((c) => c.user_id === s.id))
    .slice(0, 5);

  // Split collaborators by status
  const activeCollabs = collaborators.filter((c) => c.status === "accepted");
  const pendingCollabs = collaborators.filter((c) => c.status === "pending");
  const declinedCollabs = collaborators.filter((c) => c.status === "declined");

  // Tabs config — owner/co-owner sees all tabs, others see activity+comments+workspace
  const tabs: Array<{ id: TabType; label: string; icon: typeof Users }> = [
    ...(isOwner || currentUserRole === "co_owner"
      ? [{ id: "members" as TabType, label: "Members", icon: Users }]
      : []),
    { id: "activity" as TabType, label: "Activity", icon: Activity },
    { id: "comments" as TabType, label: "Comments", icon: MessageSquare },
    { id: "workspace" as TabType, label: "Workspace", icon: Zap },
  ];

  // Default to first available tab if current tab is not available
  useEffect(() => {
    if (!open) return;
    if (!tabs.find((t) => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id || "activity");
    }
  }, [open, activeTab, tabs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1rem)] overflow-hidden flex flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <UsersRound className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-base">Collaborators</span>
              <span className="block text-xs font-normal text-muted-foreground truncate">
                {botName}
              </span>
            </div>
            {/* Role badge for non-owners */}
            {!isOwner && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] shrink-0",
                  roleConfig[currentUserRole]?.className || "",
                )}
              >
                {React.createElement(
                  roleIcons[currentUserRole as keyof typeof roleIcons] || Eye,
                  {
                    className: "h-3 w-3 mr-1",
                  },
                )}
                {roleConfig[currentUserRole]?.label || currentUserRole}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isOwner
              ? `Manage collaborators for ${botName}`
              : `Collaboration workspace for ${botName}`}
          </DialogDescription>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all cursor-pointer relative",
                  isActive
                    ? "bg-background text-foreground shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50 border border-transparent",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.id === "members" && collaborators.length > 0 && (
                  <span className="ml-0.5 text-[10px] opacity-60">
                    ({collaborators.length})
                  </span>
                )}
                {tab.id === "comments" && comments.length > 0 && (
                  <span className="ml-0.5 text-[10px] opacity-60">
                    ({comments.length})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
          {/* ====== MEMBERS TAB (owner/co-owner only) ====== */}
          {activeTab === "members" && (isOwner || canManage) && (
            <>
              {/* Invite form */}
              <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-4">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite a collaborator
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <UserSearchInput
                      value={inviteUsername}
                      onChange={setInviteUsername}
                      suggestions={suggestions}
                      excludeIds={collaborators.map((c) => c.user_id)}
                      placeholder="Search by username..."
                    />
                  </div>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as CollaboratorRole)}
                  >
                    <SelectTrigger className="w-full sm:w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-1.5">
                          <Eye className="h-3 w-3" />
                          Viewer
                        </div>
                      </SelectItem>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-1.5">
                          <Pencil className="h-3 w-3" />
                          Editor
                        </div>
                      </SelectItem>
                      <SelectItem value="co_owner">
                        <div className="flex items-center gap-1.5">
                          <Crown className="h-3 w-3" />
                          Co-owner
                        </div>
                      </SelectItem>
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
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {roleConfig[inviteRole].description}
                </p>
              </div>

              {/* Collaborator list */}
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading collaborators...
                </div>
              ) : (
                <>
                  {activeCollabs.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Active Members ({activeCollabs.length})
                      </Label>
                      {activeCollabs.map((collab) => {
                        const roleConf = roleConfig[collab.role];
                        const RoleIcon = roleIcons[collab.role];

                        return (
                          <div
                            key={collab.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/50 p-3 transition-colors hover:border-primary/20"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 overflow-hidden shrink-0">
                                {collab.profile?.avatar_url ? (
                                  <img
                                    src={collab.profile.avatar_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {collab.profile?.display_name ||
                                    collab.profile?.username ||
                                    "Unknown user"}
                                </p>
                                {collab.profile?.username &&
                                  collab.profile?.display_name && (
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      @{collab.profile.username}
                                    </p>
                                  )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-1.5 py-0",
                                  roleConf.className,
                                )}
                              >
                                <RoleIcon className="h-2.5 w-2.5 mr-0.5" />
                                {roleConf.label}
                              </Badge>

                              {/* Role change dropdown (owner only) */}
                              {isOwner && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {(
                                      ["viewer", "editor", "co_owner"] as const
                                    ).map((r) => (
                                      <DropdownMenuItem
                                        key={r}
                                        onClick={() =>
                                          handleRoleChange(collab.id, r)
                                        }
                                        disabled={collab.role === r}
                                        className={cn(
                                          "cursor-pointer",
                                          collab.role === r && "bg-muted",
                                        )}
                                      >
                                        {React.createElement(roleIcons[r], {
                                          className: "h-3.5 w-3.5 mr-2",
                                        })}
                                        {roleConfig[r].label}
                                        {collab.role === r && (
                                          <span className="ml-auto text-[10px] text-muted-foreground">
                                            current
                                          </span>
                                        )}
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuItem
                                      onClick={() => handleRemove(collab.id)}
                                      className="text-destructive cursor-pointer"
                                    >
                                      <UserMinus className="h-3.5 w-3.5 mr-2" />
                                      Remove
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {pendingCollabs.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Pending Invites ({pendingCollabs.length})
                      </Label>
                      {pendingCollabs.map((collab) => {
                        const roleConf = roleConfig[collab.role];
                        const RoleIcon = roleIcons[collab.role];

                        return (
                          <div
                            key={collab.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 shrink-0">
                                <Clock className="h-4 w-4 text-amber-500" />
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
                                    <RoleIcon className="h-2.5 w-2.5 mr-0.5" />
                                    {roleConf.label}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    Invited{" "}
                                    {new Date(
                                      collab.created_at,
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-white cursor-pointer shrink-0"
                                onClick={() => handleRemove(collab.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {declinedCollabs.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Declined ({declinedCollabs.length})
                      </Label>
                      {declinedCollabs.map((collab) => (
                        <div
                          key={collab.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 p-3 opacity-60"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0">
                              <UserRound className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-sm truncate">
                              {collab.profile?.display_name ||
                                collab.profile?.username ||
                                "Unknown"}
                            </p>
                          </div>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-white cursor-pointer shrink-0"
                              onClick={() => handleRemove(collab.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {collaborators.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/70 p-8 text-center">
                      <UsersRound className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No collaborators yet
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Invite someone to co-create this bot using the form
                        above
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ====== ACTIVITY TAB ====== */}
          {activeTab === "activity" && (
            <>
              {loadingActivity ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading activity...
                </div>
              ) : activity.length > 0 ? (
                <div className="space-y-1">
                  {activity.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 overflow-hidden shrink-0 mt-0.5">
                        {entry.avatar_url ? (
                          <img
                            src={entry.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserRound className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">
                            {entry.display_name || entry.username || "Someone"}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {activityLabels[entry.action] || entry.action}
                          </span>
                        </p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          {formatTimeAgo(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 p-8 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No activity yet
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Activity will appear here when collaborators interact with
                    this bot
                  </p>
                </div>
              )}
            </>
          )}

          {/* ====== COMMENTS TAB ====== */}
          {activeTab === "comments" && (
            <>
              {/* Comment input */}
              <div className="space-y-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Leave a comment or note for collaborators..."
                  className="min-h-[60px] resize-none text-sm"
                  maxLength={2000}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSendComment();
                    }
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Ctrl+Enter to send
                  </span>
                  <Button
                    size="sm"
                    onClick={handleSendComment}
                    disabled={!newComment.trim() || sendingComment}
                    className="cursor-pointer"
                  >
                    {sendingComment ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Send className="h-3.5 w-3.5 mr-1" />
                    )}
                    Post Comment
                  </Button>
                </div>
              </div>

              {/* Comments list */}
              {loadingComments ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading comments...
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="group rounded-lg border border-border/70 bg-background/50 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 overflow-hidden shrink-0">
                            {comment.profile?.avatar_url ? (
                              <img
                                src={comment.profile.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <UserRound className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          <span className="text-xs font-medium">
                            {comment.profile?.display_name ||
                              comment.profile?.username ||
                              "Unknown"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTimeAgo(comment.created_at)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 p-8 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No comments yet
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Use comments to leave notes and feedback for your
                    collaborators
                  </p>
                </div>
              )}
            </>
          )}

          {/* ====== WORKSPACE TAB ====== */}
          {activeTab === "workspace" && (
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Quick Actions
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        setSelectedBotId(botId);
                        setCurrentView("bots");
                      }}
                      className="rounded-lg cursor-pointer border border-border/70 bg-background/50 p-3 flex items-center gap-2 hover:border-primary/30 transition-colors text-left"
                    >
                      <Pencil className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-xs font-medium">Edit Bot</p>
                        <p className="text-[10px] text-muted-foreground">
                          Modify personality & settings
                        </p>
                      </div>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={exportingCard}
                    onClick={async () => {
                      const bot = getBot(botId);
                      if (!bot) {
                        toast.error("Bot data not available in this session");
                        return;
                      }
                      setExportingCard(true);
                      try {
                        const card = botToCharacterCard(bot);
                        const jsonStr = JSON.stringify(card, null, 2);
                        const blob = new Blob([jsonStr], {
                          type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${bot.name || "character"}_card.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast.success(
                          `Character card exported for "${bot.name}"`,
                        );
                      } catch (err) {
                        toast.error("Failed to export character card");
                      } finally {
                        setExportingCard(false);
                      }
                    }}
                    className="rounded-lg cursor-pointer border border-border/70 bg-background/50 p-3 flex items-center gap-2 hover:border-primary/30 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportingCard ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                    ) : (
                      <Download className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-medium">
                        {exportingCard ? "Exporting..." : "Export Card"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Download Character Card V2
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={forkingBot}
                    onClick={async () => {
                      setForkingBot(true);
                      try {
                        const result = await forkBot(botId);
                        if (result.success) {
                          toast.success(
                            `Bot forked successfully! A copy of "${botName}" is now yours.`,
                          );
                          onOpenChange(false);
                          if (result.forkedBotId) {
                            setSelectedBotId(result.forkedBotId);
                          }
                          setCurrentView("bots");
                        } else {
                          toast.error(result.error || "Failed to fork bot");
                        }
                      } catch {
                        toast.error("Failed to fork bot");
                      } finally {
                        setForkingBot(false);
                      }
                    }}
                    className="rounded-lg cursor-pointer border border-border/70 bg-background/50 p-3 flex items-center gap-2 hover:border-primary/30 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {forkingBot ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                    ) : (
                      <GitBranch className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-medium">
                        {forkingBot ? "Forking..." : "Fork Bot"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Create your own copy
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      setSelectedBotId(botId);
                      setCurrentView("bots");
                    }}
                    className="rounded-lg cursor-pointer border border-border/70 bg-background/50 p-3 flex items-center gap-2 hover:border-primary/30 transition-colors text-left"
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-medium">View Details</p>
                      <p className="text-[10px] text-muted-foreground">
                        Full bot information
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Team Status */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Team Status
                </Label>
                <div className="rounded-lg border border-border/70 bg-background/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">
                      {activeCollabs.length + 1} members
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      Active
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {/* Owner */}
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10">
                        <Crown className="h-3 w-3 text-amber-500" />
                      </div>
                      <span className="text-xs">Owner</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] ml-auto bg-amber-500/10 text-amber-400 border-amber-500/20"
                      >
                        Admin
                      </Badge>
                    </div>
                    {/* Active collaborators */}
                    {activeCollabs.map((collab) => {
                      const RoleIcon = roleIcons[collab.role];
                      return (
                        <div
                          key={collab.id}
                          className="flex items-center gap-2"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                            {collab.profile?.avatar_url ? (
                              <img
                                src={collab.profile.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <RoleIcon className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          <span className="text-xs truncate flex-1">
                            {collab.profile?.display_name ||
                              collab.profile?.username ||
                              "Unknown"}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              roleConfig[collab.role].className,
                            )}
                          >
                            {roleConfig[collab.role].label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Permissions Info */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Your Permissions
                </Label>
                <div className="rounded-lg border border-border/70 bg-background/50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-xs">
                      {canEdit ? "Can edit bot" : "View only"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-xs">
                      {canManage
                        ? "Can manage collaborators"
                        : "Cannot manage collaborators"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs">Can export character card</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs">Can leave comments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs">Can view activity log</span>
                  </div>
                </div>
              </div>

              {/* Role Legend */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role Guide
                </Label>
                <div className="space-y-2">
                  {(["viewer", "editor", "co_owner"] as const).map((r) => {
                    const conf = roleConfig[r];
                    const Icon = roleIcons[r];
                    return (
                      <div
                        key={r}
                        className={cn(
                          "rounded-lg border p-3",
                          currentUserRole === r
                            ? "border-primary/30 bg-primary/5"
                            : "border-border/70 bg-background/50",
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">
                            {conf.label}
                          </span>
                          {currentUserRole === r && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] ml-auto"
                            >
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {conf.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
