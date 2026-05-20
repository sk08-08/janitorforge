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
} from 'lucide-react'
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
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { currentView, setCurrentView, requests } = useStore()
  const [collapsed, setCollapsed] = useState(false)
  
  // Count pending requests for badge
  const pendingCount = requests.filter(r => r.status === 'new').length

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

          {/* Collapse Toggle */}
          <div className="border-t border-sidebar-border p-2">
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
