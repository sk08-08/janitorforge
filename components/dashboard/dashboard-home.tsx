// ============================================================================
// JanitorForge - Dashboard Home View
// Overview panel with statistics, activity feed, and quick actions
// ============================================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  FileText,
  Inbox,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  Users,
  Upload,
  Star,
  Calendar,
  Zap,
  BookOpen,
  BarChart3,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/forms/markdown-renderer";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { FeedbackActions } from "@/components/feedback/feedback-actions";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(date);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getMotivationalMessage(stats: {
  totalBots: number;
  activeForms: number;
  pendingRequests: number;
  completedRequests: number;
}): string {
  if (stats.totalBots === 0) return "Ready to create your first character?";
  if (stats.pendingRequests > 5)
    return "You've got requests waiting — let's tackle them!";
  if (stats.completedRequests > 10)
    return "Impressive output! Keep up the great work.";
  if (stats.activeForms > 0 && stats.pendingRequests === 0)
    return "All clear! Your forms are live and waiting.";
  return "Here's what's happening in your workspace.";
}

// ----------------------------------------------------------------------------
// Stat Card Component
// ----------------------------------------------------------------------------

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: typeof Bot;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  accentColor?: string;
  footer?: string;
  onClick?: () => void;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  accentColor,
  footer,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75 transition-all",
        onClick &&
          "cursor-pointer hover:border-primary/40 hover:shadow-md hover:shadow-primary/5",
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ring-border/50",
            accentColor || "bg-primary/10",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              accentColor ? "text-foreground" : "text-primary",
            )}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          {trend && trendValue && (
            <span
              className={cn(
                "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                trend === "up" && "bg-emerald-500/10 text-emerald-500",
                trend === "down" && "bg-red-500/10 text-red-500",
                trend === "neutral" && "bg-muted text-muted-foreground",
              )}
            >
              {trend === "up" && "↑"}
              {trend === "down" && "↓"}
              {trendValue}
            </span>
          )}
          {footer && !trendValue && (
            <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
              {footer}
            </span>
          )}
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-primary/50 via-primary/20 to-transparent" />
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Insight Card Component
// ----------------------------------------------------------------------------

interface InsightCardProps {
  title: string;
  value: string;
  description: string;
  icon: typeof Activity;
  accentClassName?: string;
  actionLabel?: string;
  onAction?: () => void;
}

