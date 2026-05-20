// ============================================================================
// JanitorForge - Dashboard Layout
// Main layout wrapper with sidebar navigation
// ============================================================================

'use client'

import { type ReactNode } from 'react'
import { 
  LayoutDashboard, 
  Bot, 
  FileText, 
  Inbox, 
  Megaphone,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
  User,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useState } from 'react'
import type { NavigationView } from '@/lib/types'

// ----------------------------------------------------------------------------
// Navigation Configuration
// ----------------------------------------------------------------------------

interface NavItem {
  id: NavigationView
  label: string
  icon: typeof LayoutDashboard
  description: string
}

const navItems: NavItem[] = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard,
    description: 'Overview and quick stats'
  },
  { 
    id: 'bots', 
    label: 'Bot Manager', 
    icon: Bot,
    description: 'Create and manage your bots'
  },
  { 
    id: 'forms', 
    label: 'Request Forms', 
    icon: FileText,
    description: 'Design custom request forms'
  },
  { 
    id: 'requests', 
    label: 'Requests', 
    icon: Inbox,
    description: 'Manage incoming requests'
  },
  { 
    id: 'release-generator', 
    label: 'Release Posts', 
    icon: Megaphone,
    description: 'Generate release announcements'
  },
]

// ----------------------------------------------------------------------------
// Dashboard Layout Component
// ----------------------------------------------------------------------------

interface DashboardLayoutProps {
  children: ReactNode
  username: string
}

export function DashboardLayout({ children, username }: DashboardLayoutProps) {
  const { currentView, setCurrentView, requests } = useStore()
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()
  
  // Count pending requests for badge
  const pendingCount = requests.filter(r => r.status === 'new').length

  const handleLogout = async () => {
    await logout()
    router.push('/login')
    router.refresh()
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={cn(
            'flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
            collapsed ? 'w-16' : 'w-64'
          )}
        >
          {/* Logo */}
          <div className={cn(
            'flex h-16 items-center border-b border-sidebar-border px-4',
            collapsed ? 'justify-center' : 'gap-3'
          )}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 neon-glow-sm">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-semibold text-sidebar-foreground">JanitorForge</span>
                <span className="text-xs text-muted-foreground">Bot Creator Toolkit</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id
              const showBadge = item.id === 'requests' && pendingCount > 0

              const button = (
                <Button
                  key={item.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 transition-all',
                    isActive && 'bg-sidebar-accent text-sidebar-accent-foreground neon-glow-sm',
                    collapsed && 'justify-center px-2'
                  )}
                  onClick={() => setCurrentView(item.id)}
                >
                  <div className="relative">
                    <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                    {showBadge && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <span className="flex-1 text-left">{item.label}</span>
                  )}
                </Button>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.id} delayDuration={0}>
                    <TooltipTrigger asChild>
                      {button}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex flex-col gap-1">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return button
            })}
          </nav>

          {/* Collapse Toggle & User */}
          <div className="border-t border-sidebar-border p-2 space-y-2">
            {/* User Info */}
            <div className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent/50',
              collapsed && 'justify-center'
            )}>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
                <User className="h-4 w-4 text-primary" />
              </div>
              {!collapsed && (
                <span className="flex-1 text-sm font-medium truncate">{username}</span>
              )}
            </div>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10',
                collapsed ? 'justify-center' : 'justify-start gap-2'
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Cerrar Sesion</span>}
            </Button>

            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
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
        <main className="flex-1 overflow-auto bg-background">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
