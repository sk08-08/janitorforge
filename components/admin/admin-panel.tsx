// ============================================================================
// JanitorForge - Admin Panel
// Centralised moderation and management panel for site admins.
// ============================================================================

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Award,
  BarChart3,
  FileText,
  Inbox,
  Shield,
  ShieldAlert,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
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
  KeyRound,
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
import { stripMarkdownToText } from "@/lib/markdown";
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
import { SearchInput } from "@/components/ui/search-input";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import {
  MarkdownRenderer,
  MarkdownInlineRenderer,
} from "../forms/markdown-renderer";
import { BotTagBadge, BotTagCountBadge } from "@/components/bots/bot-tag-badge";
import { formatDateTime } from "@/lib/utils";
import { ModerationAdminTab } from "@/components/admin/moderation-admin-tab";
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
  resetUserPin,
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
import { getFormBannerPublicUrl } from "@/lib/form-assets";
import { BadgeAdminTab } from "./badge-admin-tab";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

type AdminTab =
  | "overview"
  | "submissions"
  | "forms"
  | "bots"
  | "badges"
  | "users"
  | "moderation";

const ADMIN_TAB_STORAGE_KEY = "janitorforge.admin.activeTab";
const ADMIN_TAB_IDS: AdminTab[] = [
  "overview",
  "submissions",
  "forms",
  "bots",
  "badges",
  "users",
  "moderation",
];

function isAdminTab(value: string): value is AdminTab {
  return ADMIN_TAB_IDS.includes(value as AdminTab);
}

function normalizeAdminFieldText(value: unknown) {
  return stripMarkdownToText(String(value ?? "")).trim();
}

function buildAdminFormFieldMap(sections: any[] = []) {
  const map = new Map<
    string,
    {
      label: string;
      sectionTitle: string;
      description: string;
      type: string;
      required: boolean;
    }
  >();

  for (const section of sections) {
    const sectionTitle = normalizeAdminFieldText(section?.title);

    for (const field of section?.fields || []) {
      if (!field?.id) continue;

      map.set(field.id, {
        label: normalizeAdminFieldText(field.label),
        sectionTitle,
        description: normalizeAdminFieldText(field.description),
        type: String(field.type || "field"),
        required: field.required === true,
      });
    }
  }

  return map;
}

