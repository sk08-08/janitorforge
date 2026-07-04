// ============================================================================
// JanitorForge - Dashboard Layout
// Main layout wrapper with sidebar navigation
// ============================================================================

"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Bot,
  FileText,
  Inbox,
  Globe,
  BookOpen,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Logs,
  LogOut,
  User,
  Shield,
  Menu,
  MessageSquareMore,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Image from "next/image";
import type { NavigationView } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { getOwnProfile } from "@/app/actions/profile";
import { NotificationBell } from "./notification-bell";

// ----------------------------------------------------------------------------
// Navigation Configuration
// ----------------------------------------------------------------------------

interface NavItem {
  id: NavigationView;
  label: string;
  icon: typeof LayoutDashboard;
  description: string;
}

type NavSectionId = "hub" | "forge" | "admin";

const NAV_SECTION_STORAGE_KEY = "dashboard-nav-section-collapsed";

const hubNavItems: NavItem[] = [
  {
    id: "profiles",
    label: "People",
    icon: Users,
    description: "Browse creator profiles and discover new accounts",
  },
  {
    id: "resources",
    label: "Resources",
    icon: BookOpen,
    description: "Directory of Janitor resources and references",
  },
  {
    id: "logs",
    label: "Logs",
    icon: Logs,
    description:
      "Visit a list of records about the platform's errors, lack of communication, and other issues",
  },
];

const forgeNavItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Overview and quick stats",
  },
  {
    id: "bots",
    label: "Bot Manager",
    icon: Bot,
    description: "Create and manage your bots",
  },
  {
    id: "forms",
    label: "Forms",
    icon: FileText,
    description: "Design custom forms",
  },
  {
    id: "requests",
    label: "Submissions",
    icon: Inbox,
    description: "Manage incoming submissions",
  },
  {
    id: "moderation",
    label: "Moderation",
    icon: Shield,
    description: "Review flagged submissions",
  },
  {
    id: "atlas",
    label: "Atlas",
    icon: Globe,
    description: "Organize series, lore, and creator spaces",
  },
];

// ----------------------------------------------------------------------------
// Dashboard Layout Component
// ----------------------------------------------------------------------------

interface DashboardLayoutProps {
  children: ReactNode;
  username: string;
}

