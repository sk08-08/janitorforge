// ============================================================================
// JanitorForge - Admin Feedback Inbox
// Professional admin view for suggestions and bug reports
// ============================================================================

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquareMore,
  RefreshCw,
  Search,
  Bug,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  StickyNote,
  Send,
  Filter,
  CircleDot,
  ArrowUpCircle,
  ArrowUp,
  Minus,
  MoreHorizontal,
  SquareCheck,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  updateFeedbackStatus,
  updateFeedbackPriority,
  markFeedbackRead,
  markMultipleRead,
  bulkUpdateStatus,
  addFeedbackNote,
  getFeedbackNotes,
  deleteFeedback,
} from "@/app/actions/feedback-admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedbackType = "suggestion" | "bug";
type FeedbackStatus = "new" | "reviewing" | "resolved" | "closed";
type FeedbackPriority = "low" | "medium" | "high" | "urgent";

interface FeedbackItem {
  id: string;
  feedback_type: FeedbackType;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  is_read: boolean;
  subject: string;
  message: string;
  source_label: string;
  source_page: string;
  source_path: string;
  related_id: string | null;
  contact: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface FeedbackNote {
  id: string;
  author_id: string;
  note: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

const statusConfig: Record<
  FeedbackStatus,
  { label: string; icon: typeof CircleDot; className: string }
> = {
  new: {
    label: "New",
    icon: CircleDot,
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  reviewing: {
    label: "Reviewing",
    icon: Eye,
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  closed: {
    label: "Closed",
    icon: X,
    className: "bg-muted text-muted-foreground border-border",
  },
};

const priorityConfig: Record<
  FeedbackPriority,
  { label: string; icon: typeof ArrowUp; className: string; order: number }
> = {
  low: {
    label: "Low",
    icon: Minus,
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    order: 0,
  },
  medium: {
    label: "Medium",
    icon: ArrowUp,
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    order: 1,
  },
  high: {
    label: "High",
    icon: ArrowUpCircle,
    className: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    order: 2,
  },
  urgent: {
    label: "Urgent",
    icon: AlertTriangle,
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    order: 3,
  },
};

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof CircleDot;
  accent?: string;
}) {
  return (
    <Card className="border-border/70 bg-card/90 backdrop-blur">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ring-border/50",
            accent || "bg-primary/10",
          )}
        >
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function FeedbackInbox() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | FeedbackType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>(
    "all",
  );
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | FeedbackPriority
  >("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Detail panel
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [detailNotes, setDetailNotes] = useState<FeedbackNote[]>([]);
  const [detailNotesLoading, setDetailNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FeedbackItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load data
  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const access = await getCurrentUserAccess(supabase);
      setIsAdmin(access.isAdmin);

      if (!access.user || !access.isAdmin) {
        setItems([]);
        return;
      }

      const { data, error } = await supabase
        .from("feedback_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("Failed to load feedback:", error);
        setItems([]);
        return;
      }

      setItems((data ?? []) as FeedbackItem[]);
    } catch (error) {
      console.error("Error loading feedback inbox:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  // Load notes when selected item changes
  useEffect(() => {
    if (!selectedItem) {
      setDetailNotes([]);
      return;
    }

    let mounted = true;
    setDetailNotesLoading(true);

    getFeedbackNotes(selectedItem.id).then((result) => {
      if (!mounted) return;
      setDetailNotes(result.notes as FeedbackNote[]);
      setDetailNotesLoading(false);
    });

    // Mark as read when opening
    if (!selectedItem.is_read) {
      markFeedbackRead(selectedItem.id, true).then((result) => {
        if (result.success) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === selectedItem.id ? { ...item, is_read: true } : item,
            ),
          );
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [selectedItem]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType =
        typeFilter === "all" || item.feedback_type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" ||
        (item.priority || "medium") === priorityFilter;
      const matchesRead = !showUnreadOnly || !item.is_read;
      const matchesSearch =
        !searchQuery ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.source_label || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      return (
        matchesType &&
        matchesStatus &&
        matchesPriority &&
        matchesRead &&
        matchesSearch
      );
    });
  }, [
    items,
    typeFilter,
    statusFilter,
    priorityFilter,
    showUnreadOnly,
    searchQuery,
  ]);

  // Stats
  const stats = useMemo(
    () => ({
      total: items.length,
      unread: items.filter((i) => !i.is_read).length,
      bugs: items.filter((i) => i.feedback_type === "bug").length,
      suggestions: items.filter((i) => i.feedback_type === "suggestion").length,
      newCount: items.filter((i) => i.status === "new").length,
      reviewing: items.filter((i) => i.status === "reviewing").length,
    }),
    [items],
  );

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Action handlers
  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    const result = await updateFeedbackStatus(id, status);
    if (result.success) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item)),
      );
      if (selectedItem?.id === id) {
        setSelectedItem((prev) => (prev ? { ...prev, status } : null));
      }
      toast.success(`Status changed to ${statusConfig[status].label}`);
    } else {
      toast.error(result.error || "Failed to update status");
    }
  };

  const handlePriorityChange = async (
    id: string,
    priority: FeedbackPriority,
  ) => {
    const result = await updateFeedbackPriority(id, priority);
    if (result.success) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, priority } : item)),
      );
      if (selectedItem?.id === id) {
        setSelectedItem((prev) => (prev ? { ...prev, priority } : null));
      }
      toast.success(`Priority changed to ${priorityConfig[priority].label}`);
    } else {
      toast.error(result.error || "Failed to update priority");
    }
  };

  const handleToggleRead = async (id: string, currentRead: boolean) => {
    const result = await markFeedbackRead(id, !currentRead);
    if (result.success) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_read: !currentRead } : item,
        ),
      );
    }
  };

  const handleBulkMarkRead = async (isRead: boolean) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const result = await markMultipleRead(ids, isRead);
    if (result.success) {
      setItems((prev) =>
        prev.map((item) =>
          ids.includes(item.id) ? { ...item, is_read: isRead } : item,
        ),
      );
      clearSelection();
      toast.success(
        `${ids.length} items marked as ${isRead ? "read" : "unread"}`,
      );
    }
  };

  const handleBulkStatus = async (status: FeedbackStatus) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const result = await bulkUpdateStatus(ids, status);
    if (result.success) {
      setItems((prev) =>
        prev.map((item) =>
          ids.includes(item.id) ? { ...item, status } : item,
        ),
      );
      clearSelection();
      toast.success(
        `${ids.length} items moved to ${statusConfig[status].label}`,
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteFeedback(deleteTarget.id);
    setDeleting(false);
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      if (selectedItem?.id === deleteTarget.id) setSelectedItem(null);
      setDeleteTarget(null);
      toast.success("Feedback deleted");
    } else {
      toast.error(result.error || "Failed to delete");
    }
  };

  const handleAddNote = async () => {
    if (!selectedItem || !newNote.trim()) return;
    setAddingNote(true);
    const result = await addFeedbackNote(selectedItem.id, newNote);
    setAddingNote(false);
    if (result.success && result.note) {
      setDetailNotes((prev) => [...prev, result.note as FeedbackNote]);
      setNewNote("");
      toast.success("Note added");
    } else {
      toast.error(result.error || "Failed to add note");
    }
  };

  // Navigate between items
  const currentIndex = selectedItem
    ? filteredItems.findIndex((i) => i.id === selectedItem.id)
    : -1;

  const navigateItem = (direction: "prev" | "next") => {
    if (currentIndex === -1) return;
    const nextIndex =
      direction === "next"
        ? Math.min(currentIndex + 1, filteredItems.length - 1)
        : Math.max(currentIndex - 1, 0);
    if (nextIndex !== currentIndex) {
      setSelectedItem(filteredItems[nextIndex]);
    }
  };

  // Check if columns exist (graceful fallback if migration not applied)
  const hasNewFields = items.length > 0 && "priority" in items[0];

  // No access
  if (!loading && !isAdmin) {
    return (
      <div className="p-4 sm:p-6 md:p-8 lg:p-10">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            You do not have access to the admin feedback inbox.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquareMore className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Feedback Inbox
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and manage user suggestions and bug reports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={loadFeedback}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total" value={stats.total} icon={MessageSquareMore} />
        <KpiCard
          label="Unread"
          value={stats.unread}
          icon={EyeOff}
          accent="bg-amber-500/10"
        />
        <KpiCard
          label="New"
          value={stats.newCount}
          icon={CircleDot}
          accent="bg-blue-500/10"
        />
        <KpiCard
          label="Reviewing"
          value={stats.reviewing}
          icon={Clock}
          accent="bg-amber-500/10"
        />
        <KpiCard
          label="Bugs"
          value={stats.bugs}
          icon={Bug}
          accent="bg-red-500/10"
        />
        <KpiCard
          label="Suggestions"
          value={stats.suggestions}
          icon={Lightbulb}
          accent="bg-emerald-500/10"
        />
      </div>

      {/* Filters Bar */}
      <Card className="border-border/70 bg-card/90 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search feedback by subject, message, or source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filters:</span>
              </div>

              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as any)}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="suggestion">Suggestions</SelectItem>
                  <SelectItem value="bug">Bug reports</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as any)}
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              {hasNewFields && (
                <Select
                  value={priorityFilter}
                  onValueChange={(v) => setPriorityFilter(v as any)}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Button
                variant={showUnreadOnly ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs cursor-pointer"
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              >
                <EyeOff className="h-3.5 w-3.5 mr-1" />
                Unread only
              </Button>

              {(typeFilter !== "all" ||
                statusFilter !== "all" ||
                priorityFilter !== "all" ||
                showUnreadOnly ||
                searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground cursor-pointer"
                  onClick={() => {
                    setTypeFilter("all");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setShowUnreadOnly(false);
                    setSearchQuery("");
                  }}
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-3 p-3">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs cursor-pointer"
                onClick={() => handleBulkMarkRead(true)}
              >
                <Eye className="h-3 w-3 mr-1" /> Mark read
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs cursor-pointer"
                onClick={() => handleBulkMarkRead(false)}
              >
                <EyeOff className="h-3 w-3 mr-1" /> Mark unread
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs cursor-pointer"
                onClick={() => handleBulkStatus("resolved")}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs cursor-pointer"
                onClick={() => handleBulkStatus("closed")}
              >
                Close
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs cursor-pointer"
                onClick={clearSelection}
              >
                <X className="h-3 w-3 mr-1" /> Deselect all
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 w-3/4 rounded bg-muted mb-3" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="space-y-2">
          {/* List header */}
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>
              {filteredItems.length} result{filteredItems.length !== 1 && "s"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs cursor-pointer"
              onClick={toggleSelectAll}
            >
              {selectedIds.size === filteredItems.length
                ? "Deselect all"
                : "Select all"}
            </Button>
          </div>

          {/* Items */}
          {filteredItems.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isCurrentlyViewing = selectedItem?.id === item.id;
            const statusConf = statusConfig[item.status];
            const priorityConf = priorityConfig[item.priority || "medium"];
            const StatusIcon = statusConf.icon;
            const PriorityIcon = priorityConf.icon;

            return (
              <Card
                key={item.id}
                className={cn(
                  "group transition-all cursor-pointer hover:border-primary/40 hover:shadow-md",
                  isCurrentlyViewing &&
                    "border-primary/60 shadow-md ring-1 ring-primary/20",
                  !item.is_read && "border-l-2 border-l-primary",
                )}
                onClick={() => setSelectedItem(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      className="mt-1 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                    >
                      {isSelected ? (
                        <SquareCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3
                          className={cn(
                            "text-sm leading-snug truncate flex-1",
                            !item.is_read ? "font-semibold" : "font-medium",
                          )}
                        >
                          {item.subject}
                        </h3>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                          {timeAgo(item.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {item.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Type badge */}
                        <Badge
                          variant={
                            item.feedback_type === "bug"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] px-1.5 py-0"
                        >
                          {item.feedback_type === "bug" ? (
                            <Bug className="h-2.5 w-2.5 mr-0.5" />
                          ) : (
                            <Lightbulb className="h-2.5 w-2.5 mr-0.5" />
                          )}
                          {item.feedback_type === "bug" ? "Bug" : "Suggestion"}
                        </Badge>

                        {/* Status badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            statusConf.className,
                          )}
                        >
                          <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                          {statusConf.label}
                        </Badge>

                        {/* Priority badge (only if migration applied) */}
                        {hasNewFields && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              priorityConf.className,
                            )}
                          >
                            <PriorityIcon className="h-2.5 w-2.5 mr-0.5" />
                            {priorityConf.label}
                          </Badge>
                        )}

                        {/* Source */}
                        {item.source_label && (
                          <span className="text-[10px] text-muted-foreground">
                            {item.source_label}
                          </span>
                        )}

                        {/* Unread dot */}
                        {!item.is_read && (
                          <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>

                    {/* Actions menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRead(item.id, item.is_read);
                          }}
                        >
                          {item.is_read ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" /> Mark unread
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" /> Mark read
                            </>
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <CircleDot className="h-4 w-4 mr-2" />
                            Change status
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {(
                              Object.keys(statusConfig) as FeedbackStatus[]
                            ).map((s) => (
                              <DropdownMenuItem
                                key={s}
                                disabled={item.status === s}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(item.id, s);
                                }}
                              >
                                {statusConfig[s].label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        {hasNewFields && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <ArrowUp className="h-4 w-4 mr-2" />
                              Change priority
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {(
                                Object.keys(
                                  priorityConfig,
                                ) as FeedbackPriority[]
                              ).map((p) => (
                                <DropdownMenuItem
                                  key={p}
                                  disabled={(item.priority || "medium") === p}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePriorityChange(item.id, p);
                                  }}
                                >
                                  {priorityConfig[p].label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(item);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquareMore className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No feedback found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters or search query."
                : "No feedback submissions yet."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          DETAIL DIALOG
          ========================================================================= */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-4xl">
          {selectedItem && (
            <>
              {/* Dialog navigation bar */}
              <div className="flex items-center justify-between border-b px-4 py-2 sm:px-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    disabled={currentIndex <= 0}
                    onClick={() => navigateItem("prev")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {currentIndex + 1} of {filteredItems.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    disabled={currentIndex >= filteredItems.length - 1}
                    onClick={() => navigateItem("next")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs cursor-pointer"
                    onClick={() =>
                      handleToggleRead(selectedItem.id, selectedItem.is_read)
                    }
                  >
                    {selectedItem.is_read ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5 mr-1" /> Mark unread
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Mark read
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive cursor-pointer"
                    onClick={() => setDeleteTarget(selectedItem)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>

              {/* Dialog content */}
              <ScrollArea className="flex-1 overflow-auto">
                <div className="p-4 sm:p-6 space-y-4">
                  <DialogHeader className="text-left space-y-2">
                    <div className="flex flex-wrap items-start gap-2">
                      <Badge
                        variant={
                          selectedItem.feedback_type === "bug"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {selectedItem.feedback_type === "bug" ? (
                          <Bug className="h-3 w-3 mr-1" />
                        ) : (
                          <Lightbulb className="h-3 w-3 mr-1" />
                        )}
                        {selectedItem.feedback_type === "bug"
                          ? "Bug Report"
                          : "Suggestion"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={statusConfig[selectedItem.status].className}
                      >
                        {statusConfig[selectedItem.status].label}
                      </Badge>
                      {hasNewFields && (
                        <Badge
                          variant="outline"
                          className={
                            priorityConfig[selectedItem.priority || "medium"]
                              .className
                          }
                        >
                          {
                            priorityConfig[selectedItem.priority || "medium"]
                              .label
                          }
                        </Badge>
                      )}
                    </div>
                    <DialogTitle className="text-xl leading-snug">
                      {selectedItem.subject}
                    </DialogTitle>
                    <DialogDescription className="break-words">
                      {selectedItem.source_label || "Unknown source"} ·{" "}
                      {formatDate(selectedItem.created_at)}
                      {selectedItem.is_read ? (
                        <span className="ml-2 text-xs">(Read)</span>
                      ) : (
                        <span className="ml-2 text-xs text-primary font-medium">
                          (Unread)
                        </span>
                      )}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Quick actions */}
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={selectedItem.status}
                      onValueChange={(v) =>
                        handleStatusChange(selectedItem.id, v as FeedbackStatus)
                      }
                    >
                      <SelectTrigger className="w-[150px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(statusConfig) as FeedbackStatus[]).map(
                          (s) => (
                            <SelectItem key={s} value={s}>
                              {statusConfig[s].label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>

                    {hasNewFields && (
                      <Select
                        value={selectedItem.priority || "medium"}
                        onValueChange={(v) =>
                          handlePriorityChange(
                            selectedItem.id,
                            v as FeedbackPriority,
                          )
                        }
                      >
                        <SelectTrigger className="w-[150px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.keys(priorityConfig) as FeedbackPriority[]
                          ).map((p) => (
                            <SelectItem key={p} value={p}>
                              {priorityConfig[p].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Content grid */}
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
                    {/* Message */}
                    <Card className="border-border/70">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Message</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                          {selectedItem.message}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Details */}
                    <Card className="border-border/70">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Details</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Source page
                          </p>
                          <p className="break-words">
                            {selectedItem.source_page || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Source path
                          </p>
                          <p className="break-all font-mono text-xs">
                            {selectedItem.source_path || "-"}
                          </p>
                        </div>
                        {selectedItem.related_id && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Related ID
                            </p>
                            <p className="break-all font-mono text-xs">
                              {selectedItem.related_id}
                            </p>
                          </div>
                        )}
                        {selectedItem.contact && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Contact
                            </p>
                            <p className="break-all">{selectedItem.contact}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Attached images */}
                  {Array.isArray(selectedItem.metadata?.images) &&
                    (selectedItem.metadata.images as any[]).length > 0 && (
                      <Card className="border-border/70">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">
                            Attached images
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {(
                              selectedItem.metadata.images as Array<{
                                name?: string;
                                size?: number;
                                dataUrl?: string;
                              }>
                            ).map((image, index) =>
                              image.dataUrl ? (
                                <div
                                  key={`${selectedItem.id}-img-${index}`}
                                  className="overflow-hidden rounded-lg border"
                                >
                                  <img
                                    src={image.dataUrl}
                                    alt={
                                      image.name || `Attachment ${index + 1}`
                                    }
                                    className="h-44 w-full object-cover"
                                  />
                                  <div className="space-y-1 p-3 text-xs text-muted-foreground">
                                    <p className="truncate font-medium text-foreground">
                                      {image.name || `Attachment ${index + 1}`}
                                    </p>
                                    {typeof image.size === "number" && (
                                      <p>{Math.round(image.size / 1024)} KB</p>
                                    )}
                                  </div>
                                </div>
                              ) : null,
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* Admin Notes */}
                  <Card className="border-border/70">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <StickyNote className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">
                          Internal Notes
                        </CardTitle>
                      </div>
                      <CardDescription>
                        Private notes visible only to admins.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {detailNotesLoading ? (
                        <p className="text-xs text-muted-foreground">
                          Loading notes...
                        </p>
                      ) : detailNotes.length > 0 ? (
                        <div className="space-y-2">
                          {detailNotes.map((note) => (
                            <div
                              key={note.id}
                              className="rounded-lg border border-border/70 bg-muted/50 p-3"
                            >
                              <p className="text-sm whitespace-pre-wrap">
                                {note.note}
                              </p>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {formatDate(note.created_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No notes yet.
                        </p>
                      )}

                      {/* Add note */}
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Add an internal note..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="cursor-pointer"
                          disabled={!newNote.trim() || addingNote}
                          onClick={handleAddNote}
                        >
                          {addingNote ? (
                            "Adding..."
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5 mr-1.5" /> Add Note
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.subject}" and all
              associated notes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
