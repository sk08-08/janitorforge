// ============================================================================
// JanitorForge - Bot Manager View
// Full CRUD interface for managing bots
// ============================================================================

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  Grid3X3,
  List,
  Bot as BotIcon,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Clock,
  Users,
  GitFork,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BotForm } from "./bot-form";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import {
  createBotAction,
  updateBotAction,
  deleteBotAction,
} from "@/app/actions/bots";
import { cn } from "@/lib/utils";
import { countBotTokens, exportCharacterCardPNG } from "@/lib/bot-utils";
import { toast } from "sonner";
import type { Bot, BotFormData } from "@/lib/types";
import { FilteredSearchInput } from "@/components/ui/filtered-search-input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { searchBots, searchCollaborativeBots } from "@/app/actions/search";
import { CollaboratorDialog } from "./collaborator-dialog";
import { CollaborationWorkspace } from "./collaboration-workspace";
import { forkBot } from "@/app/actions/collaboration";
import { PendingInvites } from "./pending-invites";
import type { CollaborativeBot, CollaboratorRole } from "@/lib/types";
import { roleConfig } from "@/lib/types";

// ----------------------------------------------------------------------------
// View Modes
// ----------------------------------------------------------------------------

type ViewMode = "grid" | "list";
type FilterRating = "all" | "SFW" | "NSFW";

// ----------------------------------------------------------------------------
// Bot Card Component
// ----------------------------------------------------------------------------

interface BotCardProps {
  bot: Bot;
  viewMode: ViewMode;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
  onCollaborators: () => void;
  onWorkspace: () => void;
  onFork: () => void;
}

interface CollaborativeBotCardProps {
  bot: CollaborativeBot;
  viewMode: ViewMode;
  onCollaborators: () => void;
  onWorkspace: () => void;
  onExport?: () => void;
}

