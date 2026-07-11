// ============================================================================
// JanitorForge - Admin Panel
// Centralised moderation and management panel for site admins.
// ============================================================================

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  FileText,
  Inbox,
  Shield,
  ShieldAlert,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Ban,
  CheckCircle,
  CrownIcon,
  Trash2,
  UserRound,
  Bot,
  MoreVertical,
  RotateCcw,
  ImageOff,
  TrendingUp,
  AlertTriangle,
  Eye,
  Flame,
  ExternalLink,
  Tag,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { renderMarkdown, renderMarkdownInline } from "@/lib/markdown";
import { formatDateTime } from "@/lib/utils";
import ModerationPageContent from "@/app/dashboard/moderation/content";
import {
  getAdminStats,
  getRecentActivity,
  getAllSubmissions,
  getAllForms,
  getAllBots,
  getAdminUsers,
  setUserAdminStatus,
  blockUser,
  unblockUser,
  resetUserDisplayName,
  clearUserAvatar,
  deleteUserAsAdmin,
  getSubmissionById,
  getBotById,
  getFormById,
  softDeleteSubmission,
  softDeleteForm,
  softDeleteBot,
  hardDeleteSubmission,
  hardDeleteForm,
  hardDeleteBot,
} from "@/app/actions/admin";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

type AdminTab =
  | "overview"
  | "submissions"
  | "forms"
  | "bots"
  | "users"
  | "moderation";

// ============================================================================
// Pagination helper
// ============================================================================

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-2 pt-3">
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages} ({total} total)
      </span>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Overview Tab
// ============================================================================

interface Stats {
  total_users: number;
  total_bots: number;
  total_forms: number;
  total_submissions: number;
  color: string;
  pending_flagged: number;
  new_today: number;
  blocked_users: number;
  admin_users: number;
  active_forms: number;
  deleted_submissions: number;
  new_users_week: number;
  sfw_bots: number;
  nsfw_bots: number;
}

