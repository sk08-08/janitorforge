// ============================================================================
// JanitorForge - Settings Dialog
// General platform settings: appearance, notifications, data, shortcuts, security
// ============================================================================

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme, type Theme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { changePin, getSession } from "@/app/actions/auth";
import {
  Bell,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  Keyboard,
  Loader2,
  Moon,
  Monitor,
  Palette,
  Shield,
  Sun,
  Trash2,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

type SettingsSection =
  | "appearance"
  | "notifications"
  | "data"
  | "shortcuts"
  | "security";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NotificationPrefs {
  collaborations: boolean;
  submissions: boolean;
  moderation: boolean;
  updates: boolean;
}

interface SessionInfo {
  userId: string;
  username: string;
  loggedInAt: string;
}

const defaultNotificationPrefs: NotificationPrefs = {
  collaborations: true,
  submissions: true,
  moderation: true,
  updates: true,
};

const NOTIFICATION_PREFS_KEY = "jf-notification-prefs";

// ----------------------------------------------------------------------------
// Keyboard shortcuts reference
// ----------------------------------------------------------------------------

const shortcuts = [
  {
    category: "Search",
    items: [{ keys: ["/"], description: "Focus search" }],
  },
  {
    category: "Navigation",
    items: [
      {
        keys: ["Alt", "1"],
        description: "Open People",
      },
      {
        keys: ["Alt", "2"],
        description: "Open Resources",
      },
      {
        keys: ["Alt", "3"],
        description: "Open Logs",
      },
      {
        keys: ["Alt", "4"],
        description: "Open Dashboard",
      },
      {
        keys: ["Alt", "5"],
        description: "Open Bot Manager",
      },
      {
        keys: ["Alt", "6"],
        description: "Open Forms",
      },
      {
        keys: ["Alt", "7"],
        description: "Open Submissions",
      },
      {
        keys: ["Alt", "8"],
        description: "Open Moderation",
      },
      {
        keys: ["Alt", "9"],
        description: "Open Atlas",
      },
      {
        keys: ["Alt", "0"],
        description: "Open Creator Pages",
      },
    ],
  },
  {
    category: "Actions",
    items: [{ keys: ["Esc"], description: "Close dialog / cancel" }],
  },
];

const themeOptions: ReadonlyArray<{
  value: Theme;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("appearance");
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(
    defaultNotificationPrefs,
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [changingPin, setChangingPin] = useState(false);

  // Load notification prefs from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (saved) {
        setNotificationPrefs({
          ...defaultNotificationPrefs,
          ...JSON.parse(saved),
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Load current user
  useEffect(() => {
    if (!open) return;
    (async () => {
      const supabase = createClient();
      const access = await getCurrentUserAccess(supabase);
      setUserId(access.user?.id ?? null);
      setUsername(access.profile?.username ?? "");
      const session = (await getSession()) as SessionInfo | null;
      setSessionInfo(session);
    })();
  }, [open]);

  const validatePinValue = (value: string) => /^\d{4}$/.test(value);

  const handleChangePin = useCallback(async () => {
    const cleanUsername = username.toLowerCase().trim();
    if (!cleanUsername) {
      toast.error("Enter your username");
      return;
    }
    if (!validatePinValue(currentPin)) {
      toast.error("Current PIN must be exactly 4 digits");
      return;
    }
    if (!validatePinValue(newPin)) {
      toast.error("New PIN must be exactly 4 digits");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("New PIN confirmation does not match");
      return;
    }

    setChangingPin(true);
    try {
      const result = await changePin(cleanUsername, currentPin, newPin);
      if (!result.success) {
        toast.error(result.error || "Could not update PIN");
        return;
      }

      toast.success("PIN updated successfully");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (error) {
      console.error("Change PIN failed:", error);
      toast.error("Could not update PIN");
    } finally {
      setChangingPin(false);
    }
  }, [confirmPin, currentPin, newPin, username]);

  // Save notification prefs
  const updateNotificationPref = useCallback(
    (key: keyof NotificationPrefs, value: boolean) => {
      setNotificationPrefs((prev) => {
        const next = { ...prev, [key]: value };
        if (typeof window !== "undefined") {
          localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
        }
        toast.success(value ? "Notification enabled" : "Notification disabled");
        return next;
      });
    },
    [],
  );

  // Export all user data
  const handleExportAll = useCallback(async () => {
    if (!userId) {
      toast.error("Sign in to export data");
      return;
    }

    setExporting(true);
    try {
      const supabase = createClient();

      const [
        { data: bots },
        { data: forms },
        { data: requests },
        { data: worlds },
        { data: lorebooks },
        { data: entries },
      ] = await Promise.all([
        supabase
          .from("bots")
          .select("*")
          .eq("user_id", userId)
          .is("deleted_at", null),
        supabase
          .from("request_forms")
          .select("*")
          .eq("user_id", userId)
          .is("deleted_at", null),
        supabase
          .from("requests")
          .select("*")
          .eq("user_id", userId)
          .is("deleted_at", null),
        supabase
          .from("atlas_worlds")
          .select("*")
          .eq("user_id", userId)
          .is("deleted_at", null),
        supabase
          .from("atlas_lorebooks")
          .select("*")
          .eq("user_id", userId)
          .is("deleted_at", null),
        supabase
          .from("atlas_entries")
          .select("*")
          .eq("user_id", userId)
          .is("deleted_at", null),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        bots: bots ?? [],
        forms: forms ?? [],
        requests: requests ?? [],
        atlasWorlds: worlds ?? [],
        atlasLorebooks: lorebooks ?? [],
        atlasEntries: entries ?? [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `janitorforge-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  }, [userId]);

  // Export specific data type
  const handleExportSingle = useCallback(
    async (table: string, label: string, ownerColumn = "user_id") => {
      if (!userId) return;
      setExporting(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq(ownerColumn, userId)
          .is("deleted_at", null);
        if (error) throw error;

        const blob = new Blob([JSON.stringify(data ?? [], null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `janitorforge-${label}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${label} exported`);
      } catch (error) {
        console.error("Export failed:", error);
        toast.error(`Failed to export ${label}`);
      } finally {
        setExporting(false);
      }
    },
    [userId],
  );

  // Delete account
  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("delete_user_account");
      if (error) throw error;
      toast.success("Account deleted");
      window.location.href = "/login";
    } catch (error) {
      console.error("Account deletion failed:", error);
      toast.error("Could not delete account. Contact support.");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setDeleteConfirmText("");
    }
  }, [deleteConfirmText]);

  // Section definitions
  const sections = useMemo(
    () => [
      {
        id: "appearance" as SettingsSection,
        label: "Appearance",
        icon: Palette,
      },
      {
        id: "notifications" as SettingsSection,
        label: "Notifications",
        icon: Bell,
      },
      { id: "data" as SettingsSection, label: "Data", icon: Database },
      {
        id: "shortcuts" as SettingsSection,
        label: "Shortcuts",
        icon: Keyboard,
      },
      { id: "security" as SettingsSection, label: "Security", icon: Shield },
    ],
    [],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-hidden p-0 sm:max-w-3xl">
          <div className="flex h-full max-h-[85vh] flex-col sm:flex-row">
            {/* ── Sidebar nav ── */}
            <nav className="shrink-0 border-b border-border/60 bg-muted/30 p-3 sm:border-b-0 sm:border-r sm:w-48 sm:p-4">
              <DialogHeader className="mb-3 sm:mb-4">
                <DialogTitle className="text-lg">Settings</DialogTitle>
                <DialogDescription className="text-xs">
                  Platform preferences
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-x-visible">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                        isActive
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {/* Appearance */}
              {activeSection === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold">Appearance</h3>
                    <p className="text-sm text-muted-foreground">
                      Customize the look and feel of JanitorForge.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Theme</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {themeOptions.map((option) => {
                        const Icon = option.icon;
                        const isActive = theme === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setTheme(option.value)}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all cursor-pointer",
                              isActive
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border/60 hover:border-primary/30",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-5 w-5",
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground",
                              )}
                            />
                            <span
                              className={cn(
                                "text-sm font-medium",
                                isActive && "text-primary",
                              )}
                            >
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeSection === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold">Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose which notifications you want to receive.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        key: "collaborations" as const,
                        label: "Collaborations",
                        description:
                          "Invitations, role changes, and collaborator activity",
                      },
                      {
                        key: "submissions" as const,
                        label: "Submissions",
                        description: "New form submissions and status updates",
                      },
                      {
                        key: "moderation" as const,
                        label: "Moderation",
                        description: "Flagged content and review requests",
                      },
                      {
                        key: "updates" as const,
                        label: "Platform updates",
                        description:
                          "New features, announcements, and release notes",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-4"
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <Switch
                          checked={notificationPrefs[item.key]}
                          onCheckedChange={(val) =>
                            updateNotificationPref(item.key, val)
                          }
                          className="cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data */}
              {activeSection === "data" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold">Your data</h3>
                    <p className="text-sm text-muted-foreground">
                      Download your data in JSON format.
                    </p>
                  </div>

                  {/* Full export */}
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Export everything</p>
                        <p className="text-xs text-muted-foreground">
                          Download all your bots, forms, submissions, and atlas
                          data in a single file.
                        </p>
                      </div>
                      <Button
                        onClick={handleExportAll}
                        disabled={exporting}
                        className="cursor-pointer shrink-0"
                      >
                        {exporting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Export all
                      </Button>
                    </div>
                  </div>

                  {/* Individual exports */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Export individual data
                    </Label>
                    {(
                      [
                        {
                          table: "bots",
                          label: "Bots",
                          icon: FileJson,
                          ownerColumn: "user_id",
                        },
                        {
                          table: "request_forms",
                          label: "Forms",
                          icon: FileSpreadsheet,
                          ownerColumn: "user_id",
                        },
                        {
                          table: "atlas_worlds",
                          label: "Atlas Worlds",
                          icon: FileJson,
                          ownerColumn: "user_id",
                        },
                        {
                          table: "atlas_lorebooks",
                          label: "Lorebooks",
                          icon: FileJson,
                          ownerColumn: "user_id",
                        },
                        {
                          table: "atlas_entries",
                          label: "Entries",
                          icon: FileJson,
                          ownerColumn: "user_id",
                        },
                      ] as const
                    ).map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.table}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{item.label}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleExportSingle(
                                item.table,
                                item.label,
                                item.ownerColumn,
                              )
                            }
                            disabled={exporting}
                            className="cursor-pointer"
                          >
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Export
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shortcuts */}
              {activeSection === "shortcuts" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold">
                      Keyboard shortcuts
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Speed up your workflow with these shortcuts.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {shortcuts.map((group) => (
                      <div key={group.category} className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                          {group.category}
                        </h4>
                        <div className="space-y-1">
                          {group.items.map((item) => (
                            <div
                              key={item.description}
                              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/30"
                            >
                              <span className="text-sm">
                                {item.description}
                              </span>
                              <div className="flex items-center gap-1">
                                {item.keys.map((key, i) => (
                                  <span key={i}>
                                    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border/60 bg-muted/50 px-1.5 text-[11px] font-medium text-muted-foreground">
                                      {key}
                                    </kbd>
                                    {i < item.keys.length - 1 && (
                                      <span className="mx-0.5 text-xs text-muted-foreground">
                                        +
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    More shortcuts coming soon. Some shortcuts may not be
                    available on all pages.
                  </p>
                </div>
              )}

              {/* Security */}
              {activeSection === "security" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold">Security</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your PIN, current session, and account deletion.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Account</Label>
                    <div className="rounded-xl border border-border/60 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Username</p>
                          <p className="text-xs text-muted-foreground">
                            This is your login identifier.
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {username || "Loading..."}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Change PIN</Label>
                    <div className="rounded-xl border border-border/60 p-4 space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="security-username"
                            className="text-xs"
                          >
                            Username
                          </Label>
                          <Input
                            id="security-username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="your-username"
                            autoComplete="username"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="current-pin" className="text-xs">
                            Current PIN
                          </Label>
                          <Input
                            id="current-pin"
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={currentPin}
                            onChange={(e) => setCurrentPin(e.target.value)}
                            placeholder="••••"
                            autoComplete="current-password"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-pin" className="text-xs">
                            New PIN
                          </Label>
                          <Input
                            id="new-pin"
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            placeholder="••••"
                            autoComplete="new-password"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-pin" className="text-xs">
                            Confirm new PIN
                          </Label>
                          <Input
                            id="confirm-pin"
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value)}
                            placeholder="••••"
                            autoComplete="new-password"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                          Use your username and current PIN to authorize the
                          change.
                        </p>
                        <Button
                          onClick={handleChangePin}
                          disabled={changingPin}
                          className="cursor-pointer shrink-0"
                        >
                          {changingPin ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Update PIN
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Sessions</Label>
                    <div className="rounded-xl border border-border/60 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Current session</p>
                          <p className="text-xs text-muted-foreground">
                            {sessionInfo
                              ? `Signed in as @${sessionInfo.username} · ${new Date(sessionInfo.loggedInAt).toLocaleString()}`
                              : "No active session found"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            This browser session is read from the live auth
                            cookie, not hardcoded text.
                          </p>
                        </div>
                        <Badge
                          variant="default"
                          className={cn(
                            sessionInfo
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {sessionInfo ? "Active" : "Unavailable"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-destructive">
                      Danger zone
                    </Label>
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-destructive">
                            Delete account
                          </p>
                          <p className="text-xs text-muted-foreground">
                            This opens a confirmation dialog before anything is
                            deleted.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteConfirmOpen(true)}
                          className="cursor-pointer shrink-0"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete account
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete account confirmation ── */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account, all your bots, forms,
              submissions, Atlas worlds, lorebooks, and entries. Nothing is
              removed yet until you confirm below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 px-6">
            <Label htmlFor="delete-confirm" className="text-sm">
              Type <span className="font-mono font-semibold">DELETE</span> to
              confirm:
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              onClick={() => {
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || deleting}
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete my account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