export function DashboardLayout({ children, username }: DashboardLayoutProps) {
  const { currentView, setCurrentView, requests, forms } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<NavSectionId, boolean>
  >({ hub: false, forge: false, admin: false });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingModerationCount, setPendingModerationCount] = useState(0);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem(NAV_SECTION_STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<
        Record<NavSectionId, boolean>
      >;
      setCollapsedSections((prev) => ({
        hub: parsed.hub ?? prev.hub,
        forge: parsed.forge ?? prev.forge,
        admin: parsed.admin ?? prev.admin,
      }));
    } catch {
      // Ignore malformed persisted state.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      NAV_SECTION_STORAGE_KEY,
      JSON.stringify(collapsedSections),
    );
  }, [collapsedSections]);

  // Load profile avatar on mount
  useEffect(() => {
    let mounted = true;
    getOwnProfile().then((result) => {
      if (!mounted) return;
      if (result.success && result.profile) {
        setUserAvatarUrl(result.profile.avatar_url || null);
        setUserDisplayName(result.profile.display_name || null);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);
  const isMobile = useIsMobile();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const supabase = createClient();
        const access = await getCurrentUserAccess(supabase);
        if (!mounted) return;
        setCurrentUserId(access.user?.id ?? null);
        setIsAdmin(access.isAdmin);
      } catch {
        if (!mounted) return;
        setCurrentUserId(null);
        setIsAdmin(false);
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

  const newRequestsCount = accessLoaded
    ? requests.filter((request) => {
        if (request.status !== "new" || !currentUserId) return false;
        const formOwnerId = formOwnerMap.get(request.formId);
        return (
          request.ownerId === currentUserId || formOwnerId === currentUserId
        );
      }).length
    : 0;

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!accessLoaded || !currentUserId) {
        if (mounted) setPendingModerationCount(0);
        return;
      }

      try {
        const supabase = createClient();
        const { count, error } = await supabase
          .from("flagged_requests")
          .select("id", { count: "exact", head: true })
          .eq("reviewed", false);

        if (!mounted) return;

        if (error) {
          console.error("Failed to load moderation count:", error);
          setPendingModerationCount(0);
          return;
        }

        setPendingModerationCount(count || 0);
      } catch {
        if (mounted) setPendingModerationCount(0);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [accessLoaded, currentUserId]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  const handleNavClick = (view: NavigationView) => {
    setCurrentView(view);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = currentView === item.id;
    const showBadge = item.id === "requests" && newRequestsCount > 0;
    const showModerationBadge =
      item.id === "moderation" && pendingModerationCount > 0;
    const badgeValue =
      item.id === "requests"
        ? newRequestsCount
        : item.id === "moderation"
          ? pendingModerationCount
          : 0;

    const button = (
      <Button
        key={item.id}
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 transition-all cursor-pointer",
          isActive &&
            "bg-sidebar-accent text-sidebar-accent-foreground neon-glow-sm cursor-default",
          collapsed && "justify-center px-2",
        )}
        onClick={() => handleNavClick(item.id)}
      >
        <div className="relative">
          <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
          {(showBadge || showModerationBadge) && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {badgeValue}
            </span>
          )}
        </div>
        {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
      </Button>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-1">
            <span className="font-medium">{item.label}</span>
            <span className="text-xs text-muted-foreground">
              {item.description}
            </span>
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  const toggleSection = (sectionId: NavSectionId) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const renderNavSection = (
    sectionId: NavSectionId,
    title: string,
    items: NavItem[],
  ) => (
    <div className="space-y-1">
      {!collapsed && (
        <button
          type="button"
          className="flex w-full items-center justify-between px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => toggleSection(sectionId)}
          aria-expanded={!collapsedSections[sectionId]}
        >
          <span>{title}</span>
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              !collapsedSections[sectionId] && "rotate-90",
            )}
          />
        </button>
      )}
      {collapsed && (
        <button
          type="button"
          className="flex w-full items-center justify-center px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => toggleSection(sectionId)}
          aria-expanded={!collapsedSections[sectionId]}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              !collapsedSections[sectionId] && "rotate-90",
            )}
          />
        </button>
      )}
      {!collapsedSections[sectionId] && items.map(renderNavItem)}
    </div>
  );

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
            collapsed ? "w-16" : "w-64",
          )}
        >
          {/* Logo */}
          <div
            className={cn(
              "flex h-16 items-center border-b border-sidebar-border px-4",
              collapsed ? "justify-center" : "gap-3",
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 neon-glow-sm">
              <Image
                src="/logo.png"
                alt="JanitorForge Logo"
                width={24}
                height={24}
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-semibold text-sidebar-foreground">
                  JanitorForge (Beta)
                </span>
                <span className="text-xs text-muted-foreground">
                  Bot Creator Toolkit
                </span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-3 p-2">
            {renderNavSection("hub", "Hub", hubNavItems)}
            <div className="border-t border-sidebar-border/60 pt-2">
              {renderNavSection("forge", "Forge", forgeNavItems)}
            </div>
            {isAdmin && (
              <div className="border-t border-sidebar-border/60 pt-2">
                {renderNavSection("admin", "Admin", [
                  {
                    id: "feedback",
                    label: "Feedback Inbox",
                    icon: MessageSquareMore,
                    description: "Review admin feedback and suggestions",
                  },
                ])}
              </div>
            )}
          </nav>

          {/* Collapse Toggle & User */}
          <div className="border-t border-sidebar-border p-2 space-y-2">
            {/* User Info — clickable to open profile, with notification bell */}
            <button
              className={cn(
                "flex w-full items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent/50 text-left transition-colors hover:bg-sidebar-accent cursor-pointer",
                collapsed && "justify-center",
              )}
              onClick={() => setCurrentView("profile")}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 overflow-hidden shrink-0">
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt={userDisplayName || username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1 text-sm font-medium truncate">
                    {userDisplayName || username}
                  </span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <NotificationBell />
                  </div>
                </>
              )}
            </button>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full hover:text-white hover:bg-destructive/10 cursor-pointer",
                collapsed ? "justify-center" : "justify-start gap-2",
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 text-destructive" />
              {!collapsed && <span>Sign Out</span>}
            </Button>

            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center cursor-pointer"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background relative">
          {/* Mobile Top Bar */}
          {isMobile && (
            <div className="absolute top-3 left-3 right-3 z-40 flex items-center justify-between md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <NotificationBell />
            </div>
          )}

          {/* Mobile Sidebar Menu */}
          {isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="border-b border-sidebar-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 neon-glow-sm overflow-hidden">
                      <Image
                        src="/logo.png"
                        alt="JanitorForge Logo"
                        width={24}
                        height={24}
                      />
                    </div>
                    <div className="flex flex-col">
                      <SheetTitle>JanitorForge (Beta)</SheetTitle>
                      <SheetDescription>Bot Creator Toolkit</SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                {/* Mobile Navigation */}
                <nav className="flex-1 space-y-3 p-2">
                  {renderNavSection("hub", "Hub", hubNavItems)}
                  <div className="border-t border-sidebar-border/60 pt-2">
                    {renderNavSection("forge", "Forge", forgeNavItems)}
                  </div>
                  {isAdmin && (
                    <div className="border-t border-sidebar-border/60 pt-2">
                      {renderNavSection("admin", "Admin", [
                        {
                          id: "feedback",
                          label: "Feedback Inbox",
                          icon: MessageSquareMore,
                          description: "Review admin feedback and suggestions",
                        },
                      ])}
                    </div>
                  )}
                </nav>

                {/* Mobile User & Logout */}
                <div className="border-t border-sidebar-border p-2 space-y-2">
                  {/* Profile — clickable */}
                  <button
                    className="flex w-full items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent/50 text-left transition-colors hover:bg-sidebar-accent cursor-pointer"
                    onClick={() => {
                      handleNavClick("profile");
                    }}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 overflow-hidden shrink-0">
                      {userAvatarUrl ? (
                        <img
                          src={userAvatarUrl}
                          alt={userDisplayName || username}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <span className="flex-1 text-sm font-medium truncate">
                      {userDisplayName || username}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:text-white hover:bg-destructive/10 cursor-pointer justify-start gap-2"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )}

          <div className="h-full pt-16 md:pt-0">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  );
}