function getAdminFieldTypeLabel(type: string) {
  const labels: Record<string, string> = {
    text: "Text",
    textarea: "Long text",
    select: "Select",
    radio: "Radio",
    checkbox: "Checkbox",
    number: "Number",
    rating: "Rating",
    url: "URL",
    email: "Email",
  };

  return labels[type] || type || "Field";
}

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
                className={
                  card.highlight
                    ? "border-destructive/50"
                    : "shadow-md dark:shadow-primary/15"
                }
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
          <Card className="shadow-md dark:shadow-primary/15">
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
                      href={`/profile/${u.username}`}
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
          <Card className="shadow-md dark:shadow-primary/15">
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
                        <MarkdownRenderer
                          className="truncate text-sm rendered-markdown"
                          content={s.form_title || "—"}
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
          <Card className="shadow-md dark:shadow-primary/15">
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
  const [sortBy, setSortBy] = useState<
    "created_at" | "status" | "submitter_name"
  >("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
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
      sortBy,
      sortDirection,
    );
    if (result.success) {
      setItems(result.items);
      setTotal(result.total);
    }
    setLoading(false);
  }, [page, statusFilter, userFilter, sortBy, sortDirection]);

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

  const submissionFieldMap = selectedItem
    ? buildAdminFormFieldMap(
        selectedItem.form?.sections || selectedItem.sections || [],
      )
    : new Map();

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
        <SearchInput
          value={userFilter}
          onChange={(value) => {
            setUserFilter(value.trim());
            setPage(1);
          }}
          placeholder="Filter by username..."
          className="w-full sm:max-w-xs"
          debounce={220}
          shortcutKey="/"
        />
        <Select
          value={sortBy}
          onValueChange={(value) => {
            setSortBy(value as "created_at" | "status" | "submitter_name");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Sort: Date</SelectItem>
            <SelectItem value="status">Sort: Status</SelectItem>
            <SelectItem value="submitter_name">Sort: Submitter</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortDirection}
          onValueChange={(value) => {
            setSortDirection(value as "asc" | "desc");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Most recent / Z-A</SelectItem>
            <SelectItem value="asc">Oldest / A-Z</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
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
                      <div className="truncate text-sm">
                        <MarkdownInlineRenderer
                          content={item.form_title || "—"}
                        />
                      </div>
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
                  <div className="rounded-xl border bg-muted/15 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Submission
                        </p>

                        <div className="mt-1 text-base font-semibold">
                          <MarkdownInlineRenderer
                            content={selectedItem.form_title || "Untitled form"}
                          />
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Request #{selectedItem.id?.slice(0, 8)}…
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={
                            statusBadgeVariant(selectedItem.status) as any
                          }
                          className="capitalize"
                        >
                          {selectedItem.status}
                        </Badge>

                        {selectedItem.deleted_at && (
                          <Badge variant="destructive">Soft-Deleted</Badge>
                        )}
                      </div>
                    </div>
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
                      <a
                        href={`/profile/${selectedItem.owner?.username ?? "unknown"}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer flex items-center gap-2"
                      >
                        <p className="font-medium text-primary cursor-pointer hover:underline">
                          @{selectedItem.owner?.username ?? "—"}
                        </p>
                      </a>
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
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold">Responses</p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Answers submitted through this form.
                          </p>
                        </div>

                        <div className="space-y-4">
                          {(() => {
                            const grouped = new Map<
                              string,
                              Array<{
                                key: string;
                                value: any;
                                label: string;
                                description: string;
                                required: boolean;
                              }>
                            >();

                            for (const [key, value] of Object.entries(
                              selectedItem.responses as Record<string, any>,
                            )) {
                              const meta = submissionFieldMap.get(key);

                              const savedLabel = normalizeAdminFieldText(
                                (selectedItem.response_labels as any)?.[key],
                              );

                              const sectionTitle =
                                meta?.sectionTitle || "Additional Responses";

                              const label =
                                meta?.label ||
                                meta?.sectionTitle ||
                                savedLabel ||
                                "Untitled field";

                              const current = grouped.get(sectionTitle) || [];

                              current.push({
                                key,
                                value,
                                label,
                                description: meta?.description || "",
                                required: meta?.required || false,
                              });

                              grouped.set(sectionTitle, current);
                            }

                            return Array.from(grouped.entries()).map(
                              ([sectionTitle, fields]) => (
                                <section
                                  key={sectionTitle}
                                  className="space-y-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      {sectionTitle}
                                    </p>

                                    <div className="h-px flex-1 bg-border" />
                                  </div>

                                  <div className="space-y-2">
                                    {fields.map((field) => (
                                      <div
                                        key={field.key}
                                        className="rounded-xl border bg-muted/15 p-3"
                                      >
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-xs font-medium">
                                            {field.label}
                                          </p>

                                          {field.required && (
                                            <Badge
                                              variant="outline"
                                              className="text-[10px]"
                                            >
                                              Required
                                            </Badge>
                                          )}
                                        </div>

                                        {field.description &&
                                          field.description !== field.label && (
                                            <p className="mt-1 text-[11px] text-muted-foreground">
                                              {field.description}
                                            </p>
                                          )}

                                        <div className="mt-2 whitespace-pre-wrap break-words text-sm">
                                          {Array.isArray(field.value)
                                            ? field.value.join(", ")
                                            : String(field.value ?? "—")}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              ),
                            );
                          })()}
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
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-destructive">
                          Danger Zone
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Soft deleting this submission hides it from regular
                          views while keeping the record available for recovery
                          or administrative review.
                        </p>
                      </div>

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
                            prev
                              ? {
                                  ...prev,
                                  deleted_at: deletedAt,
                                }
                              : prev,
                          );

                          setItems((prev) =>
                            prev.map((item) =>
                              item.id === selectedItem.id
                                ? {
                                    ...item,
                                    deleted_at: deletedAt,
                                  }
                                : item,
                            ),
                          );
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Soft Delete Submission
                      </Button>
                    </div>
                  )}

                  {/* Hard delete */}
                  {selectedItem.deleted_at && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-destructive">
                          Danger Zone
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          This submission is already soft-deleted. Permanently
                          deleting it removes the record completely and cannot
                          be undone.
                        </p>
                      </div>

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

                          toast.success("Submission permanently deleted");

                          setSelectedItem(null);

                          setItems((prev) =>
                            prev.filter((item) => item.id !== selectedItem.id),
                          );
                        }}
                      >
                        <Flame className="mr-2 h-4 w-4" />
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
  const [userFilter, setUserFilter] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "title" | "is_active">(
    "created_at",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAllForms(
      page,
      LIMIT,
      userFilter,
      sortBy,
      sortDirection,
    );
    if (result.success) {
      setItems(result.items);
      setTotal(result.total);
    }
    setLoading(false);
  }, [page, userFilter, sortBy, sortDirection]);

  useEffect(() => {
    load();
  }, [load]);

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
        <SearchInput
          value={userFilter}
          onChange={(value) => {
            setUserFilter(value.trim());
            setPage(1);
          }}
          placeholder="Filter by username..."
          className="w-full sm:max-w-xs"
          debounce={220}
          shortcutKey="/"
        />
        <Select
          value={sortBy}
          onValueChange={(value) => {
            setSortBy(value as "created_at" | "title" | "is_active");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Sort: Date</SelectItem>
            <SelectItem value="title">Sort: Title</SelectItem>
            <SelectItem value="is_active">Sort: Active</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortDirection}
          onValueChange={(value) => {
            setSortDirection(value as "asc" | "desc");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Most recent / Z-A</SelectItem>
            <SelectItem value="asc">Oldest / A-Z</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
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
              <TableHead>Form</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Structure</TableHead>
              <TableHead>Security</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
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
                    <TableCell className="max-w-64">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          <MarkdownInlineRenderer content={item.title || "—"} />
                        </div>

                        {item.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {stripMarkdownToText(item.description)}
                          </p>
                        )}
                      </div>
                    </TableCell>

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

                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {(item.sections || []).length} sections ·{" "}
                      {(item.sections || []).reduce(
                        (total: number, section: any) =>
                          total + (section.fields || []).length,
                        0,
                      )}{" "}
                      fields
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.security_sensitivity || "medium"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
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

                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(item.updated_at || item.created_at)}
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
          className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-3xl lg:max-w-4xl"
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
                  <div className="overflow-hidden rounded-xl border bg-muted/10">
                    {(selectedItem.banner_asset_path ||
                      selectedItem.banner_url) && (
                      <div className="aspect-[4/1] w-full overflow-hidden bg-muted">
                        <img
                          src={
                            selectedItem.banner_asset_path
                              ? getFormBannerPublicUrl(
                                  selectedItem.banner_asset_path,
                                )
                              : selectedItem.banner_url
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base font-semibold">
                            <MarkdownInlineRenderer
                              content={selectedItem.title || "Untitled form"}
                            />
                          </div>

                          {selectedItem.description && (
                            <div className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                              <MarkdownRenderer
                                content={selectedItem.description}
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={
                              selectedItem.is_active ? "default" : "secondary"
                            }
                          >
                            {selectedItem.is_active ? "Active" : "Inactive"}
                          </Badge>

                          {selectedItem.security_sensitivity && (
                            <Badge variant="outline">
                              Security: {selectedItem.security_sensitivity}
                            </Badge>
                          )}

                          {selectedItem.deleted_at && (
                            <Badge variant="destructive">Soft-Deleted</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          @{selectedItem.owner?.username || "unknown"}
                        </span>

                        <span>
                          {(selectedItem.sections || []).length} sections
                        </span>

                        <span>
                          {(selectedItem.sections || []).reduce(
                            (total: number, section: any) =>
                              total + (section.fields || []).length,
                            0,
                          )}{" "}
                          fields
                        </span>

                        {selectedItem.shareable_link && (
                          <div className="flex flex-wrap items-center gap-1">
                            <p>Shareable Link:</p>
                            <a
                              href={`/form/${selectedItem.shareable_link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              /form/{selectedItem.shareable_link}{" "}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {Array.isArray(selectedItem.sections) &&
                    selectedItem.sections.length > 0 && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold">
                            Form Structure
                          </p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Sections and fields currently configured in this
                            form.
                          </p>
                        </div>

                        <div className="space-y-4">
                          {(selectedItem.sections as any[]).map(
                            (section: any, sectionIndex: number) => (
                              <section
                                key={section.id ?? sectionIndex}
                                className="overflow-hidden rounded-xl border"
                              >
                                <div className="border-b bg-muted/20 p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold">
                                        <MarkdownInlineRenderer
                                          content={
                                            section.title ||
                                            `Section ${sectionIndex + 1}`
                                          }
                                        />
                                      </div>

                                      {section.description && (
                                        <div className="mt-1 text-xs text-muted-foreground">
                                          <MarkdownRenderer
                                            content={section.description}
                                          />
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex gap-1">
                                      <Badge
                                        variant="outline"
                                        className="text-[10px]"
                                      >
                                        {(section.fields || []).length} fields
                                      </Badge>

                                      {section.collapsible && (
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px]"
                                        >
                                          Collapsible
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="divide-y">
                                  {(section.fields || []).length === 0 ? (
                                    <div className="p-3 text-xs text-muted-foreground">
                                      No fields in this section.
                                    </div>
                                  ) : (
                                    (section.fields || []).map(
                                      (field: any, fieldIndex: number) => (
                                        <div
                                          key={field.id ?? fieldIndex}
                                          className="space-y-2 p-3"
                                        >
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                              variant="outline"
                                              className="text-[10px]"
                                            >
                                              {getAdminFieldTypeLabel(
                                                field.type,
                                              )}
                                            </Badge>

                                            {field.required && (
                                              <Badge
                                                variant="secondary"
                                                className="text-[10px]"
                                              >
                                                Required
                                              </Badge>
                                            )}
                                          </div>

                                          <div>
                                            <p className="text-xs font-medium">
                                              {normalizeAdminFieldText(
                                                field.label,
                                              ) || (
                                                <span className="italic text-muted-foreground">
                                                  No field label
                                                </span>
                                              )}
                                            </p>

                                            {field.description && (
                                              <p className="mt-1 text-[11px] text-muted-foreground">
                                                {normalizeAdminFieldText(
                                                  field.description,
                                                )}
                                              </p>
                                            )}
                                          </div>

                                          {field.placeholder && (
                                            <div className="rounded-md bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground">
                                              Placeholder: {field.placeholder}
                                            </div>
                                          )}

                                          {Array.isArray(field.options) &&
                                            field.options.length > 0 && (
                                              <div className="flex flex-wrap gap-1">
                                                {field.options.map(
                                                  (
                                                    option: any,
                                                    optionIndex: number,
                                                  ) => (
                                                    <Badge
                                                      key={
                                                        option.id ??
                                                        option.value ??
                                                        optionIndex
                                                      }
                                                      variant="secondary"
                                                      className="text-[10px]"
                                                    >
                                                      {String(
                                                        option.label ??
                                                          option.value ??
                                                          option,
                                                      )}
                                                    </Badge>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      ),
                                    )
                                  )}
                                </div>
                              </section>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {!selectedItem.deleted_at && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-destructive">
                          Danger Zone
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Soft deleting this form hides it from normal use while
                          keeping its record available for administrative
                          recovery or review.
                        </p>
                      </div>

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
                            prev
                              ? {
                                  ...prev,
                                  deleted_at: deletedAt,
                                }
                              : prev,
                          );

                          setItems((prev) =>
                            prev.map((item) =>
                              item.id === selectedItem.id
                                ? {
                                    ...item,
                                    deleted_at: deletedAt,
                                  }
                                : item,
                            ),
                          );
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Soft Delete Form
                      </Button>
                    </div>
                  )}

                  {selectedItem.deleted_at && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-destructive">
                          Danger Zone
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          This form is already soft-deleted. Permanently
                          deleting it also removes its remaining stored data and
                          cannot be undone.
                        </p>
                      </div>

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
                            prev.filter((item) => item.id !== selectedItem.id),
                          );
                        }}
                      >
                        <Flame className="mr-2 h-4 w-4" />
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
  const [userFilter, setUserFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"created_at" | "name" | "rating">(
    "created_at",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAllBots(
      page,
      LIMIT,
      userFilter,
      ratingFilter,
      sortBy,
      sortDirection,
    );
    if (result.success) {
      setItems(result.items);
      setTotal(result.total);
    }
    setLoading(false);
  }, [page, userFilter, ratingFilter, sortBy, sortDirection]);

  useEffect(() => {
    load();
  }, [load]);

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
        <SearchInput
          value={userFilter}
          onChange={(value) => {
            setUserFilter(value.trim());
            setPage(1);
          }}
          placeholder="Filter by username..."
          className="w-full sm:max-w-xs"
          debounce={220}
          shortcutKey="/"
        />
        <Select
          value={sortBy}
          onValueChange={(value) => {
            setSortBy(value as "created_at" | "name" | "rating");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Sort: Date</SelectItem>
            <SelectItem value="name">Sort: Bot Name</SelectItem>
            <SelectItem value="rating">Sort: Rating</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortDirection}
          onValueChange={(value) => {
            setSortDirection(value as "asc" | "desc");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Most recent / Z-A</SelectItem>
            <SelectItem value="asc">Oldest / A-Z</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
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
              <TableHead>Bot</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Updated</TableHead>
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
                    <TableCell className="max-w-72">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Bot className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.name || "Untitled bot"}
                          </p>

                          {item.short_description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {item.short_description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

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
                    <TableCell className="w-[220px] max-w-[220px]">
                      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                        {(item.tags ?? []).slice(0, 2).map((tag: string) => (
                          <BotTagBadge
                            key={tag}
                            tag={tag}
                            className="max-w-[92px] shrink"
                          />
                        ))}

                        {(item.tags ?? []).length > 2 && (
                          <BotTagCountBadge
                            count={item.tags.length - 2}
                            className="shrink-0"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(item.updated_at || item.created_at)}
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
          className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-3xl"
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
                  <div className="rounded-xl border bg-muted/10 p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted">
                        {selectedItem.image_url ? (
                          <img
                            src={selectedItem.image_url}
                            alt={selectedItem.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Bot className="h-7 w-7 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold">
                              {selectedItem.name || "Untitled bot"}
                            </h3>

                            {selectedItem.chat_name && (
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                Chat name: {selectedItem.chat_name}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1">
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
                          </div>
                        </div>

                        {selectedItem.short_description && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {selectedItem.short_description}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-muted-foreground">
                          @{selectedItem.owner?.username || "unknown"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedItem.hide_sensitive_fields && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                      <div className="flex items-start gap-2">
                        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />

                        <div>
                          <p className="text-xs font-medium">
                            Sensitive fields hidden publicly
                          </p>

                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            The creator has hidden this bot's definition and
                            message fields from public views. Administrators can
                            still inspect the stored content here.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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

                  {selectedItem.tags?.length > 0 && (
                    <section className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold">Tags</p>

                        <p className="text-xs text-muted-foreground">
                          Official and custom tags assigned to this bot.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(selectedItem.tags as string[]).map((tag) => (
                          <BotTagBadge key={tag} tag={tag} />
                        ))}
                      </div>
                    </section>
                  )}

                  {selectedItem.personality && (
                    <section className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold">Personality</p>

                        <p className="text-xs text-muted-foreground">
                          Main character definition.
                        </p>
                      </div>

                      <div className="max-h-[360px] overflow-y-auto rounded-xl border bg-muted/15 p-4">
                        <MarkdownRenderer
                          className="rendered-markdown break-words text-sm"
                          content={selectedItem.personality}
                        />
                      </div>
                    </section>
                  )}

                  {selectedItem.scenario && (
                    <section className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold">Scenario</p>
                      </div>

                      <div className="max-h-[320px] overflow-y-auto rounded-xl border bg-muted/15 p-4">
                        <MarkdownRenderer
                          className="rendered-markdown break-words text-sm"
                          content={selectedItem.scenario}
                        />
                      </div>
                    </section>
                  )}

                  {selectedItem.first_message && (
                    <section className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold">Initial Message</p>
                      </div>

                      <div className="max-h-[360px] overflow-y-auto rounded-xl border bg-muted/15 p-4">
                        <MarkdownRenderer
                          className="rendered-markdown break-words text-sm"
                          content={selectedItem.first_message}
                        />
                      </div>
                    </section>
                  )}

                  {Array.isArray(selectedItem.alternate_greetings) &&
                    selectedItem.alternate_greetings.length > 0 && (
                      <section className="space-y-2">
                        <div>
                          <p className="text-sm font-semibold">
                            Alternate Greetings
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {selectedItem.alternate_greetings.length} alternate
                            messages.
                          </p>
                        </div>

                        <div className="space-y-2">
                          {selectedItem.alternate_greetings.map(
                            (greeting: any, index: number) => (
                              <div
                                key={greeting.id ?? index}
                                className="max-h-[320px] overflow-y-auto rounded-xl border bg-muted/15 p-4"
                              >
                                <p className="mb-2 text-xs font-medium text-muted-foreground">
                                  Greeting {index + 1}
                                </p>

                                <MarkdownRenderer
                                  className="rendered-markdown text-sm"
                                  content={
                                    typeof greeting === "string"
                                      ? greeting
                                      : greeting.content || greeting.text || ""
                                  }
                                />
                              </div>
                            ),
                          )}
                        </div>
                      </section>
                    )}

                  {selectedItem.example_dialogues && (
                    <section className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold">
                          Example Dialogues
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Example conversations stored in the bot definition.
                        </p>
                      </div>

                      <div className="max-h-[360px] overflow-y-auto rounded-xl border bg-muted/15 p-4">
                        <MarkdownRenderer
                          className="rendered-markdown break-words text-sm"
                          content={selectedItem.example_dialogues}
                        />
                      </div>
                    </section>
                  )}

                  {!selectedItem.deleted_at && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-destructive">
                          Danger Zone
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Soft deleting this bot hides it from regular platform
                          views while keeping its database record available for
                          administrative review.
                        </p>
                      </div>

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
                            prev
                              ? {
                                  ...prev,
                                  deleted_at: deletedAt,
                                }
                              : prev,
                          );

                          setItems((prev) =>
                            prev.map((item) =>
                              item.id === selectedItem.id
                                ? {
                                    ...item,
                                    deleted_at: deletedAt,
                                  }
                                : item,
                            ),
                          );
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Soft Delete Bot
                      </Button>
                    </div>
                  )}

                  {selectedItem.deleted_at && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-destructive">
                          Danger Zone
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          This bot is already soft-deleted. Permanently deleting
                          it removes the record and its stored bot image and
                          cannot be undone.
                        </p>
                      </div>

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
                            prev.filter((item) => item.id !== selectedItem.id),
                          );
                        }}
                      >
                        <Flame className="mr-2 h-4 w-4" />
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
  updated_at: string | null;
}

function UsersTab() {
  const [items, setItems] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "created_at" | "updated_at" | "username" | "display_name"
  >("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type:
      | "admin"
      | "block"
      | "reset-name"
      | "clear-avatar"
      | "delete"
      | "reset-pin";
    userId: string;
    value?: boolean;
    username: string;
  } | null>(null);
  const [pinDraft, setPinDraft] = useState("");
  const [pinConfirmDraft, setPinConfirmDraft] = useState("");
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdminUsers(
      page,
      LIMIT,
      search,
      sortBy,
      sortDirection,
    );
    if (result.success) {
      setItems(result.items as UserItem[]);
      setTotal(result.total);
    }
    setLoading(false);
  }, [page, search, sortBy, sortDirection]);

  useEffect(() => {
    load();
  }, [load]);

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
      case "reset-pin": {
        const trimmedPin = pinDraft.trim();
        if (!/^\d{4}$/.test(trimmedPin)) {
          toast.error("PIN must be exactly 4 digits");
          return;
        }
        if (trimmedPin !== pinConfirmDraft.trim()) {
          toast.error("PINs do not match");
          return;
        }
        result = await resetUserPin(userId, trimmedPin);
        break;
      }
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
      "reset-pin": `PIN updated for @${username}`,
      delete: `Account @${username} has been permanently deleted`,
    };
    toast.success(successMessages[type]);

    if (type === "delete") {
      setItems((prev) => prev.filter((u) => u.id !== userId));
    } else {
      await load();
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
    if (type === "reset-pin") return "Set New PIN";
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
    if (type === "reset-pin")
      return `A new 4-digit PIN will be assigned for @${username}. The user can use it on the next login.`;
    if (type === "delete")
      return `This will permanently delete @${username}'s account and ALL associated data (bots, forms, submissions, etc.). This action is irreversible.`;
    return "";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value.trim());
            setPage(1);
          }}
          placeholder="Search by username or name..."
          className="w-full sm:max-w-sm"
          debounce={220}
          shortcutKey="/"
        />
        <Select
          value={sortBy}
          onValueChange={(value) => {
            setSortBy(
              value as
                | "created_at"
                | "updated_at"
                | "username"
                | "display_name",
            );
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Sort: Joined</SelectItem>
            <SelectItem value="updated_at">Sort: Profile Updated</SelectItem>
            <SelectItem value="username">Sort: Username</SelectItem>
            <SelectItem value="display_name">Sort: Display Name</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortDirection}
          onValueChange={(value) => {
            setSortDirection(value as "asc" | "desc");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Most recent / Z-A</SelectItem>
            <SelectItem value="asc">Oldest / A-Z</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
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
              <TableHead>Profile Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                    <a
                      href={`/profile/${user.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer flex items-center gap-2"
                    >
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
                    </a>
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
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {user.updated_at ? formatDateTime(user.updated_at) : "-"}
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
                              href={`/profile/${user.username}`}
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
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => {
                            setPinDraft("");
                            setPinConfirmDraft("");
                            setPendingAction({
                              type: "reset-pin",
                              userId: user.id,
                              username: user.username ?? user.id,
                            });
                          }}
                        >
                          <KeyRound className="h-4 w-4 mr-2" />
                          Change PIN
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
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
            setPinDraft("");
            setPinConfirmDraft("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingAction?.type === "reset-pin" && (
            <div className="space-y-3 pt-2">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="New 4-digit PIN"
                value={pinDraft}
                onChange={(event) =>
                  setPinDraft(event.target.value.replace(/\D/g, ""))
                }
              />
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Confirm PIN"
                value={pinConfirmDraft}
                onChange={(event) =>
                  setPinConfirmDraft(event.target.value.replace(/\D/g, ""))
                }
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={
                pendingAction?.type === "delete"
                  ? "bg-destructive hover:bg-destructive/90"
                  : "cursor-pointer"
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
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (typeof window === "undefined") return "overview";

    const savedTab = window.localStorage.getItem(ADMIN_TAB_STORAGE_KEY);
    if (savedTab && isAdminTab(savedTab)) {
      return savedTab;
    }

    return "overview";
  });
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADMIN_TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

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
      id: "badges",
      label: "Badges",
      icon: Award,
      color: "text-amber-500",
      style: "border-amber-500 text-amber-500",
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
      {activeTab === "badges" && <BadgeAdminTab />}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "moderation" && <ModerationAdminTab />}
    </div>
  );
}
