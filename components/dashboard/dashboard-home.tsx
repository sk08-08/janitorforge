// ============================================================================
// JanitorForge - Dashboard Home View
// Overview panel with statistics and recent activity
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
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { FeedbackActions } from "@/components/feedback/feedback-actions";

// ----------------------------------------------------------------------------
// Stat Card Component
// ----------------------------------------------------------------------------

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: typeof Bot;
  trend?: "up" | "down" | "neutral";
  accentColor?: string;
  footer?: string;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accentColor,
  footer,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75">
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
          {footer && (
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

interface RecentRequestCardProps {
  formTitle: string;
  status: "new" | "accepted" | "completed" | "rejected";
  submitterName?: string;
  createdAt: Date;
  notes?: string;
}

function RecentRequestCard({
  formTitle,
  status,
  submitterName,
  createdAt,
  notes,
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
    <Card className="overflow-hidden border-border/70 transition-all hover:border-primary/40 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium">{formTitle}</p>
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
            {formatDate(createdAt)}
          </span>
          <span className="truncate">{formTitle}</span>
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
  onEdit: () => void;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function RecentBotCard({
  name,
  description,
  rating,
  tags,
  updatedAt,
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
          <span
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            suppressHydrationWarning
          >
            <Clock className="h-3 w-3" />
            {formatDate(updatedAt)}
          </span>
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
// Dashboard Home Component
// ----------------------------------------------------------------------------

export function DashboardHome() {
  const { bots, forms, requests, setCurrentView, setSelectedBotId } =
    useStore();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accessLoaded, setAccessLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const supabase = createClient();
        const access = await getCurrentUserAccess(supabase);

        if (!mounted) return;
        setCurrentUserId(access.user?.id ?? null);
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

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm sm:text-base text-muted-foreground">
          Welcome back! Here&apos;s an overview of your bot creator workspace.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Bots"
          value={stats.totalBots}
          description="Characters created"
          icon={Bot}
          footer={stats.totalBots > 0 ? "Ready to publish" : "Create one now"}
        />
        <StatCard
          title="Active Forms"
          value={stats.activeForms}
          description="Accepting requests"
          icon={FileText}
          accentColor="bg-chart-2/20"
          footer={`${activeFormRate}% of forms active`}
        />
        <StatCard
          title="Pending Requests"
          value={stats.pendingRequests}
          description="Awaiting response"
          icon={Inbox}
          accentColor="bg-chart-3/20"
          footer={
            oldestPendingRequest
              ? `Oldest: ${formatDate(oldestPendingRequest.createdAt)}`
              : "No backlog"
          }
        />
        <StatCard
          title="Completed"
          value={stats.completedRequests}
          description="Requests fulfilled"
          icon={CheckCircle}
          accentColor="bg-success/20"
          footer={`${responseRate}% completion rate`}
        />
      </div>

      {/* Insight Cards */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <InsightCard
          title="Workspace health"
          value={`${responseRate}%`}
          description="Share of requests already completed in this workspace."
          icon={Activity}
          accentClassName="bg-primary/10"
          actionLabel="Open Requests"
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
          description="Outstanding requests that need attention."
          icon={AlertTriangle}
          accentClassName="bg-chart-3/10"
          actionLabel="Review queue"
          onAction={() => setCurrentView("requests")}
        />
      </div>

      {/* Recent Requests Section */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Recent Requests</h2>
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recentRequestItems.map((request) => (
              <RecentRequestCard
                key={request.id}
                formTitle={request.formTitle}
                status={request.status}
                submitterName={request.submitterName}
                createdAt={request.createdAt}
                notes={request.notes}
              />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={Inbox}
              title="No requests yet"
              description="Once people submit requests, the latest ones will show up here for quick triage."
              actionLabel="Open Requests"
              onAction={() => setCurrentView("requests")}
            />
          </Card>
        )}
      </div>

      {/* Recent Bots Section */}
      <div>
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
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Feedback</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="overflow-hidden border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75">
            <CardHeader className="space-y-2 pb-3">
              <CardTitle className="text-base">Send a suggestion</CardTitle>
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
              <CardTitle className="text-base">Report a bug</CardTitle>
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

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            className="cursor-pointer transition-all hover:border-primary/50"
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
            className="cursor-pointer transition-all hover:border-primary/50"
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
            className="cursor-pointer transition-all hover:border-primary/50"
            onClick={() => setCurrentView("atlas")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-4/10">
                <TrendingUp className="h-6 w-6 text-chart-4" />
              </div>
              <div>
                <h3 className="font-medium">Open Atlas</h3>
                <p className="text-sm text-muted-foreground">
                  Organize series, lore, and creator spaces
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