function CollaborativeBotCard({
  bot,
  viewMode,
  onCollaborators,
  onWorkspace,
  onExport,
}: CollaborativeBotCardProps) {
  const roleConf = roleConfig[bot.collaborator_role];
  const canEdit =
    bot.collaborator_role === "editor" || bot.collaborator_role === "co_owner";
  const canManage = bot.collaborator_role === "co_owner";

  if (viewMode === "list") {
    return (
      <Card className="transition-all hover:border-primary/30 border-l-2 border-l-primary/40">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
            {bot.image_url ? (
              <img
                src={bot.image_url}
                alt={bot.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <BotIcon className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{bot.name}</h3>
              <Badge
                variant="outline"
                className={cn("text-[10px] shrink-0", roleConf.className)}
              >
                {roleConf.label}
              </Badge>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                Shared
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground truncate">
              {bot.short_description || "No description"}
            </p>
            {bot.owner_display_name && (
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                by {bot.owner_display_name || bot.owner_username}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onExport && (
                <DropdownMenuItem onClick={onExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Card V2
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onWorkspace}>
                <Zap className="mr-2 h-4 w-4" />
                Open Workspace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCollaborators}>
                <Users className="mr-2 h-4 w-4" />
                View Collaborators
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>
    );
  }

  // Grid view for collaborative bot
  return (
    <Card className="group transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/8 hover:-translate-y-1 border-l-2 border-l-primary/40">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {bot.image_url ? (
          <img
            src={bot.image_url}
            alt={bot.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <BotIcon className="h-14 w-14 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
        <Badge
          variant="outline"
          className={cn(
            "absolute top-2.5 right-2.5 backdrop-blur-sm",
            roleConf.className,
          )}
        >
          {roleConf.label}
        </Badge>
        <Badge
          variant="secondary"
          className="absolute top-2.5 left-2.5 backdrop-blur-sm text-[10px]"
        >
          <Users className="h-2.5 w-2.5 mr-0.5" />
          Shared
        </Badge>
      </div>
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-bold leading-tight flex-1 min-w-0">
            {bot.name}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer shrink-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onExport && (
                <DropdownMenuItem onClick={onExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Card V2
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onWorkspace}>
                <Zap className="mr-2 h-4 w-4" />
                Open Workspace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCollaborators}>
                <Users className="mr-2 h-4 w-4" />
                View Collaborators
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="line-clamp-2 text-sm mt-1">
          {bot.short_description || "No description provided"}
        </CardDescription>
        {bot.owner_display_name && (
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            by {bot.owner_display_name || bot.owner_username}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {bot.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {bot.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{bot.tags.length - 2}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BotCard({
  bot,
  viewMode,
  onEdit,
  onDelete,
  onExport,
  onCollaborators,
  onWorkspace,
  onFork,
}: BotCardProps) {
  const tokenCount = useMemo(() => countBotTokens(bot), [bot]);

  if (viewMode === "list") {
    return (
      <Card className="transition-all hover:border-primary/30">
        <CardContent className="flex items-center gap-4 p-4">
          {/* Icon / Image */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
            {bot.imageUrl ? (
              <img
                src={bot.imageUrl}
                alt={bot.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <BotIcon className="h-6 w-6 text-primary" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{bot.name}</h3>
              <Badge
                variant={bot.rating === "SFW" ? "secondary" : "destructive"}
                className="shrink-0"
              >
                {bot.rating}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground truncate">
              {bot.shortDescription || "No description"}
            </p>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">
                {tokenCount.toLocaleString()}
              </span>
              <span>tokens</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{bot.updatedAt.toLocaleDateString()}</span>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                Export Card V2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onWorkspace}>
                <Zap className="mr-2 h-4 w-4" />
                Open Workspace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCollaborators}>
                <Users className="mr-2 h-4 w-4" />
                Collaborators
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onFork}>
                <GitFork className="mr-2 h-4 w-4" />
                Fork Bot
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card className="group transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/8 hover:-translate-y-1">
      {/* Large cover image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {bot.imageUrl ? (
          <img
            src={bot.imageUrl}
            alt={bot.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <BotIcon className="h-14 w-14 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
        <Badge
          variant={bot.rating === "SFW" ? "secondary" : "destructive"}
          className="absolute top-2.5 right-2.5 backdrop-blur-sm shadow-sm"
        >
          {bot.rating}
        </Badge>
      </div>
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-bold leading-tight flex-1 min-w-0">
            {bot.name}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer shrink-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                Export Card V2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onWorkspace}>
                <Zap className="mr-2 h-4 w-4" />
                Open Workspace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCollaborators}>
                <Users className="mr-2 h-4 w-4" />
                Collaborators
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onFork}>
                <GitFork className="mr-2 h-4 w-4" />
                Fork Bot
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="line-clamp-2 text-sm mt-1">
          {bot.shortDescription || "No description provided"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {bot.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {bot.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{bot.tags.length - 2}
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{tokenCount.toLocaleString()} tokens</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {bot.updatedAt.toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Empty State
// ----------------------------------------------------------------------------

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <BotIcon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mt-6 text-xl font-semibold">No bots yet</h3>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Get started by creating your first bot or importing an existing
        character card.
      </p>
      <Button className="mt-6 cursor-pointer" onClick={onCreateNew}>
        <Plus className="mr-2 h-4 w-4" />
        Create Your First Bot
      </Button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Bot Manager Component
// ----------------------------------------------------------------------------

export function BotManager() {
  const {
    bots,
    deleteBot,
    selectedBotId,
    setSelectedBotId,
    upsertBot,
    collaborativeBots,
    workspaceBotId,
    setWorkspaceBotId,
  } = useStore();

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState<FilterRating>("all");
  const [isCreating, setIsCreating] = useState(false);

  // Server-side search state
  const [searchResults, setSearchResults] = useState<Bot[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const PAGE_SIZE = 20;

  // Trigger server-side search when query or filter changes
  useEffect(() => {
    const isDefault = !searchQuery.trim() && filterRating === "all";
    if (isDefault) {
      setSearchResults([]);
      setSearchTotal(0);
      setSearchPage(0);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    searchBots(searchQuery, filterRating, PAGE_SIZE, 0).then((result) => {
      if (cancelled) return;
      if (result.success && result.bots) {
        const mapped: Bot[] = result.bots.map((r) => ({
          id: r.id,
          name: r.name,
          shortDescription: r.short_description,
          personality: r.personality,
          tags: r.tags,
          rating: r.rating as "SFW" | "NSFW",
          imageUrl: r.image_url || undefined,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at),
          firstMessage: "",
          scenario: "",
          exampleDialogues: "",
        }));
        setSearchResults(mapped);
        setSearchTotal(result.total || 0);
        setSearchPage(0);
      }
      setIsSearching(false);
    });

    return () => {
      cancelled = true;
    };
  }, [searchQuery, filterRating]);

  const handlePageChange = useCallback(
    async (newPage: number) => {
      const offset = newPage * PAGE_SIZE;
      setIsSearching(true);
      const result = await searchBots(
        searchQuery,
        filterRating,
        PAGE_SIZE,
        offset,
      );
      if (result.success && result.bots) {
        const mapped: Bot[] = result.bots.map((r) => ({
          id: r.id,
          name: r.name,
          shortDescription: r.short_description,
          personality: r.personality,
          tags: r.tags,
          rating: r.rating as "SFW" | "NSFW",
          imageUrl: r.image_url || undefined,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at),
          firstMessage: "",
          scenario: "",
          exampleDialogues: "",
        }));
        setSearchResults(mapped);
        setSearchPage(newPage);
      }
      setIsSearching(false);
    },
    [searchQuery, filterRating],
  );

  // Determine which bots to display
  const isSearchActive =
    searchQuery.trim().length > 0 || filterRating !== "all";
  const displayBots = isSearchActive ? searchResults : bots;
  const totalPages = isSearchActive ? Math.ceil(searchTotal / PAGE_SIZE) : 1;
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [deleteConfirmBot, setDeleteConfirmBot] = useState<Bot | null>(null);
  const [collabDialogBot, setCollabDialogBot] = useState<
    Bot | CollaborativeBot | null
  >(null);
  const [workspaceBot, setWorkspaceBot] = useState<
    Bot | CollaborativeBot | null
  >(null);
  const [forking, setForking] = useState(false);

  // Restore workspace from localStorage on mount
  useEffect(() => {
    if (workspaceBotId && !workspaceBot && bots.length > 0) {
      const foundOwned = bots.find((b) => b.id === workspaceBotId);
      if (foundOwned) {
        setWorkspaceBot(foundOwned);
        return;
      }
      const foundCollab = collaborativeBots.find(
        (b) => b.id === workspaceBotId,
      );
      if (foundCollab) {
        setWorkspaceBot(foundCollab);
      }
    }
  }, [workspaceBotId, bots, collaborativeBots, workspaceBot]);

  // Check if we should open editing from external navigation
  const externalEditBot = selectedBotId
    ? bots.find((b) => b.id === selectedBotId)
    : null;

  useEffect(() => {
    if (externalEditBot && !editingBot && !isCreating) {
      setEditingBot(externalEditBot);
      setSelectedBotId(null);
    }
  }, [externalEditBot, editingBot, isCreating, setSelectedBotId]);

  // Handlers
  const handleCreateBot = async (data: BotFormData) => {
    const res = await createBotAction(data);
    if (!res.success) {
      toast.error(res.error || "Failed to create bot");
      return;
    }
    const r = res.bot;
    upsertBot({
      id: r.id,
      ownerId: r.user_id || undefined,
      chatName: r.chat_name || undefined,
      name: r.name,
      shortDescription: r.short_description || "",
      personality: r.personality || "",
      firstMessage: r.first_message || "",
      alternateGreetings: Array.isArray(r.alternate_greetings)
        ? r.alternate_greetings
        : [],
      scenario: r.scenario || "",
      exampleDialogues: r.example_dialogues || "",
      tags: Array.isArray(r.tags) ? r.tags : [],
      rating: r.rating === "NSFW" ? "NSFW" : "SFW",
      imageUrl: r.image_url || undefined,
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
      updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
    });
    setIsCreating(false);
    toast.success("Bot created successfully!");
  };

  const handleUpdateBot = async (data: BotFormData) => {
    if (!editingBot) return;
    const res = await updateBotAction(editingBot.id, data);
    if (!res.success) {
      toast.error(res.error || "Failed to update bot");
      return;
    }
    const r = res.bot;
    upsertBot({
      id: r.id,
      ownerId: r.user_id || undefined,
      chatName: r.chat_name || undefined,
      name: r.name,
      shortDescription: r.short_description || "",
      personality: r.personality || "",
      firstMessage: r.first_message || "",
      alternateGreetings: Array.isArray(r.alternate_greetings)
        ? r.alternate_greetings
        : [],
      scenario: r.scenario || "",
      exampleDialogues: r.example_dialogues || "",
      tags: Array.isArray(r.tags) ? r.tags : [],
      rating: r.rating === "NSFW" ? "NSFW" : "SFW",
      imageUrl: r.image_url || undefined,
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
      updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
    });
    setEditingBot(null);
    toast.success("Bot updated successfully!");
  };

  const handleDeleteBot = async () => {
    if (!deleteConfirmBot) return;
    const res = await deleteBotAction(deleteConfirmBot.id);
    if (!res.success) {
      toast.error(res.error || "Failed to delete bot");
      return;
    }
    deleteBot(deleteConfirmBot.id);
    setDeleteConfirmBot(null);
    setEditingBot(null);
    toast.success("Bot deleted successfully");
  };

  const handleExportBot = async (bot: Bot) => {
    try {
      const blob = await exportCharacterCardPNG(bot);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bot.name.replace(/\s+/g, "_")}_card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Character card exported!");
    } catch {
      toast.error("Failed to export character card");
    }
  };

  // If workspace is open, show it instead of the bot manager
  if (workspaceBot) {
    return (
      <CollaborationWorkspace
        bot={workspaceBot}
        userRole={
          "collaborator_role" in workspaceBot
            ? (workspaceBot as CollaborativeBot).collaborator_role
            : "owner"
        }
        onBack={() => {
          setWorkspaceBot(null);
          setWorkspaceBotId(null);
        }}
        onBotUpdated={() => {
          // Refresh the bot data when workspace saves
          window.dispatchEvent(new Event("focus"));
        }}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      {/* Pending Collaboration Invites */}
      <PendingInvites />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Bot Manager
          </h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
            Create, edit, and manage your bot characters
          </p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="cursor-pointer w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Bot
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilteredSearchInput
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search bots..."
          shortcutKey="/"
          filterOptions={[
            { value: "all", label: "All" },
            { value: "SFW", label: "SFW" },
            { value: "NSFW", label: "NSFW" },
          ]}
          filterValue={filterRating}
          onFilterChange={(v) => setFilterRating(v as FilterRating)}
          className="flex-1"
        />
        <div className="flex items-center gap-1 rounded-lg border p-1 w-full sm:w-auto">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="cursor-pointer flex-1 sm:flex-none"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="cursor-pointer flex-1 sm:flex-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bot List */}
      {isSearching ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
          Searching...
        </div>
      ) : displayBots.length > 0 || collaborativeBots.length > 0 ? (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "space-y-3",
          )}
        >
          {/* Owned bots */}
          {displayBots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              viewMode={viewMode}
              onEdit={() => setEditingBot(bot)}
              onDelete={() => setDeleteConfirmBot(bot)}
              onExport={() => handleExportBot(bot)}
              onCollaborators={() => setCollabDialogBot(bot)}
              onWorkspace={() => {
                setWorkspaceBot(bot);
                setWorkspaceBotId(bot.id);
              }}
              onFork={async () => {
                setForking(true);
                const result = await forkBot(bot.id);
                setForking(false);
                if (result.success) {
                  try {
                    const supabase = createClient();
                    const { data: forkedBotData } = await supabase
                      .from("bots")
                      .select("*")
                      .eq("id", result.forkedBotId)
                      .single();
                    if (forkedBotData) {
                      upsertBot({
                        id: forkedBotData.id,
                        ownerId: forkedBotData.user_id || undefined,
                        chatName: forkedBotData.chat_name || undefined,
                        name: forkedBotData.name,
                        shortDescription: forkedBotData.short_description || "",
                        personality: forkedBotData.personality || "",
                        firstMessage: forkedBotData.first_message || "",
                        alternateGreetings: Array.isArray(
                          forkedBotData.alternate_greetings,
                        )
                          ? forkedBotData.alternate_greetings
                          : [],
                        scenario: forkedBotData.scenario || "",
                        exampleDialogues: forkedBotData.example_dialogues || "",
                        tags: Array.isArray(forkedBotData.tags)
                          ? forkedBotData.tags
                          : [],
                        rating:
                          forkedBotData.rating === "NSFW" ? "NSFW" : "SFW",
                        imageUrl: forkedBotData.image_url || undefined,
                        createdAt: forkedBotData.created_at
                          ? new Date(forkedBotData.created_at)
                          : new Date(),
                        updatedAt: forkedBotData.updated_at
                          ? new Date(forkedBotData.updated_at)
                          : new Date(),
                      });
                    }
                  } catch {
                    // Bot will appear on next page load anyway
                  }
                  toast.success(`Bot "${bot.name}" forked successfully!`);
                } else {
                  toast.error(result.error || "Failed to fork bot");
                }
              }}
            />
          ))}

          {/* Collaborative bots (shared with me) */}
          {collaborativeBots.map((collabBot) => (
            <CollaborativeBotCard
              key={`collab-${collabBot.id}`}
              bot={collabBot}
              viewMode={viewMode}
              onCollaborators={() => setCollabDialogBot(collabBot)}
              onWorkspace={() => {
                setWorkspaceBot(collabBot);
                setWorkspaceBotId(collabBot.id);
              }}
              onExport={() => {
                // Export using the bot data from collaborative bot
                const botForExport: Bot = {
                  id: collabBot.id,
                  ownerId: collabBot.user_id,
                  name: collabBot.name,
                  chatName: collabBot.chat_name || undefined,
                  shortDescription: collabBot.short_description,
                  personality: collabBot.personality,
                  firstMessage: collabBot.first_message,
                  alternateGreetings: collabBot.alternate_greetings,
                  scenario: collabBot.scenario,
                  exampleDialogues: collabBot.example_dialogues,
                  tags: collabBot.tags,
                  rating: collabBot.rating as "SFW" | "NSFW",
                  createdAt: new Date(collabBot.created_at),
                  updatedAt: new Date(collabBot.updated_at),
                  imageUrl: collabBot.image_url || undefined,
                };
                handleExportBot(botForExport);
              }}
            />
          ))}
        </div>
      ) : !isSearchActive &&
        bots.length === 0 &&
        collaborativeBots.length === 0 ? (
        <Card>
          <EmptyState onCreateNew={() => setIsCreating(true)} />
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {isSearchActive
                ? `No bots found for "${searchQuery || filterRating}"`
                : "No bots match your search criteria"}
            </p>
            {isSearchActive && (
              <Button
                variant="link"
                onClick={() => {
                  setSearchQuery("");
                  setFilterRating("all");
                }}
                className="cursor-pointer"
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Sheet */}
      <Sheet
        open={isCreating || !!editingBot}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setEditingBot(null);
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="p-4 lg:p-6">
            <SheetTitle>
              {editingBot ? "Edit Bot" : "Create New Bot"}
            </SheetTitle>
            <SheetDescription>
              {editingBot
                ? "Update your bot's details and personality"
                : "Fill in the details to create a new bot character"}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <BotForm
              initialData={editingBot || undefined}
              onSubmit={editingBot ? handleUpdateBot : handleCreateBot}
              onCancel={() => {
                setIsCreating(false);
                setEditingBot(null);
              }}
              onDelete={
                editingBot ? () => setDeleteConfirmBot(editingBot) : undefined
              }
              isEditing={!!editingBot}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmBot}
        onOpenChange={(open) => !open && setDeleteConfirmBot(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmBot?.name}
              "? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmBot(null)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBot}
              className="cursor-pointer"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {isSearchActive && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {searchPage * PAGE_SIZE + 1}–
            {Math.min((searchPage + 1) * PAGE_SIZE, searchTotal)} of{" "}
            {searchTotal} bots
          </p>
          <Pagination className="w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (searchPage > 0) handlePageChange(searchPage - 1);
                  }}
                  className={cn(
                    "cursor-pointer",
                    searchPage === 0 && "pointer-events-none opacity-50",
                  )}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page =
                  totalPages <= 5
                    ? i
                    : Math.max(0, Math.min(searchPage - 2, totalPages - 5)) + i;
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === searchPage}
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page);
                      }}
                      className="cursor-pointer"
                    >
                      {page + 1}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (searchPage < totalPages - 1)
                      handlePageChange(searchPage + 1);
                  }}
                  className={cn(
                    "cursor-pointer",
                    searchPage >= totalPages - 1 &&
                      "pointer-events-none opacity-50",
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Collaborator Dialog */}
      {collabDialogBot && (
        <CollaboratorDialog
          open={!!collabDialogBot}
          onOpenChange={(open) => {
            if (!open) setCollabDialogBot(null);
          }}
          botId={collabDialogBot.id}
          botName={collabDialogBot.name}
          currentUserRole={
            "collaborator_role" in collabDialogBot
              ? (collabDialogBot as CollaborativeBot).collaborator_role
              : "owner"
          }
        />
      )}
    </div>
  );
}
