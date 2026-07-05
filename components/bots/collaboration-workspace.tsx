// ============================================================================
// JanitorForge - Collaboration Workspace
// Full workspace: inline bot editor, PR system, team, activity, preview
// ============================================================================

"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Users,
  Activity,
  MessageSquare,
  GitPullRequest,
  Send,
  Loader2,
  User,
  Check,
  X,
  Clock,
  Eye,
  Pencil,
  Crown,
  ChevronDown,
  UserPlus,
  UserMinus,
  Trash2,
  Settings,
  CheckCircle2,
  XCircle,
  Plus,
  Save,
  Download,
  Zap,
  BarChart3,
  FileText,
  GitBranch,
  AlertCircle,
  Globe,
  Hash,
  Tag,
  ImageIcon,
  UsersRound,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  getBotCollaborators,
  inviteCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
  getBotActivity,
  addBotComment,
  getBotComments,
  deleteBotComment,
  getBotChangeRequests,
  submitChangeRequest,
  approveChangeRequest,
  rejectChangeRequest,
  toggleBotApproval,
  getMyFollowing,
  forkBot,
  getBotApprovalSetting,
} from "@/app/actions/collaboration";
import { updateBotAction } from "@/app/actions/bots";
import { exportCharacterCardPNG, countBotTokens } from "@/lib/bot-utils";
import { TokenSummary } from "./token-counter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  CollaboratorRole,
  BotActivityEntry,
  BotComment,
  BotChangeRequest,
  CollaborativeBot,
  Bot,
  BotFormData,
} from "@/lib/types";
import { roleConfig, editableBotFields } from "@/lib/types";
import Link from "next/link";
import { UserSearchInput } from "@/components/ui/user-search-input";

const roleIcons = { viewer: Eye, editor: Pencil, co_owner: Crown };

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
  change_request_submitted: "submitted a change request",
  change_request_approved: "approved a change request",
  change_request_rejected: "rejected a change request",
};

const fieldLabels: Record<string, string> = {
  name: "Name",
  chat_name: "Chat Name",
  personality: "Personality",
  first_message: "First Message",
  scenario: "Scenario",
  example_dialogues: "Example Dialogues",
  short_description: "Short Description",
  tags: "Tags",
  image_url: "Image URL",
};

interface CollaboratorRecord {
  id: string;
  user_id: string;
  invited_by: string;
  role: CollaboratorRole;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  inviter?: { username: string | null; display_name: string | null } | null;
}

interface WorkspaceProps {
  bot: Bot | CollaborativeBot;
  userRole: "owner" | CollaboratorRole;
  onBack: () => void;
  /** Called when bot is updated to refresh parent */
  onBotUpdated?: () => void;
}

type WorkspaceTab = "editor" | "changes" | "members" | "activity" | "comments";

// ============================================================================
// Component
// ============================================================================

