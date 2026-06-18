// ============================================================================
// JanitorForge - Notification Bell
// In-app notification bell with dropdown showing recent notifications
// ============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck, Trash2, Loader2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
} from "@/app/actions/notifications";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Notification type config for icons and colors
const typeConfig: Record<string, { color: string; bg: string }> = {
  new_request: { color: "text-blue-400", bg: "bg-blue-500/10" },
  request_status_change: { color: "text-emerald-400", bg: "bg-emerald-500/10" },
  new_follower: { color: "text-pink-400", bg: "bg-pink-500/10" },
  flagged_submission: { color: "text-red-400", bg: "bg-red-500/10" },
  collaboration_invite: { color: "text-purple-400", bg: "bg-purple-500/10" },
  form_shared: { color: "text-amber-400", bg: "bg-amber-500/10" },
};

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

  // Load count on mount and periodically
  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 30000); // every 30s
    return () => clearInterval(interval);
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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 cursor-pointer"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
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
              You'll see new requests and activity here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {notifications.map((notification) => {
              const config = typeConfig[notification.type] || {
                color: "text-muted-foreground",
                bg: "bg-muted",
              };

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                    !notification.is_read && "bg-primary/[0.03]",
                  )}
                >
                  {/* Unread indicator + content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      )}
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

                  {/* Actions (visible on hover) */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 cursor-pointer"
                        title="Mark as read"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-destructive"
                      title="Delete"
                      onClick={() => handleDelete(notification.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
