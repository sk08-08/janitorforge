// ============================================================================
// JanitorForge - Notification Bell
// In-app notification bell with dropdown showing recent notifications
// ============================================================================

"use client";

import { useState, useEffect, useCallback, type MouseEvent } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  Inbox,
  ArrowUpRight,
  FileText,
  AlertTriangle,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
} from "@/app/actions/notifications";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

function getTimeAgo(dateStr: string): string {
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

export function NotificationBell() {
  const { setCurrentView } = useStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const refreshCount = useCallback(async () => {
    const result = await getUnreadCount();
    if (result.success) {
      setUnreadCount(result.count);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const result = await getNotifications(15);
    if (result.success) {
      setNotifications(result.notifications);
    }
    setLoading(false);
  }, []);

  // Load count on mount and poll every 60s
  // Also listen for real-time notification inserts
  useEffect(() => {
    let mounted = true;
    refreshCount();
    const interval = setInterval(refreshCount, 60000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;

    const setupRealtime = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user || !mounted) return;

      channel = supabase
        .channel(`notifications-bell-${userData.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userData.user.id}`,
          },
          (payload) => {
            const n = payload.new as Record<string, unknown>;
            setNotifications((prev) => {
              if (prev.some((p) => p.id === n.id)) return prev;
              return [
                {
                  id: n.id as string,
                  type: n.type as string,
                  title: n.title as string,
                  message: (n.message as string) || null,
                  link: (n.link as string) || null,
                  is_read: n.is_read as boolean,
                  metadata: (n.metadata as Record<string, unknown>) || null,
                  created_at: n.created_at as string,
                },
                ...prev,
              ];
            });
            setUnreadCount((prev) => prev + 1);
          },
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      mounted = false;
      clearInterval(interval);
      if (channel) {
        (async () => {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          supabase.removeChannel(channel);
        })();
      }
    };
  }, [refreshCount]);

  // Load full list when dropdown opens
  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    const result = await markAsRead(id);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await markAllAsRead();
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    }
  };

  const handleDelete = async (id: string) => {
    const wasUnread = notifications.find((n) => n.id === id)?.is_read === false;
    const result = await deleteNotification(id);
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_request":
      case "new_submission":
        return <Inbox className="h-3 w-3 text-blue-400" />;
      case "new_follower":
        return <UsersRound className="h-3 w-3 text-green-400" />;
      case "collaboration_invite":
        return <UsersRound className="h-3 w-3 text-purple-400" />;
      case "flagged_submission":
        return <AlertTriangle className="h-3 w-3 text-amber-400" />;
      default:
        return <FileText className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "new_request":
      case "new_submission":
        return "border-l-blue-500/50";
      case "new_follower":
        return "border-l-green-500/50";
      case "collaboration_invite":
        return "border-l-purple-500/50";
      case "flagged_submission":
        return "border-l-amber-500/50";
      default:
        return "";
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-7 w-7 cursor-pointer"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-h-[420px] overflow-y-auto p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification list */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Inbox className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs text-muted-foreground/60">
              You'll see new submissions and activity here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {notifications.map((notification) => {
              const meta = notification.metadata as Record<
                string,
                unknown
              > | null;

              // Determine if the link is a real external page (profile, form)
              // or a SPA-internal dashboard view that needs client-side navigation
              const isDashboardLink =
                notification.link && notification.link.startsWith("/dashboard");
              const hasExternalLink =
                notification.link &&
                notification.link.startsWith("/") &&
                !isDashboardLink;
              const hasSpaAction =
                (!notification.link || isDashboardLink) &&
                (meta || isDashboardLink);

              const handleClick = async (
                event?: MouseEvent<HTMLButtonElement | HTMLAnchorElement>,
              ) => {
                if (hasExternalLink && event) {
                  event.preventDefault();
                }

                if (!notification.is_read) {
                  await handleMarkAsRead(notification.id);
                }

                if (hasSpaAction) {
                  if (meta?.request_id || meta?.form_id) {
                    setCurrentView("requests");
                  } else if (meta?.bot_id) {
                    setCurrentView("bots");
                  } else if (meta?.follower_id) {
                    setCurrentView("profile");
                  } else if (isDashboardLink) {
                    // Parse ?view= param from dashboard links
                    const url = new URL(
                      notification.link!,
                      window.location.origin,
                    );
                    const view = url.searchParams.get("view");
                    if (
                      view &&
                      ["bots", "forms", "requests", "profile"].includes(view)
                    ) {
                      setCurrentView(
                        view as "bots" | "forms" | "requests" | "profile",
                      );
                    } else {
                      setCurrentView("bots");
                    }
                  }
                } else if (hasExternalLink && notification.link) {
                  window.location.href = notification.link;
                }
              };

              const Wrapper = hasExternalLink ? "a" : "button";
              const wrapperProps = hasExternalLink
                ? {
                    href: notification.link,
                    target: "_self" as const,
                    onClick: handleClick,
                  }
                : { type: "button" as const, onClick: handleClick };

              return (
                <Wrapper
                  key={notification.id}
                  {...(wrapperProps as any)}
                  className={cn(
                    "group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                    !notification.is_read && "bg-primary/[0.03]",
                    `border-l-2 ${getNotificationColor(notification.type)}`,
                    notification.link && "cursor-pointer no-underline",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          !notification.is_read
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {notification.title}
                      </p>
                      {notification.link && (
                        <ArrowUpRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {getTimeAgo(notification.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 cursor-pointer"
                        title="Mark as read"
                        onClick={(e) => {
                          e.preventDefault();
                          handleMarkAsRead(notification.id);
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-pointer text-destructive hover:text-white"
                      title="Delete"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(notification.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Wrapper>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