function OverviewTab({
  onNavigateToSubmission,
}: {
  onNavigateToSubmission: (id: string) => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<{
    recent_users: any[];
    recent_submissions: any[];
    recent_flagged: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [statsRes, activityRes] = await Promise.all([
      getAdminStats(),
      getRecentActivity(),
    ]);
    if (statsRes.success && statsRes.stats) setStats(statsRes.stats as Stats);
    if (activityRes.success)
      setActivity({
        recent_users: activityRes.recent_users,
        recent_submissions: activityRes.recent_submissions,
        recent_flagged: activityRes.recent_flagged,
      });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statCards = stats
    ? [
        {
          label: "Total Users",
          value: stats.total_users,
          sub: `+${stats.new_users_week} this week`,
          icon: UsersRound,
          color: "text-primary",
        },
        {
          label: "Active Bots",
          value: stats.total_bots,
          sub: `${stats.sfw_bots} SFW · ${stats.nsfw_bots} NSFW`,
          icon: Bot,
          color: "text-green-500",
        },
        {
          label: "Active Forms",
          value: stats.active_forms,
          sub: `${stats.total_forms} total`,
          icon: FileText,
          color: "text-muted-foreground",
        },
        {
          label: "Submissions",
          value: stats.total_submissions,
          sub: `+${stats.new_today} today`,
          icon: Inbox,
          color: "text-blue-500",
        },
        {
          label: "Pending Flags",
          value: stats.pending_flagged,
          sub: "unreviewed",
          icon: Shield,
          color: "text-orange-500",
          highlight: stats.pending_flagged > 0,
        },
        {
          label: "Deleted Submissions",
          value: stats.deleted_submissions,
          sub: "soft-deleted",
          icon: Trash2,
          color: "text-red-500",
        },
        {
          label: "Blocked Users",
          value: stats.blocked_users,
          sub: "platform bans",
          icon: Ban,
          color: "text-red-500",
          highlight: stats.blocked_users > 0,
        },
        {
          label: "Admin Users",
          value: stats.admin_users,
          sub: "with admin access",
          icon: CrownIcon,
          color: "text-yellow-500",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Platform Overview</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="cursor-pointer"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats grid */}
      {loading && !stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.label}
                className={card.highlight ? "border-destructive/50" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${card.color ?? (card.highlight ? "text-destructive" : "text-muted-foreground")}`}
                    />
                    <span className="text-2xl font-bold">{card.value}</span>
                  </div>
                  <p className="mt-0.5 text-sm font-medium">{card.label}</p>
                  <p className="text-xs text-muted-foreground">{card.sub}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recent activity */}
      {!loading && activity && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent signups */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Recent Signups
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activity.recent_users.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  No users yet.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {activity.recent_users.map((u: any) => (
                    <a
                      key={u.id}
                      href={u.username ? `/${u.username}` : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback>
                          {(u.username ?? "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          @{u.username ?? "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(u.created_at)}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent submissions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Inbox className="h-4 w-4 text-blue-500" />
                Recent Submissions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activity.recent_submissions.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  No submissions yet.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {activity.recent_submissions.map((s: any) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onNavigateToSubmission(s.id)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm rendered-markdown"
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdownInline(s.form_title) || "—",
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          @{s.owner?.username ?? "unknown"} ·{" "}
                          {s.submitter_name ?? "anonymous"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          s.status === "new"
                            ? "default"
                            : s.status === "accepted"
                              ? "secondary"
                              : s.status === "completed"
                                ? "outline"
                                : "destructive"
                        }
                        className="text-xs shrink-0"
                      >
                        {s.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending flags */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Unreviewed Flags
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activity.recent_flagged.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  No pending flags.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {activity.recent_flagged.map((f: any) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 px-4 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-muted-foreground">
                          Request #{f.request_id?.slice(0, 8)}…
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(f.created_at)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          f.risk_level === "high" || f.risk_level === "critical"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs shrink-0"
                      >
                        {f.risk_level ?? "—"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Submissions Tab
// ============================================================================

function SubmissionsTab({
  openId,
  onClearOpenId,
}: {
  openId?: string | null;
  onClearOpenId?: () => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAllSubmissions(
      page,
      LIMIT,
      statusFilter,
      userFilter,
    );
    if (result.success) {
      setItems(result.items);
      setTotal(result.total);
    }
    setLoading(false);
  }, [page, statusFilter, userFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setSelectedItem({ id, _loading: true });
    const result = await getSubmissionById(id);
    if (result.success && result.item) {
      setSelectedItem(result.item);
    } else {
      toast.error(result.error ?? "Failed to load submission");
      setSelectedItem(null);
    }
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (!openId) return;
    handleOpenDetail(openId);
    onClearOpenId?.();
  }, [openId]);

  const handleSearch = () => {
    setUserFilter(searchInput);
    setPage(1);
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "new":
        return "default";
      case "accepted":
        return "secondary";
      case "completed":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="accepted">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Input
            placeholder="Filter by username…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-48"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleSearch}
            className="cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={loading}
          className="cursor-pointer ml-auto"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Submitter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No submissions found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: any) => {
                const isDeleted = !!item.deleted_at;
                return (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer hover:bg-muted/50 ${isDeleted ? "opacity-60 bg-destructive/5" : ""}`}
                    onClick={() => handleOpenDetail(item.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={item.owner?.avatar_url} />
                          <AvatarFallback>
                            {(item.owner?.username ?? "?")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          @{item.owner?.username ?? "unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-40 text-sm">
                      <span
                        className="rendered-markdown line-clamp-1"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdownInline(item.form_title) || "—",
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.submitter_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant={statusBadgeVariant(item.status) as any}>
                          {item.status}
                        </Badge>
                        {isDeleted && (
                          <Badge variant="destructive" className="text-xs">
                            Deleted
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateTime(item.created_at)}
                    </TableCell>
                    <TableCell>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        total={total}
        limit={LIMIT}
        onPageChange={setPage}
      />

      {/* Detail sheet */}
      <Sheet
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl h-full overflow-hidden flex flex-col p-0"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>Submission Detail</SheetTitle>
            <SheetDescription>
              Full details for this submission.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0 px-6 py-4">
            {selectedItem?._loading || detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              selectedItem && (
                <div className="space-y-5">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={statusBadgeVariant(selectedItem.status) as any}
                      className="capitalize"
                    >
                      {selectedItem.status}
                    </Badge>
                    {selectedItem.deleted_at && (
                      <Badge variant="destructive">Soft-Deleted</Badge>
                    )}
                  </div>

                  {/* Form title */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Form</p>
                    <p
                      className="text-sm font-medium rendered-markdown"
                      dangerouslySetInnerHTML={{
                        __html:
                          renderMarkdownInline(selectedItem.form_title) || "—",
                      }}
                    />
                  </div>

                  {/* Meta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Submitter</p>
                      <p className="font-medium">
                        {selectedItem.submitter_name ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Form Owner
                      </p>
                      <p className="font-medium">
                        @{selectedItem.owner?.username ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {formatDateTime(selectedItem.created_at)}
                      </p>
                    </div>
                    {selectedItem.updated_at && (
                      <div>
                        <p className="text-xs text-muted-foreground">Updated</p>
                        <p className="font-medium">
                          {formatDateTime(selectedItem.updated_at)}
                        </p>
                      </div>
                    )}
                    {selectedItem.deleted_at && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Deleted at
                        </p>
                        <p className="font-medium text-destructive">
                          {formatDateTime(selectedItem.deleted_at)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Responses */}
                  {selectedItem.responses &&
                    Object.keys(selectedItem.responses).length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Responses</p>
                        <div className="space-y-3 rounded-md border p-3">
                          {Object.entries(
                            selectedItem.responses as Record<string, any>,
                          ).map(([key, value]) => {
                            const label =
                              (selectedItem.response_labels as any)?.[key] ??
                              key;
                            return (
                              <div key={key}>
                                <p className="text-xs text-muted-foreground">
                                  {label}
                                </p>
                                <p className="text-sm wrap-break-word">
                                  {Array.isArray(value)
                                    ? value.join(", ")
                                    : String(value ?? "—")}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* Notes */}
                  {selectedItem.notes && (
                    <div>
                      <p className="text-sm font-medium mb-1">Notes</p>
                      <p className="text-sm bg-muted rounded p-2">
                        {selectedItem.notes}
                      </p>
                    </div>
                  )}

                  {!selectedItem.deleted_at && (
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        Soft delete this submission to hide it from regular
                        views while keeping it recoverable.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="cursor-pointer"
                        onClick={async () => {
                          const result = await softDeleteSubmission(
                            selectedItem.id,
                          );
                          if (!result.success) {
                            toast.error(result.error ?? "Failed");
                            return;
                          }
                          const deletedAt =
                            (result as any).deleted_at ??
                            new Date().toISOString();
                          toast.success("Submission soft-deleted");
                          setSelectedItem((prev: any) =>
                            prev ? { ...prev, deleted_at: deletedAt } : prev,
                          );
                          setItems((prev) =>
                            prev.map((i) =>
                              i.id === selectedItem.id
                                ? { ...i, deleted_at: deletedAt }
                                : i,
                            ),
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Soft Delete
                      </Button>
                    </div>
                  )}

                  {/* Hard delete */}
                  {selectedItem.deleted_at && (
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        This record is soft-deleted and can be permanently
                        removed.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="cursor-pointer"
                        onClick={async () => {
                          const result = await hardDeleteSubmission(
                            selectedItem.id,
                          );
                          if (!result.success) {
                            toast.error(result.error ?? "Failed");
                            return;
                          }
                          toast.success("Permanently deleted");
                          setSelectedItem(null);
                          setItems((prev) =>
                            prev.filter((i) => i.id !== selectedItem.id),
                          );
                        }}
                      >
                        <Flame className="h-4 w-4 mr-2" />
                        Permanently Delete
                      </Button>
                    </div>
                  )}
                </div>
              )
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================================
// Forms Tab
// ============================================================================

function FormsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAllForms(page, LIMIT, userFilter);
    if (result.success) {
      setItems(result.items);
      setTotal(result.total);
    }
    setLoading(false);
  }, [page, userFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setUserFilter(searchInput);
    setPage(1);
  };

  const handleOpenDetail = async (id: string) => {
    setSelectedItem({ id, _loading: true });
    setDetailLoading(true);
    const result = await getFormById(id);
    if (result.success && result.item) {
      setSelectedItem(result.item);
    } else {
      toast.error(result.error ?? "Failed to load form");
      setSelectedItem(null);
    }
    setDetailLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          <Input
            placeholder="Filter by username…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-48"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleSearch}
            className="cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={loading}
          className="cursor-pointer ml-auto"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No forms found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: any) => {
                const isDeleted = !!item.deleted_at;
                return (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer hover:bg-muted/50 ${isDeleted ? "opacity-60 bg-destructive/5" : ""}`}
                    onClick={() => handleOpenDetail(item.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={item.owner?.avatar_url} />
                          <AvatarFallback>
                            {(item.owner?.username ?? "?")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          @{item.owner?.username ?? "unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-48 text-sm font-medium">
                      <span
                        className="rendered-markdown line-clamp-1"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdownInline(item.title) || "—",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Badge
                          variant={item.is_active ? "default" : "secondary"}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {isDeleted && (
                          <Badge variant="destructive" className="text-xs">
                            Deleted
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateTime(item.created_at)}
                    </TableCell>
                    <TableCell>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        total={total}
        limit={LIMIT}
        onPageChange={setPage}
      />

      {/* Detail sheet */}
      <Sheet
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl h-full overflow-hidden flex flex-col p-0"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>Form Detail</SheetTitle>
            <SheetDescription>
              Full configuration for this form.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0 px-6 py-4">
            {selectedItem?._loading || detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              selectedItem && (
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={selectedItem.is_active ? "default" : "secondary"}
                    >
                      {selectedItem.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {selectedItem.deleted_at && (
                      <Badge variant="destructive">Soft-Deleted</Badge>
                    )}
                    {selectedItem.security_sensitivity && (
                      <Badge variant="outline">
                        {selectedItem.security_sensitivity}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      Title
                    </p>
                    <p
                      className="text-base font-semibold rendered-markdown"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdownInline(selectedItem.title) || "—",
                      }}
                    />
                  </div>

                  {selectedItem.description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Description
                      </p>
                      <div
                        className="text-sm rendered-markdown leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(selectedItem.description),
                        }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Owner</p>
                      <p className="font-medium">
                        @{selectedItem.owner?.username ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sections</p>
                      <p className="font-medium">
                        {(selectedItem.sections as any[])?.length ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {formatDateTime(selectedItem.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Updated</p>
                      <p className="font-medium">
                        {formatDateTime(selectedItem.updated_at)}
                      </p>
                    </div>
                    {selectedItem.deleted_at && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Deleted at
                        </p>
                        <p className="font-medium text-destructive">
                          {formatDateTime(selectedItem.deleted_at)}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedItem.shareable_link && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Shareable Link
                      </p>
                      <a
                        href={`/form/${selectedItem.shareable_link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        /form/{selectedItem.shareable_link}{" "}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {Array.isArray(selectedItem.sections) &&
                    selectedItem.sections.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Sections</p>
                        <div className="space-y-2">
                          {(selectedItem.sections as any[]).map(
                            (sec: any, i: number) => (
                              <div
                                key={sec.id ?? i}
                                className="rounded-md border p-3"
                              >
                                <p
                                  className="text-sm font-medium rendered-markdown"
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      renderMarkdownInline(sec.title) ||
                                      `Section ${i + 1}`,
                                  }}
                                />
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {(sec.fields ?? []).length} field
                                  {(sec.fields ?? []).length !== 1 ? "s" : ""}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {!selectedItem.deleted_at && (
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        Soft delete this form to hide it from regular views
                        while keeping it recoverable.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="cursor-pointer"
                        onClick={async () => {
                          const result = await softDeleteForm(selectedItem.id);
                          if (!result.success) {
                            toast.error(result.error ?? "Failed");
                            return;
                          }
                          const deletedAt =
                            (result as any).deleted_at ??
                            new Date().toISOString();
                          toast.success("Form soft-deleted");
                          setSelectedItem((prev: any) =>
                            prev ? { ...prev, deleted_at: deletedAt } : prev,
                          );
                          setItems((prev) =>
                            prev.map((i) =>
                              i.id === selectedItem.id
                                ? { ...i, deleted_at: deletedAt }
                                : i,
                            ),
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Soft Delete
                      </Button>
                    </div>
                  )}

                  {selectedItem.deleted_at && (
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        This form is soft-deleted and can be permanently
                        removed.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="cursor-pointer"
                        onClick={async () => {
                          const result = await hardDeleteForm(selectedItem.id);
                          if (!result.success) {
                            toast.error(result.error ?? "Failed");
                            return;
                          }
                          toast.success("Form permanently deleted");
                          setSelectedItem(null);
                          setItems((prev) =>
                            prev.filter((i) => i.id !== selectedItem.id),
                          );
                        }}
                      >
                        <Flame className="h-4 w-4 mr-2" />
                        Permanently Delete
                      </Button>
                    </div>
                  )}
                </div>
              )
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================================
// Bots Tab
// ============================================================================

function BotsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAllBots(page, LIMIT, userFilter, ratingFilter);
    if (result.success) {
      setItems(result.items);
      setTotal(result.total);
    }
    setLoading(false);
  }, [page, userFilter, ratingFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setUserFilter(searchInput);
    setPage(1);
  };

  const handleOpenDetail = async (id: string) => {
    setSelectedItem({ id, _loading: true });
    setDetailLoading(true);
    const result = await getBotById(id);
    if (result.success && result.item) {
      setSelectedItem(result.item);
    } else {
      toast.error(result.error ?? "Failed to load bot");
      setSelectedItem(null);
    }
    setDetailLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select
          value={ratingFilter}
          onValueChange={(v) => {
            setRatingFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ratings</SelectItem>
            <SelectItem value="SFW">SFW</SelectItem>
            <SelectItem value="NSFW">NSFW</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Input
            placeholder="Filter by username…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-48"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleSearch}
            className="cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={loading}
          className="cursor-pointer ml-auto"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead>Bot Name</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No bots found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: any) => {
                const isDeleted = !!item.deleted_at;
                return (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer hover:bg-muted/50 ${isDeleted ? "opacity-60 bg-destructive/5" : ""}`}
                    onClick={() => handleOpenDetail(item.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={item.owner?.avatar_url} />
                          <AvatarFallback>
                            {(item.owner?.username ?? "?")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          @{item.owner?.username ?? "unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium max-w-40 truncate">
                      {item.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Badge
                          variant={
                            item.rating === "NSFW" ? "destructive" : "secondary"
                          }
                          className="text-xs"
                        >
                          {item.rating}
                        </Badge>
                        {isDeleted && (
                          <Badge variant="destructive" className="text-xs">
                            Deleted
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-48">
                      <div className="flex flex-wrap gap-1">
                        {(item.tags ?? []).slice(0, 3).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {(item.tags ?? []).length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{item.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateTime(item.created_at)}
                    </TableCell>
                    <TableCell>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        total={total}
        limit={LIMIT}
        onPageChange={setPage}
      />

      {/* Detail sheet */}
      <Sheet
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl h-full overflow-hidden flex flex-col p-0"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>Bot Detail</SheetTitle>
            <SheetDescription>Full information for this bot.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0 px-6 py-4">
            {selectedItem?._loading || detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              selectedItem && (
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2 items-center">
                    {selectedItem.image_url && (
                      <img
                        src={selectedItem.image_url}
                        alt={selectedItem.name}
                        className="h-14 w-14 rounded-lg object-cover border"
                      />
                    )}
                    <div>
                      <p className="text-base font-semibold">
                        {selectedItem.name}
                      </p>
                      {selectedItem.chat_name && (
                        <p className="text-sm text-muted-foreground">
                          aka {selectedItem.chat_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        selectedItem.rating === "NSFW"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {selectedItem.rating}
                    </Badge>
                    {selectedItem.deleted_at && (
                      <Badge variant="destructive">Soft-Deleted</Badge>
                    )}
                    {selectedItem.hide_sensitive_fields && (
                      <Badge variant="outline">Hidden fields</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Owner</p>
                      <p className="font-medium">
                        @{selectedItem.owner?.username ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {formatDateTime(selectedItem.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Updated</p>
                      <p className="font-medium">
                        {formatDateTime(selectedItem.updated_at)}
                      </p>
                    </div>
                    {selectedItem.deleted_at && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Deleted at
                        </p>
                        <p className="font-medium text-destructive">
                          {formatDateTime(selectedItem.deleted_at)}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedItem.short_description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Short Description
                      </p>
                      <p className="text-sm">
                        {selectedItem.short_description}
                      </p>
                    </div>
                  )}

                  {selectedItem.tags?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {(selectedItem.tags as string[]).map((t) => (
                          <Badge key={t} variant="outline" className="text-xs">
                            <Tag className="h-2.5 w-2.5 mr-1" />
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedItem.personality && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Personality
                      </p>
                      <p className="text-sm bg-muted rounded p-2 max-h-32 overflow-y-auto">
                        {selectedItem.personality}
                      </p>
                    </div>
                  )}

                  {selectedItem.first_message && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        First Message
                      </p>
                      <p className="text-sm bg-muted rounded p-2 max-h-32 overflow-y-auto">
                        {selectedItem.first_message}
                      </p>
                    </div>
                  )}

                  {selectedItem.scenario && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Scenario
                      </p>
                      <p className="text-sm bg-muted rounded p-2 max-h-32 overflow-y-auto">
                        {selectedItem.scenario}
                      </p>
                    </div>
                  )}

                  {!selectedItem.deleted_at && (
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        Soft delete this bot to hide it from regular views while
                        keeping it recoverable.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="cursor-pointer"
                        onClick={async () => {
                          const result = await softDeleteBot(selectedItem.id);
                          if (!result.success) {
                            toast.error(result.error ?? "Failed");
                            return;
                          }
                          const deletedAt =
                            (result as any).deleted_at ??
                            new Date().toISOString();
                          toast.success("Bot soft-deleted");
                          setSelectedItem((prev: any) =>
                            prev ? { ...prev, deleted_at: deletedAt } : prev,
                          );
                          setItems((prev) =>
                            prev.map((i) =>
                              i.id === selectedItem.id
                                ? { ...i, deleted_at: deletedAt }
                                : i,
                            ),
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Soft Delete
                      </Button>
                    </div>
                  )}

                  {selectedItem.deleted_at && (
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        This bot is soft-deleted and can be permanently removed.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="cursor-pointer"
                        onClick={async () => {
                          const result = await hardDeleteBot(selectedItem.id);
                          if (!result.success) {
                            toast.error(result.error ?? "Failed");
                            return;
                          }
                          toast.success("Bot permanently deleted");
                          setSelectedItem(null);
                          setItems((prev) =>
                            prev.filter((i) => i.id !== selectedItem.id),
                          );
                        }}
                      >
                        <Flame className="h-4 w-4 mr-2" />
                        Permanently Delete
                      </Button>
                    </div>
                  )}
                </div>
              )
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================================
// Users Tab
// ============================================================================

interface UserItem {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_blocked: boolean;
  created_at: string;
}

function UsersTab() {
  const [items, setItems] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "admin" | "block" | "reset-name" | "clear-avatar" | "delete";
    userId: string;
    value?: boolean;
    username: string;
  } | null>(null);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdminUsers(page, LIMIT, search);
    if (result.success) {
      setItems(result.items as UserItem[]);
      setTotal(result.total);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { type, userId, value, username } = pendingAction;
    setPendingAction(null);

    let result: { success: boolean; error?: any };
    switch (type) {
      case "admin":
        result = await setUserAdminStatus(userId, value!);
        break;
      case "block":
        result = value ? await blockUser(userId) : await unblockUser(userId);
        break;
      case "reset-name":
        result = await resetUserDisplayName(userId);
        break;
      case "clear-avatar":
        result = await clearUserAvatar(userId);
        break;
      case "delete":
        result = await deleteUserAsAdmin(userId);
        break;
      default:
        return;
    }

    if (!result.success) {
      toast.error(result.error ?? "Action failed");
      return;
    }

    const successMessages: Record<string, string> = {
      admin: value
        ? `@${username} is now an admin`
        : `@${username} is no longer an admin`,
      block: value
        ? `@${username} has been blocked`
        : `@${username} has been unblocked`,
      "reset-name": `Display name reset for @${username}`,
      "clear-avatar": `Avatar cleared for @${username}`,
      delete: `Account @${username} has been permanently deleted`,
    };
    toast.success(successMessages[type]);

    if (type === "delete") {
      setItems((prev) => prev.filter((u) => u.id !== userId));
    } else {
      setItems((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                is_admin: type === "admin" ? value! : u.is_admin,
                is_blocked: type === "block" ? value! : u.is_blocked,
                avatar_url: type === "clear-avatar" ? null : u.avatar_url,
              }
            : u,
        ),
      );
    }
  };

  const dialogTitle = () => {
    if (!pendingAction) return "";
    const { type, value, username } = pendingAction;
    if (type === "admin")
      return value ? "Grant Admin Access" : "Revoke Admin Access";
    if (type === "block") return value ? "Block User" : "Unblock User";
    if (type === "reset-name") return "Reset Display Name";
    if (type === "clear-avatar") return "Clear Avatar";
    if (type === "delete") return "Delete Account Permanently";
    return "";
  };

  const dialogDescription = () => {
    if (!pendingAction) return "";
    const { type, value, username } = pendingAction;
    if (type === "admin")
      return value
        ? `@${username} will gain full admin access to this platform.`
        : `@${username} will lose admin access.`;
    if (type === "block")
      return value
        ? `@${username} will be blocked from accessing the platform.`
        : `@${username} will be unblocked and regain access.`;
    if (type === "reset-name")
      return `The display name of @${username} will be reset to their username.`;
    if (type === "clear-avatar")
      return `The avatar of @${username} will be removed.`;
    if (type === "delete")
      return `This will permanently delete @${username}'s account and ALL associated data (bots, forms, submissions, etc.). This action is irreversible.`;
    return "";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          <Input
            placeholder="Search by username or name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-56"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleSearch}
            className="cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={loading}
          className="cursor-pointer ml-auto"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((user) => (
                <TableRow
                  key={user.id}
                  className={user.is_blocked ? "opacity-60" : ""}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {(user.username ?? "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {user.display_name || user.username || "—"}
                        </p>
                        {user.username && (
                          <p className="text-xs text-muted-foreground">
                            @{user.username}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.is_admin && (
                        <Badge variant="default" className="text-xs gap-1">
                          <CrownIcon className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {user.is_blocked && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <Ban className="h-3 w-3" />
                          Blocked
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDateTime(user.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {user.username && (
                          <DropdownMenuItem asChild>
                            <a
                              href={`/${user.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <UserRound className="h-4 w-4" />
                              View Profile
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() =>
                            setPendingAction({
                              type: "admin",
                              userId: user.id,
                              value: !user.is_admin,
                              username: user.username ?? user.id,
                            })
                          }
                        >
                          <CrownIcon className="h-4 w-4 mr-2" />
                          {user.is_admin ? "Revoke Admin" : "Make Admin"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() =>
                            setPendingAction({
                              type: "block",
                              userId: user.id,
                              value: !user.is_blocked,
                              username: user.username ?? user.id,
                            })
                          }
                        >
                          {user.is_blocked ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                              Unblock
                            </>
                          ) : (
                            <>
                              <Ban className="h-4 w-4 mr-2" />
                              Block
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() =>
                            setPendingAction({
                              type: "reset-name",
                              userId: user.id,
                              username: user.username ?? user.id,
                            })
                          }
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset Display Name
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() =>
                            setPendingAction({
                              type: "clear-avatar",
                              userId: user.id,
                              username: user.username ?? user.id,
                            })
                          }
                        >
                          <ImageOff className="h-4 w-4 mr-2" />
                          Clear Avatar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={() =>
                            setPendingAction({
                              type: "delete",
                              userId: user.id,
                              username: user.username ?? user.id,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        total={total}
        limit={LIMIT}
        onPageChange={setPage}
      />

      <AlertDialog
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={
                pendingAction?.type === "delete"
                  ? "bg-destructive hover:bg-destructive/90"
                  : ""
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Main AdminPanel Component
// ============================================================================

export function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [openSubmissionId, setOpenSubmissionId] = useState<string | null>(null);

  const handleNavigateToSubmission = (id: string) => {
    setActiveTab("submissions");
    setOpenSubmissionId(id);
  };

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { isAdmin: admin } = await getCurrentUserAccess(supabase);
      setIsAdmin(admin);
    })();
  }, []);

  if (isAdmin === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  const tabs: {
    id: AdminTab;
    label: string;
    icon: typeof BarChart3;
    color: string;
    style?: string;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: BarChart3,
      color: "text-primary",
      style: "border-primary text-primary",
    },
    {
      id: "submissions",
      label: "Submissions",
      icon: Inbox,
      color: "text-blue-500",
      style: "border-blue-500 text-blue-500",
    },
    {
      id: "forms",
      label: "Forms",
      icon: FileText,
      color: "text-muted-foreground",
      style: "border-muted-foreground text-muted-foreground",
    },
    {
      id: "bots",
      label: "Bots",
      icon: Bot,
      color: "text-green-500",
      style: "border-green-500 text-green-500",
    },
    {
      id: "users",
      label: "Users",
      icon: UsersRound,
      color: "text-primary",
      style: "border-primary text-primary",
    },
    {
      id: "moderation",
      label: "Moderation",
      icon: Shield,
      color: "text-orange-500",
      style: "border-orange-500 text-orange-500",
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Admin Panel
        </h1>
        <p className="mt-1 text-sm sm:text-base text-muted-foreground">
          Platform management, moderation, and statistics.
        </p>
      </div>

      {/* Tab nav */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-border pb-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 cursor-pointer px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? `${tab.style}`
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 ${tab.color}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab onNavigateToSubmission={handleNavigateToSubmission} />
      )}
      {activeTab === "submissions" && (
        <SubmissionsTab
          openId={openSubmissionId}
          onClearOpenId={() => setOpenSubmissionId(null)}
        />
      )}
      {activeTab === "forms" && <FormsTab />}
      {activeTab === "bots" && <BotsTab />}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "moderation" && <ModerationPageContent adminView />}
    </div>
  );
}