function InsightCard({
  title,
  value,
  description,
  icon: Icon,
  accentClassName,
  actionLabel,
  onAction,
}: InsightCardProps) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="text-2xl font-semibold tracking-tight">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ring-border/50",
              accentClassName || "bg-primary/10",
            )}
          >
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>

        {actionLabel && onAction && (
          <Button
            variant="ghost"
            className="mt-4 h-8 w-full justify-between px-2 text-xs cursor-pointer"
            onClick={onAction}
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Recent Request Card
// ----------------------------------------------------------------------------

interface RecentRequestCardProps {
  formTitle: string;
  status: "new" | "accepted" | "completed" | "rejected";
  submitterName?: string;
  createdAt: Date;
  notes?: string;
  onClick?: () => void;
}

function RecentRequestCard({
  formTitle,
  status,
  submitterName,
  createdAt,
  notes,
  onClick,
}: RecentRequestCardProps) {
  const statusMeta: Record<
    RecentRequestCardProps["status"],
    { label: string; className: string }
  > = {
    new: { label: "New", className: "bg-primary/10 text-primary" },
    accepted: {
      label: "In Progress",
      className: "bg-chart-2/10 text-chart-2",
    },
    completed: {
      label: "Completed",
      className: "bg-success/10 text-success",
    },
    rejected: {
      label: "Rejected",
      className: "bg-destructive/10 text-destructive",
    },
  };

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/70 transition-all hover:border-primary/40 hover:shadow-md",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="truncate text-sm font-medium rendered-markdown [&>*:last-child]:mb-0">
              <MarkdownRenderer content={formTitle} />
            </div>
            <p className="text-xs text-muted-foreground">
              {submitterName || "Anonymous submitter"}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-1 text-[11px] font-medium",
              statusMeta[status].className,
            )}
          >
            {statusMeta[status].label}
          </span>
        </div>

        {notes && (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {notes}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(createdAt)}
          </span>
          <span className="truncate rendered-markdown [&>*:last-child]:mb-0">
            <MarkdownRenderer content={formTitle} />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Recent Bot Card
// ----------------------------------------------------------------------------

interface RecentBotCardProps {
  name: string;
  description: string;
  rating: "SFW" | "NSFW";
  tags: string[];
  updatedAt: Date;
  collaboratorCount?: number;
  onEdit: () => void;
}

function RecentBotCard({
  name,
  description,
  rating,
  tags,
  updatedAt,
  collaboratorCount,
  onEdit,
}: RecentBotCardProps) {
  return (
    <Card className="group transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">{name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {description}
            </CardDescription>
          </div>
          <Badge
            variant={rating === "SFW" ? "secondary" : "destructive"}
            className="ml-2 shrink-0"
          >
            {rating}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{tags.length - 3} more
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
              suppressHydrationWarning
            >
              <Clock className="h-3 w-3" />
              {formatRelativeTime(updatedAt)}
            </span>
            {collaboratorCount && collaboratorCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {collaboratorCount}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
            onClick={onEdit}
          >
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Activity Feed Item
// ----------------------------------------------------------------------------

interface ActivityItem {
  id: string;
  type:
    | "bot_created"
    | "bot_updated"
    | "request_received"
    | "request_completed"
    | "form_created"
    | "collaborator_joined";
  title: string;
  description: string;
  formTitle?: string;
  timestamp: Date;
  icon: typeof Bot;
  accentColor: string;
}

function ActivityFeedItem({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/30">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
          item.accentColor,
        )}
      >
        <item.icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.title}</p>
        <MarkdownRenderer
          className="text-xs text-muted-foreground truncate"
          content={item.description}
        />
      </div>
      <span className="text-[11px] text-muted-foreground/60 shrink-0">
        {formatRelativeTime(item.timestamp)}
      </span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Empty State Component
// ----------------------------------------------------------------------------

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: typeof Bot;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      <Button className="mt-4" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Onboarding Banner
// ----------------------------------------------------------------------------

function OnboardingBanner({
  totalBots,
  totalForms,
  onCreateBot,
  onCreateForm,
}: {
  totalBots: number;
  totalForms: number;
  onCreateBot: () => void;
  onCreateForm: () => void;
}) {
  const steps = [
    {
      label: "Create your first bot",
      done: totalBots > 0,
      action: onCreateBot,
    },
    {
      label: "Design a form",
      done: totalForms > 0,
      action: onCreateForm,
    },
    {
      label: "Share and receive submissions",
      done: false,
      action: onCreateForm,
    },
  ];

  const completedSteps = steps.filter((s) => s.done).length;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-chart-2/5">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Welcome to JanitorForge!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started in {3 - completedSteps} easy steps to set up your
              creator workspace.
            </p>
            <div className="mt-4 space-y-2">
              {steps.map((step, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={step.action}
                  disabled={step.done}
                  className={cn(
                    "flex items-center gap-3 w-full rounded-lg p-2.5 text-left transition-colors cursor-pointer",
                    step.done
                      ? "bg-emerald-500/5"
                      : "bg-background/50 hover:bg-primary/5 border border-border/50",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full shrink-0",
                      step.done
                        ? "bg-emerald-500/20 text-emerald-500"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {step.done ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-medium">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      step.done
                        ? "text-muted-foreground line-through"
                        : "font-medium",
                    )}
                  >
                    {step.label}
                  </span>
                  {!step.done && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${(completedSteps / steps.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Dashboard Home Component
// ----------------------------------------------------------------------------

export function DashboardHome() {
  const {
    bots,
    forms,
    requests,
    setCurrentView,
    setSelectedBotId,
    collaborativeBots,
    refreshCollaborativeBots,
  } = useStore();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [accessLoaded, setAccessLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const supabase = createClient();
        const access = await getCurrentUserAccess(supabase);

        if (!mounted) return;
        setCurrentUserId(access.user?.id ?? null);
        setUserName(
          access.profile?.display_name ||
            access.profile?.username ||
            access.user?.email?.split("@")[0] ||
            null,
        );
      } catch {
        if (!mounted) return;
        setCurrentUserId(null);
      } finally {
        if (mounted) setAccessLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Refresh collaborative bots
  useEffect(() => {
    if (accessLoaded && currentUserId) {
      refreshCollaborativeBots();
    }
  }, [accessLoaded, currentUserId, refreshCollaborativeBots]);

  const formOwnerMap = useMemo(
    () => new Map(forms.map((form) => [form.id, form.ownerId ?? null])),
    [forms],
  );

  const visibleBots =
    accessLoaded && currentUserId
      ? bots.filter((bot) => bot.ownerId === currentUserId)
      : [];

  const visibleForms =
    accessLoaded && currentUserId
      ? forms.filter((form) => form.ownerId === currentUserId)
      : [];

  const visibleRequests =
    accessLoaded && currentUserId
      ? requests.filter((request) => {
          if (request.ownerId === currentUserId) return true;
          const formOwnerId = formOwnerMap.get(request.formId);
          return formOwnerId === currentUserId;
        })
      : [];

  // Calculate stats
  const stats = {
    totalBots: visibleBots.length,
    activeForms: visibleForms.filter((f) => f.isActive).length,
    pendingRequests: visibleRequests.filter(
      (r) => r.status === "new" || r.status === "accepted",
    ).length,
    completedRequests: visibleRequests.filter((r) => r.status === "completed")
      .length,
  };

  const totalRequests = visibleRequests.length;
  const responseRate =
    totalRequests > 0
      ? Math.round((stats.completedRequests / totalRequests) * 100)
      : 0;
  const activeFormRate =
    visibleForms.length > 0
      ? Math.round((stats.activeForms / visibleForms.length) * 100)
      : 0;

  // Get recent bots (sorted by updatedAt)
  const recentBots = [...visibleBots]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 4);

  const mostRecentBot = recentBots[0];

  const recentRequestItems = [...visibleRequests]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 4);

  const oldestPendingRequest = [...visibleRequests]
    .filter(
      (request) => request.status === "new" || request.status === "accepted",
    )
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

  // Build activity feed from real data
  const activityFeed = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [];

    // Recent bot updates
    recentBots.slice(0, 3).forEach((bot) => {
      items.push({
        id: `bot-${bot.id}`,
        type: "bot_updated",
        title: `"${bot.name}" was updated`,
        description: `Modified ${formatRelativeTime(bot.updatedAt)}`,
        timestamp: bot.updatedAt,
        icon: Bot,
        accentColor: "bg-primary/10 text-primary",
      });
    });

    // Recent requests
    recentRequestItems.slice(0, 3).forEach((req) => {
      const isCompleted = req.status === "completed";
      items.push({
        id: `req-${req.id}`,
        type: isCompleted ? "request_completed" : "request_received",
        title: isCompleted ? `Request completed` : `New request received`,
        description: `${req.formTitle} — ${req.submitterName || "Anonymous"}`,
        timestamp: req.createdAt,
        icon: isCompleted ? CheckCircle : Inbox,
        accentColor: isCompleted
          ? "bg-emerald-500/10 text-emerald-500"
          : "bg-amber-500/10 text-amber-500",
      });
    });

    // Sort by timestamp descending
    return items
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 6);
  }, [recentBots, recentRequestItems]);

  const isNewUser =
    accessLoaded &&
    currentUserId &&
    stats.totalBots === 0 &&
    visibleForms.length === 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      {/* Header with greeting */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {getGreeting()}
          {userName ? `, ${userName}` : ""}
        </h1>
        <p className="mt-1 text-sm sm:text-base text-muted-foreground">
          {getMotivationalMessage(stats)}
        </p>
      </div>

      {/* Onboarding Banner for new users */}
      {isNewUser && (
        <div className="mb-8">
          <OnboardingBanner
            totalBots={stats.totalBots}
            totalForms={visibleForms.length}
            onCreateBot={() => setCurrentView("bots")}
            onCreateForm={() => setCurrentView("forms")}
          />
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Bots"
          value={stats.totalBots}
          description="Characters created"
          icon={Bot}
          trend={stats.totalBots > 0 ? "up" : "neutral"}
          trendValue={
            stats.totalBots > 0 ? `${stats.totalBots} active` : undefined
          }
          footer={stats.totalBots > 0 ? "Ready to publish" : "Create one now"}
          onClick={() => setCurrentView("bots")}
        />
        <StatCard
          title="Active Forms"
          value={stats.activeForms}
          description="Accepting submissions"
          icon={FileText}
          accentColor="bg-chart-2/20"
          trend={
            visibleForms.length > 0
              ? stats.activeForms > 0
                ? "up"
                : "down"
              : "neutral"
          }
          trendValue={
            visibleForms.length > 0 ? `${activeFormRate}% active` : undefined
          }
          footer={`${activeFormRate}% of forms active`}
          onClick={() => setCurrentView("forms")}
        />
        <StatCard
          title="Pending Submissions"
          value={stats.pendingRequests}
          description="Awaiting response"
          icon={Inbox}
          accentColor="bg-chart-3/20"
          trend={stats.pendingRequests > 0 ? "up" : "neutral"}
          trendValue={
            stats.pendingRequests > 0 ? " needs attention" : undefined
          }
          footer={
            oldestPendingRequest
              ? `Oldest: ${formatDate(oldestPendingRequest.createdAt)}`
              : "No backlog"
          }
          onClick={() => setCurrentView("requests")}
        />
        <StatCard
          title="Completed"
          value={stats.completedRequests}
          description="Submissions fulfilled"
          icon={CheckCircle}
          accentColor="bg-success/20"
          trend={stats.completedRequests > 0 ? "up" : "neutral"}
          trendValue={
            stats.completedRequests > 0 ? `${responseRate}% rate` : undefined
          }
          footer={`${responseRate}% completion rate`}
          onClick={() => setCurrentView("requests")}
        />
      </div>

      {/* Insight Cards */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <InsightCard
          title="Workspace health"
          value={`${responseRate}%`}
          description="Share of submissions already completed in this workspace."
          icon={Activity}
          accentClassName="bg-primary/10"
          actionLabel="Open Submissions"
          onAction={() => setCurrentView("requests")}
        />
        <InsightCard
          title="Form activity"
          value={`${activeFormRate}%`}
          description="Percentage of your forms that are currently accepting submissions."
          icon={Sparkles}
          accentClassName="bg-chart-2/10"
          actionLabel="Manage Forms"
          onAction={() => setCurrentView("forms")}
        />
        <InsightCard
          title="Queue pressure"
          value={
            stats.pendingRequests > 0
              ? `${stats.pendingRequests} open`
              : "Clear"
          }
          description="Outstanding submissions that need attention."
          icon={AlertTriangle}
          accentClassName="bg-chart-3/10"
          actionLabel="Review queue"
          onAction={() => setCurrentView("requests")}
        />
      </div>

      {/* Two-column layout: Activity Feed + Recent Submissions */}
      <div className="mb-8 grid gap-6 lg:grid-cols-5">
        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Activity Feed</h2>
              <p className="text-sm text-muted-foreground">
                Latest updates across your workspace
              </p>
            </div>
          </div>

          <Card className="border-border/70">
            {activityFeed.length > 0 ? (
              <CardContent className="p-2">
                {activityFeed.map((item) => (
                  <ActivityFeedItem key={item.id} item={item} />
                ))}
              </CardContent>
            ) : (
              <CardContent className="p-0">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="h-6 w-6 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No recent activity
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Activity will appear here as you create and manage content
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Recent Submissions */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Recent Submissions</h2>
              <p className="text-sm text-muted-foreground">
                The latest submissions across your active forms
              </p>
            </div>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setCurrentView("requests")}
            >
              View All
            </Button>
          </div>

          {recentRequestItems.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {recentRequestItems.map((request) => (
                <RecentRequestCard
                  key={request.id}
                  formTitle={request.formTitle}
                  status={request.status}
                  submitterName={request.submitterName}
                  createdAt={request.createdAt}
                  notes={request.notes}
                  onClick={() => setCurrentView("requests")}
                />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={Inbox}
                title="No submissions yet"
                description="Once people submit submissions, the latest ones will show up here for quick triage."
                actionLabel="Open Submissions"
                onAction={() => setCurrentView("requests")}
              />
            </Card>
          )}
        </div>
      </div>

      {/* Collaborative Bots Section */}
      {collaborativeBots.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Shared With You
              </h2>
              <p className="text-sm text-muted-foreground">
                Bots where you're a collaborator
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {collaborativeBots.slice(0, 4).map((bot) => (
              <Card
                key={bot.id}
                className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                onClick={() => {
                  setSelectedBotId(bot.id);
                  setCurrentView("bots");
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">
                        {bot.name}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-1 text-xs">
                        {bot.short_description}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] ml-2 shrink-0"
                    >
                      {bot.collaborator_role || "collaborator"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>
                      by{" "}
                      {bot.owner_display_name ||
                        bot.owner_username ||
                        "Unknown"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Bots Section */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recent Bots</h2>
            <p className="text-sm text-muted-foreground">
              Your most recently updated characters
            </p>
          </div>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => setCurrentView("bots")}
          >
            View All
          </Button>
        </div>

        {recentBots.length > 0 ? (
          <>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {recentBots.map((bot) => (
                <RecentBotCard
                  key={bot.id}
                  name={bot.name}
                  description={bot.shortDescription}
                  rating={bot.rating}
                  tags={bot.tags}
                  updatedAt={bot.updatedAt}
                  onEdit={() => {
                    setSelectedBotId(bot.id);
                    setCurrentView("bots");
                  }}
                />
              ))}
            </div>
            {mostRecentBot && (
              <p className="mt-3 text-xs text-muted-foreground">
                Last updated bot: {mostRecentBot.name}
              </p>
            )}
          </>
        ) : (
          <Card>
            <EmptyState
              icon={Bot}
              title="No bots yet"
              description="Create your first bot to get started. You can import existing character cards or create from scratch."
              actionLabel="Create Your First Bot"
              onAction={() => setCurrentView("bots")}
            />
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
            onClick={() => setCurrentView("bots")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Create New Bot</h3>
                <p className="text-sm text-muted-foreground">
                  Start building a new character
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
            onClick={() => setCurrentView("forms")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10">
                <FileText className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <h3 className="font-medium">Design Request Form</h3>
                <p className="text-sm text-muted-foreground">
                  Create custom intake forms
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
            onClick={() => setCurrentView("atlas")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-4/10">
                <BookOpen className="h-6 w-6 text-chart-4" />
              </div>
              <div>
                <h3 className="font-medium">Open Atlas</h3>
                <p className="text-sm text-muted-foreground">
                  Organize series, lore, and creator spaces
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
            onClick={() => setCurrentView("profile")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-5/10">
                <Star className="h-6 w-6 text-chart-5" />
              </div>
              <div>
                <h3 className="font-medium">Edit Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Update your public creator page
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
            onClick={() => setCurrentView("requests")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                <BarChart3 className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-medium">Review Submissions</h3>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingRequests > 0
                    ? `${stats.pendingRequests} pending`
                    : "View all submissions"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
            onClick={() => setCurrentView("bots")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <Upload className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-medium">Import Character Card</h3>
                <p className="text-sm text-muted-foreground">
                  Import from PNG or JSON
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feedback Section */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Feedback</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="overflow-hidden border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75">
            <CardHeader className="space-y-2 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Send a suggestion
              </CardTitle>
              <CardDescription>
                Share ideas to improve JanitorForge or ask for a new workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <FeedbackActions
                compact
                mode="suggestion"
                context={{
                  sourcePage: "Dashboard",
                  sourceLabel: "Dashboard - Suggestion card",
                  sourcePath: "/dashboard",
                }}
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75">
            <CardHeader className="space-y-2 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Report a bug
              </CardTitle>
              <CardDescription>
                Tell us when something is broken so we can fix it faster.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <FeedbackActions
                compact
                mode="bug"
                context={{
                  sourcePage: "Dashboard",
                  sourceLabel: "Dashboard - Bug report card",
                  sourcePath: "/dashboard",
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