export function CollaborationWorkspace({
  bot,
  userRole,
  onBack,
  onBotUpdated,
}: WorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("editor");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---- Bot editable fields ----
  const [editName, setEditName] = useState(bot.name);
  const [editChatName, setEditChatName] = useState(
    "chatName" in bot
      ? bot.chatName || ""
      : "chat_name" in bot
        ? (bot as any).chat_name || ""
        : "",
  );
  const [editShortDesc, setEditShortDesc] = useState(
    "shortDescription" in bot
      ? bot.shortDescription
      : (bot as any).short_description || "",
  );
  const [editPersonality, setEditPersonality] = useState(bot.personality);
  const [editFirstMessage, setEditFirstMessage] = useState(
    "firstMessage" in bot ? bot.firstMessage : (bot as any).first_message || "",
  );
  const [editScenario, setEditScenario] = useState(bot.scenario);
  const [editExampleDialogues, setEditExampleDialogues] = useState(
    "exampleDialogues" in bot
      ? bot.exampleDialogues
      : (bot as any).example_dialogues || "",
  );
  const [editTags, setEditTags] = useState<string[]>(
    "tags" in bot ? bot.tags : [],
  );
  const [editRating, setEditRating] = useState<"SFW" | "NSFW">(
    ("rating" in bot ? bot.rating : "SFW") as "SFW" | "NSFW",
  );
  const [editImageUrl, setEditImageUrl] = useState(
    "imageUrl" in bot
      ? bot.imageUrl || ""
      : "image_url" in bot
        ? (bot as any).image_url || ""
        : "",
  );
  const [tagInput, setTagInput] = useState("");

  // ---- Original values snapshot (for dirty tracking) ----
  const originalValues = useMemo(
    () => ({
      name: bot.name,
      chatName:
        "chatName" in bot
          ? bot.chatName || ""
          : "chat_name" in bot
            ? (bot as any).chat_name || ""
            : "",
      shortDescription:
        "shortDescription" in bot
          ? bot.shortDescription
          : (bot as any).short_description || "",
      personality: bot.personality,
      firstMessage:
        "firstMessage" in bot
          ? bot.firstMessage
          : (bot as any).first_message || "",
      scenario: bot.scenario,
      exampleDialogues:
        "exampleDialogues" in bot
          ? bot.exampleDialogues
          : (bot as any).example_dialogues || "",
      tags: "tags" in bot ? bot.tags : [],
      rating: ("rating" in bot ? bot.rating : "SFW") as "SFW" | "NSFW",
      imageUrl:
        "imageUrl" in bot
          ? bot.imageUrl || ""
          : "image_url" in bot
            ? (bot as any).image_url || ""
            : "",
    }),
    [bot],
  );

  // ---- Dirty field detection ----
  const dirtyFields = useMemo(() => {
    const dirty: Record<string, boolean> = {};
    dirty.name = editName !== originalValues.name;
    dirty.chatName = editChatName !== originalValues.chatName;
    dirty.shortDescription = editShortDesc !== originalValues.shortDescription;
    dirty.personality = editPersonality !== originalValues.personality;
    dirty.firstMessage = editFirstMessage !== originalValues.firstMessage;
    dirty.scenario = editScenario !== originalValues.scenario;
    dirty.exampleDialogues =
      editExampleDialogues !== originalValues.exampleDialogues;
    dirty.imageUrl = editImageUrl !== originalValues.imageUrl;
    dirty.rating = editRating !== originalValues.rating;
    dirty.tags =
      JSON.stringify(editTags) !== JSON.stringify(originalValues.tags);
    return dirty;
  }, [
    editName,
    editChatName,
    editShortDesc,
    editPersonality,
    editFirstMessage,
    editScenario,
    editExampleDialogues,
    editImageUrl,
    editRating,
    editTags,
    originalValues,
  ]);

  const hasAnyDirty = Object.values(dirtyFields).some(Boolean);

  // Helper: CSS class for dirty fields (left border + subtle glow)
  const dirtyClass = (field: string) =>
    dirtyFields[field]
      ? "!border-l-[3px] !border-l-amber-500 bg-amber-500/[0.04] shadow-[inset_0_0_0_1px_rgba(245,158,11,0.15)] transition-all duration-200"
      : "transition-all duration-200";

  // Get original value for a given field key (for CR diff view)
  const getOriginalFieldValue = (fieldKey: string): string => {
    const mapping: Record<string, string> = {
      short_description: originalValues.shortDescription,
      personality: originalValues.personality,
      first_message: originalValues.firstMessage,
      scenario: originalValues.scenario,
      example_dialogues: originalValues.exampleDialogues,
      tags: originalValues.tags.join(", "),
    };
    return mapping[fieldKey] ?? "";
  };

  // ---- Collab state ----
  const [collaborators, setCollaborators] = useState<CollaboratorRecord[]>([]);
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
  const [activity, setActivity] = useState<BotActivityEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [comments, setComments] = useState<BotComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [changeRequests, setChangeRequests] = useState<BotChangeRequest[]>([]);
  const [loadingCR, setLoadingCR] = useState(false);
  const [showNewCR, setShowNewCR] = useState(false);
  const [crDescription, setCrDescription] = useState("");
  const [crChanges, setCrChanges] = useState<Record<string, string>>({});
  const [submittingCR, setSubmittingCR] = useState(false);
  const [rejectDialogCR, setRejectDialogCR] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvalRequired, setApprovalRequired] = useState(false);

  const isOwner = userRole === "owner";
  const canManage = isOwner || userRole === "co_owner";
  const canEdit = isOwner || userRole === "editor" || userRole === "co_owner";
  const botId = bot.id;

  // Compute tokens
  const tokenCount = useMemo(
    () =>
      countBotTokens({
        id: botId,
        name: editName,
        shortDescription: editShortDesc,
        personality: editPersonality,
        firstMessage: editFirstMessage,
        scenario: editScenario,
        exampleDialogues: editExampleDialogues,
        tags: editTags,
        rating: editRating,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Bot),
    [
      editName,
      editShortDesc,
      editPersonality,
      editFirstMessage,
      editScenario,
      editExampleDialogues,
      editTags,
      editRating,
      botId,
    ],
  );

  // ---- Load initial data ----
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      getBotCollaborators(botId),
      getMyFollowing(),
      getBotChangeRequests(botId),
      getBotApprovalSetting(botId),
    ]).then(([collabResult, followingResult, crResult, approvalResult]) => {
      if (!mounted) return;
      if (collabResult.success)
        setCollaborators(collabResult.collaborators as CollaboratorRecord[]);
      if (followingResult.success)
        setSuggestions(followingResult.following as typeof suggestions);
      if (crResult.success)
        setChangeRequests(crResult.changeRequests as BotChangeRequest[]);
      if (approvalResult.success)
        setApprovalRequired(approvalResult.requireApproval);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [botId]);

  const loadActivity = useCallback(async () => {
    setLoadingActivity(true);
    const result = await getBotActivity(botId, 50);
    if (result.success) setActivity(result.activity as BotActivityEntry[]);
    setLoadingActivity(false);
  }, [botId]);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    const result = await getBotComments(botId);
    if (result.success) setComments(result.comments as BotComment[]);
    setLoadingComments(false);
  }, [botId]);

  const loadChangeRequests = useCallback(async () => {
    setLoadingCR(true);
    const result = await getBotChangeRequests(botId);
    if (result.success)
      setChangeRequests(result.changeRequests as BotChangeRequest[]);
    setLoadingCR(false);
  }, [botId]);

  useEffect(() => {
    if (activeTab === "activity") loadActivity();
    if (activeTab === "comments") loadComments();
    if (activeTab === "changes") loadChangeRequests();
  }, [activeTab, loadActivity, loadComments, loadChangeRequests]);

  // ---- Tag management ----
  const addTag = useCallback(() => {
    const t = tagInput.trim();
    if (t && !editTags.includes(t)) {
      setEditTags([...editTags, t]);
      setTagInput("");
    }
  }, [tagInput, editTags]);

  const removeTag = useCallback(
    (tag: string) => {
      setEditTags(editTags.filter((t) => t !== tag));
    },
    [editTags],
  );

  // ---- Save handler ----
  const handleSave = async () => {
    if (!isOwner && !canEdit) return;

    // If approval is required and user is not owner, submit change request
    if (approvalRequired && !isOwner) {
      const changes: Record<string, unknown> = {};
      const orig = {
        short_description:
          "shortDescription" in bot
            ? bot.shortDescription
            : (bot as any).short_description || "",
        personality: bot.personality,
        first_message:
          "firstMessage" in bot
            ? bot.firstMessage
            : (bot as any).first_message || "",
        scenario: bot.scenario,
        example_dialogues:
          "exampleDialogues" in bot
            ? bot.exampleDialogues
            : (bot as any).example_dialogues || "",
        tags: bot.tags,
      };
      const cur = {
        short_description: editShortDesc,
        personality: editPersonality,
        first_message: editFirstMessage,
        scenario: editScenario,
        example_dialogues: editExampleDialogues,
        tags: editTags,
      };
      for (const [key, value] of Object.entries(cur)) {
        const origVal = orig[key as keyof typeof orig];
        const isSame = Array.isArray(value)
          ? JSON.stringify(value) === JSON.stringify(origVal)
          : value === origVal;
        if (!isSame) changes[key] = value;
      }
      if (Object.keys(changes).length === 0) {
        toast.info("No changes detected");
        return;
      }
      setSaving(true);
      const result = await submitChangeRequest(botId, changes);
      setSaving(false);
      if (result.success) {
        toast.success("Change request submitted for owner review");
        setActiveTab("changes");
        await loadChangeRequests();
      } else toast.error(result.error || "Failed to submit");
      return;
    }

    // Direct save (owner or no approval required)
    setSaving(true);
    const formData: BotFormData = {
      name: editName.trim(),
      chatName: editChatName.trim() || undefined,
      shortDescription: editShortDesc.trim(),
      personality: editPersonality,
      firstMessage: editFirstMessage,
      scenario: editScenario,
      exampleDialogues: editExampleDialogues,
      tags: editTags,
      rating: editRating,
      imageUrl: editImageUrl.trim() || undefined,
    };
    const result = await updateBotAction(botId, formData);
    setSaving(false);
    if (result.success) {
      toast.success("Bot saved successfully!");
      if (onBotUpdated) onBotUpdated();
    } else toast.error(result.error || "Failed to save");
  };

  // ---- Export handler ----
  const handleExport = async () => {
    try {
      const blob = await exportCharacterCardPNG({
        id: botId,
        name: editName,
        shortDescription: editShortDesc,
        personality: editPersonality,
        firstMessage: editFirstMessage,
        scenario: editScenario,
        exampleDialogues: editExampleDialogues,
        tags: editTags,
        rating: editRating,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Bot);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${editName.replace(/\s+/g, "_")}_card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Character card exported!");
    } catch {
      toast.error("Failed to export");
    }
  };

  // ---- Collab handlers ----
  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    setInviting(true);
    const result = await inviteCollaborator(botId, inviteUsername, inviteRole);
    setInviting(false);
    if (result.success) {
      toast.success(`Invitation sent to @${result.invitedUsername}`);
      setInviteUsername("");
      const r = await getBotCollaborators(botId);
      if (r.success) setCollaborators(r.collaborators as CollaboratorRecord[]);
    } else toast.error(result.error || "Failed");
  };
  const handleRemove = async (id: string) => {
    const result = await removeCollaborator(id);
    if (result.success) {
      setCollaborators((p) => p.filter((c) => c.id !== id));
      toast.success("Removed");
    } else toast.error(result.error || "Failed");
  };
  const handleRoleChange = async (id: string, role: CollaboratorRole) => {
    const result = await updateCollaboratorRole(id, role);
    if (result.success) {
      setCollaborators((p) => p.map((c) => (c.id === id ? { ...c, role } : c)));
      toast.success("Role updated");
    } else toast.error(result.error || "Failed");
  };
  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    const result = await addBotComment(botId, newComment);
    setSendingComment(false);
    if (result.success) {
      setNewComment("");
      toast.success("Comment added");
      await loadComments();
    } else toast.error(result.error || "Failed");
  };
  const handleDeleteComment = async (id: string) => {
    const result = await deleteBotComment(id);
    if (result.success) setComments((p) => p.filter((c) => c.id !== id));
  };
  const handleSubmitCR = async () => {
    const changes: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(crChanges)) {
      if (v.trim()) changes[k] = v.trim();
    }
    if (Object.keys(changes).length === 0) {
      toast.error("No changes");
      return;
    }
    setSubmittingCR(true);
    const result = await submitChangeRequest(botId, changes, crDescription);
    setSubmittingCR(false);
    if (result.success) {
      toast.success("Change request submitted!");
      setShowNewCR(false);
      setCrDescription("");
      setCrChanges({});
      await loadChangeRequests();
    } else toast.error(result.error || "Failed");
  };
  const handleApprove = async (id: string) => {
    const result = await approveChangeRequest(id);
    if (result.success) {
      toast.success("Approved & applied!");
      await loadChangeRequests();
      if (onBotUpdated) onBotUpdated();
    } else toast.error(result.error || "Failed");
  };
  const handleReject = async () => {
    if (!rejectDialogCR) return;
    const result = await rejectChangeRequest(rejectDialogCR, rejectReason);
    if (result.success) {
      toast.success("Rejected");
      setRejectDialogCR(null);
      setRejectReason("");
      await loadChangeRequests();
    } else toast.error(result.error || "Failed");
  };
  const handleToggleApproval = async () => {
    const newVal = !approvalRequired;
    setApprovalRequired(newVal);
    const result = await toggleBotApproval(botId, newVal);
    if (result.success)
      toast.success(
        newVal ? "Approval required for changes" : "Changes apply directly",
      );
  };

  const filteredSuggestions = suggestions
    .filter(
      (s) =>
        (s.username || "").toLowerCase().includes(inviteUsername) ||
        (s.display_name || "").toLowerCase().includes(inviteUsername),
    )
    .filter((s) => !collaborators.some((c) => c.user_id === s.id))
    .slice(0, 5);
  const activeCollabs = collaborators.filter((c) => c.status === "accepted");
  const pendingCollabs = collaborators.filter((c) => c.status === "pending");
  const pendingCRs = changeRequests.filter((cr) => cr.status === "pending");

  const tabs: {
    key: WorkspaceTab;
    label: string;
    icon: typeof Users;
    count?: number;
  }[] = [
    { key: "editor", label: "Editor", icon: Pencil },
    {
      key: "changes",
      label: "Changes",
      icon: GitPullRequest,
      count: pendingCRs.length || undefined,
    },
    {
      key: "members",
      label: "Members",
      icon: Users,
      count: collaborators.length || undefined,
    },
    { key: "activity", label: "Activity", icon: Activity },
    { key: "comments", label: "Comments", icon: MessageSquare },
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      {/* ---- Header ---- */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-3 cursor-pointer -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Bot Manager
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
              {editImageUrl ? (
                <img
                  src={editImageUrl}
                  alt={editName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UsersRound className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                {editName}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <UsersRound className="h-3.5 w-3.5" />
                  {activeCollabs.length + 1} members
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  {tokenCount.toLocaleString()} tokens
                </span>
                {!isOwner && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      roleConfig[userRole]?.className || "",
                    )}
                  >
                    {roleConfig[userRole]?.label || userRole}
                  </Badge>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleApproval}
                className="cursor-pointer text-xs"
              >
                <Settings className="h-3.5 w-3.5 mr-1" />
                {approvalRequired ? "Approval ON" : "Approval OFF"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="cursor-pointer text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export Card
            </Button>
            {canEdit && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="cursor-pointer text-xs"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1" />
                )}
                {approvalRequired && !isOwner ? "Submit Changes" : "Save Bot"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ---- Tab bar ---- */}
      <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/30 p-1 mb-6 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
              activeTab === key
                ? "bg-background text-foreground shadow-sm border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50 border border-transparent",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count && count > 0 && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/20 px-1 text-[10px] text-amber-400">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ====== EDITOR TAB ====== */}
      {activeTab === "editor" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Editor form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">
                        Bot Name <span className="text-red-400">*</span>
                      </Label>
                      {dirtyFields.name && (
                        <span className="text-[10px] text-amber-400 font-medium">
                          modified
                        </span>
                      )}
                    </div>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={!canEdit}
                      className={cn("mt-1", dirtyClass("name"))}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Chat Name</Label>
                      {dirtyFields.chatName && (
                        <span className="text-[10px] text-amber-400 font-medium">
                          modified
                        </span>
                      )}
                    </div>
                    <Input
                      value={editChatName}
                      onChange={(e) => setEditChatName(e.target.value)}
                      disabled={!canEdit}
                      placeholder="Optional display name"
                      className={cn("mt-1", dirtyClass("chatName"))}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Short Description</Label>
                    {dirtyFields.shortDescription && (
                      <span className="text-[10px] text-amber-400 font-medium">
                        modified
                      </span>
                    )}
                  </div>
                  <Textarea
                    value={editShortDesc}
                    onChange={(e) => setEditShortDesc(e.target.value)}
                    disabled={!canEdit}
                    className={cn(
                      "min-h-[50px] text-sm mt-1",
                      dirtyClass("shortDescription"),
                    )}
                    maxLength={500}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Image URL</Label>
                    {dirtyFields.imageUrl && (
                      <span className="text-[10px] text-amber-400 font-medium">
                        modified
                      </span>
                    )}
                  </div>
                  <Input
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://..."
                    className={cn("mt-1", dirtyClass("imageUrl"))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Rating</Label>
                  <RadioGroup
                    value={editRating}
                    onValueChange={(v) => setEditRating(v as "SFW" | "NSFW")}
                    disabled={!canEdit}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="SFW" id="r-sfw" />
                      <Label htmlFor="r-sfw" className="text-sm cursor-pointer">
                        SFW
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="NSFW" id="r-nsfw" />
                      <Label
                        htmlFor="r-nsfw"
                        className="text-sm cursor-pointer"
                      >
                        NSFW
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Personality & Content */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserRound className="h-4 w-4" /> Character Definition
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Personality</Label>
                    {dirtyFields.personality && (
                      <span className="text-[10px] text-amber-400 font-medium">
                        modified
                      </span>
                    )}
                  </div>
                  <Textarea
                    value={editPersonality}
                    onChange={(e) => setEditPersonality(e.target.value)}
                    disabled={!canEdit}
                    className={cn(
                      "min-h-[100px] text-sm mt-1",
                      dirtyClass("personality"),
                    )}
                    placeholder="Describe the character's personality traits, behavior, quirks..."
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">First Message</Label>
                    {dirtyFields.firstMessage && (
                      <span className="text-[10px] text-amber-400 font-medium">
                        modified
                      </span>
                    )}
                  </div>
                  <Textarea
                    value={editFirstMessage}
                    onChange={(e) => setEditFirstMessage(e.target.value)}
                    disabled={!canEdit}
                    className={cn(
                      "min-h-[100px] text-sm mt-1",
                      dirtyClass("firstMessage"),
                    )}
                    placeholder="The first message the bot sends..."
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Scenario</Label>
                    {dirtyFields.scenario && (
                      <span className="text-[10px] text-amber-400 font-medium">
                        modified
                      </span>
                    )}
                  </div>
                  <Textarea
                    value={editScenario}
                    onChange={(e) => setEditScenario(e.target.value)}
                    disabled={!canEdit}
                    className={cn(
                      "min-h-[80px] text-sm mt-1",
                      dirtyClass("scenario"),
                    )}
                    placeholder="Setting, context, situation..."
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Example Dialogues</Label>
                    {dirtyFields.exampleDialogues && (
                      <span className="text-[10px] text-amber-400 font-medium">
                        modified
                      </span>
                    )}
                  </div>
                  <Textarea
                    value={editExampleDialogues}
                    onChange={(e) => setEditExampleDialogues(e.target.value)}
                    disabled={!canEdit}
                    className={cn(
                      "min-h-[100px] text-sm mt-1",
                      dirtyClass("exampleDialogues"),
                    )}
                    placeholder="{{user}}: Hello!\n{{char}}: *waves* Hi there!"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                {canEdit && (
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Add a tag..."
                      className="text-sm"
                      maxLength={40}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTag}
                      className="cursor-pointer shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {editTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      {canEdit && (
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </Badge>
                  ))}
                  {editTags.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      No tags added
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {!canEdit && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> You have
                read-only access. Ask the owner to change your role to Editor.
              </div>
            )}
          </div>

          {/* Right: Stats sidebar */}
          <div className="space-y-4">
            {/* Token Summary */}
            <TokenSummary
              personality={editPersonality}
              initialMessages={[editFirstMessage]}
              scenario={editScenario}
              exampleDialogues={editExampleDialogues}
            />

            {/* Quick Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total tokens</span>
                  <span className="font-medium">
                    {tokenCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tags</span>
                  <span className="font-medium">{editTags.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rating</span>
                  <Badge variant="outline" className="text-[10px]">
                    {editRating}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Team members</span>
                  <span className="font-medium">
                    {activeCollabs.length + 1}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending CRs</span>
                  <span className="font-medium">{pendingCRs.length}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approval mode</span>
                  <Badge
                    variant={approvalRequired ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {approvalRequired ? "Required" : "Direct"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Team preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UsersRound className="h-4 w-4" /> Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeCollabs.slice(0, 5).map((c) => {
                  const RoleIcon = roleIcons[c.role];
                  return (
                    <Link
                      key={c.id}
                      href={`/profile/${c.profile?.username}`}
                      className="flex border border-muted-foreground/20 p-2 rounded items-center gap-2 text-xs"
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 overflow-hidden shrink-0">
                        {c.profile?.avatar_url ? (
                          <img
                            src={c.profile.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserRound className="h-2.5 w-2.5 text-primary" />
                        )}
                      </div>
                      <span className="truncate flex-1">
                        {c.profile?.display_name ||
                          c.profile?.username ||
                          "Unknown"}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1 py-0",
                          roleConfig[c.role].className,
                        )}
                      >
                        <RoleIcon className="h-2 w-2 mr-0.5" />
                        {roleConfig[c.role].label}
                      </Badge>
                    </Link>
                  );
                })}
                {activeCollabs.length > 5 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{activeCollabs.length - 5} more
                  </p>
                )}
                {activeCollabs.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No collaborators yet
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("members")}
                  className="w-full cursor-pointer text-xs mt-1"
                >
                  Manage Team{" "}
                  <ChevronDown className="h-3 w-3 ml-1 rotate-[-90deg]" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ====== CHANGES TAB ====== */}
      {activeTab === "changes" && (
        <div className="space-y-4">
          {canEdit && !isOwner && (
            <Button
              onClick={() => setShowNewCR(!showNewCR)}
              className="cursor-pointer w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-1" /> Submit Change Request
            </Button>
          )}
          {showNewCR && canEdit && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitPullRequest className="h-4 w-4 text-primary" /> New Change
                  Request
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Description (optional)</Label>
                  <Textarea
                    value={crDescription}
                    onChange={(e) => setCrDescription(e.target.value)}
                    placeholder="Describe what you changed and why..."
                    className="min-h-[50px] text-sm mt-1"
                    maxLength={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Changes</Label>
                  {editableBotFields.map((field) => (
                    <div key={field.key}>
                      <Label className="text-[11px] text-muted-foreground">
                        {field.label}
                      </Label>
                      {field.type === "textarea" ? (
                        <Textarea
                          value={crChanges[field.key] || ""}
                          onChange={(e) =>
                            setCrChanges((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          placeholder={`Proposed ${field.label.toLowerCase()}...`}
                          className="min-h-[60px] text-sm mt-1"
                        />
                      ) : (
                        <Input
                          value={crChanges[field.key] || ""}
                          onChange={(e) =>
                            setCrChanges((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          placeholder={`Proposed ${field.label.toLowerCase()}...`}
                          className="text-sm mt-1"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewCR(false);
                      setCrChanges({});
                      setCrDescription("");
                    }}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitCR}
                    disabled={submittingCR}
                    className="cursor-pointer"
                  >
                    {submittingCR ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Send className="h-4 w-4 mr-1" />
                    )}
                    Submit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {loadingCR ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
            </div>
          ) : changeRequests.length > 0 ? (
            <div className="space-y-3">
              {changeRequests.map((cr) => {
                const StatusIcon =
                  cr.status === "pending"
                    ? Clock
                    : cr.status === "approved"
                      ? CheckCircle2
                      : XCircle;
                const statusColor =
                  cr.status === "pending"
                    ? "text-amber-400 bg-amber-500/10"
                    : cr.status === "approved"
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-red-400 bg-red-500/10";
                return (
                  <Card
                    key={cr.id}
                    className={cn(
                      "transition-all",
                      cr.status === "pending" && "border-amber-500/20",
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full",
                              statusColor,
                            )}
                          >
                            <StatusIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {cr.author_display_name ||
                                cr.author_username ||
                                "Unknown"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatTimeAgo(cr.created_at)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", statusColor)}
                        >
                          {cr.status}
                        </Badge>
                      </div>
                      {cr.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {cr.description}
                        </p>
                      )}
                      <div className="space-y-3">
                        {Object.entries(cr.proposed_changes).map(
                          ([field, value]) => {
                            const originalValue = getOriginalFieldValue(field);
                            const newValue = String(value);
                            return (
                              <div
                                key={field}
                                className="rounded-md border border-border/70 overflow-hidden"
                              >
                                <div className="bg-muted/50 px-3 py-1.5 border-b border-border/50">
                                  <p className="text-xs font-medium text-primary">
                                    {fieldLabels[field] || field}
                                  </p>
                                </div>
                                {originalValue && (
                                  <div className="px-3 py-2 border-b border-border/30 bg-red-500/[0.03]">
                                    <p className="text-[10px] text-red-400 font-medium mb-1.5 uppercase tracking-wider">
                                      Before
                                    </p>
                                    <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto">
                                      {originalValue}
                                    </p>
                                  </div>
                                )}
                                <div className="px-3 py-2 bg-emerald-500/[0.03]">
                                  <p className="text-[10px] text-emerald-400 font-medium mb-1.5 uppercase tracking-wider">
                                    {originalValue ? "After" : "Proposed Value"}
                                  </p>
                                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto">
                                    {newValue}
                                  </p>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                      {cr.status === "rejected" && cr.rejection_reason && (
                        <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/5 p-3">
                          <p className="text-xs font-medium text-red-400 mb-1">
                            Rejection Reason
                          </p>
                          <p className="text-sm">{cr.rejection_reason}</p>
                        </div>
                      )}
                      {isOwner && cr.status === "pending" && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(cr.id)}
                            className="cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Approve &
                            Apply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectDialogCR(cr.id)}
                            className="cursor-pointer text-destructive border-destructive/30 hover:bg-destructive/10"
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 p-8 text-center">
              <GitPullRequest className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No change requests yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {canEdit && !isOwner
                  ? "Submit a change request to propose edits"
                  : "Change requests from collaborators will appear here"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ====== MEMBERS TAB ====== */}
      {activeTab === "members" && (
        <div className="space-y-4">
          {canManage && (
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-4">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5" /> Invite a collaborator
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
                  <SelectTrigger className="w-full sm:w-32.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-3 w-3" /> Viewer
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-1.5">
                        <Pencil className="h-3 w-3" /> Editor
                      </div>
                    </SelectItem>
                    <SelectItem value="co_owner">
                      <div className="flex items-center gap-1.5">
                        <Crown className="h-3 w-3" /> Co-owner
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
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
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
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/50 p-3 hover:border-primary/20 transition-colors"
                      >
                        <Link
                          href={`/profile/${collab.profile?.username}`}
                          className="flex items-center gap-3 min-w-0"
                        >
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
                            <p className="text-sm font-medium truncate hover:underline">
                              {collab.profile?.display_name ||
                                collab.profile?.username ||
                                "Unknown"}
                            </p>
                            {collab.profile?.username &&
                              collab.profile?.display_name && (
                                <p className="text-[11px] text-muted-foreground truncate">
                                  @{collab.profile.username}
                                </p>
                              )}
                          </div>
                        </Link>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              roleConf.className,
                            )}
                          >
                            <RoleIcon className="h-2.5 w-2.5 mr-0.5" />{" "}
                            {roleConf.label}
                          </Badge>
                          {isOwner && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 cursor-pointer"
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
                                    })}{" "}
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
                                  <UserMinus className="h-3.5 w-3.5 mr-2" />{" "}
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
                    Pending ({pendingCollabs.length})
                  </Label>
                  {pendingCollabs.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-3"
                    >
                      <Link
                        href={`/profile/${c.profile?.username}`}
                        className="flex items-center gap-3 min-w-0"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 overflow-hidden shrink-0">
                          {c.profile?.avatar_url ? (
                            <img
                              src={c.profile.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        <p className="text-sm font-medium truncate hover:underline">
                          {c.profile?.display_name ||
                            c.profile?.username ||
                            "Unknown"}
                        </p>
                      </Link>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                          onClick={() => handleRemove(c.id)}
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
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ====== ACTIVITY TAB ====== */}
      {activeTab === "activity" && (
        <>
          {loadingActivity ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
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
              <p className="text-sm text-muted-foreground">No activity yet</p>
            </div>
          )}
        </>
      )}

      {/* ====== COMMENTS TAB ====== */}
      {activeTab === "comments" && (
        <>
          <div className="space-y-2 mb-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Leave a comment..."
              className="min-h-[60px] resize-none text-sm"
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                  handleSendComment();
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
                )}{" "}
                Post
              </Button>
            </div>
          </div>
          {loadingComments ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
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
                      className="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
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
              <p className="text-sm text-muted-foreground">No comments yet</p>
            </div>
          )}
        </>
      )}

      {/* Reject dialog */}
      <Dialog
        open={!!rejectDialogCR}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialogCR(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Change Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting these changes (optional).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            className="min-h-[80px]"
            maxLength={500}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogCR(null);
                setRejectReason("");
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              className="cursor-pointer"
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
