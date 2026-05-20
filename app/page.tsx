// ============================================================================
// JanitorForge - Main Application Page
// Entry point that renders the dashboard with dynamic views
// ============================================================================

'use client'

import { StoreProvider, useStore } from '@/lib/store'
import { DashboardLayout } from '@/components/dashboard/layout'
import { DashboardHome } from '@/components/dashboard/dashboard-home'
import { BotManager } from '@/components/bots/bot-manager'
import { FormManager } from '@/components/forms/form-manager'
import { RequestsView } from '@/components/forms/requests-view'
import { ReleasePostGenerator } from '@/components/release/release-post-generator'
import { TooltipProvider } from '@/components/ui/tooltip'

// ----------------------------------------------------------------------------
// View Router Component
// Renders the appropriate view based on current navigation state
// ----------------------------------------------------------------------------

function ViewRouter() {
  const { currentView } = useStore()

  switch (currentView) {
    case 'dashboard':
      return <DashboardHome />
    case 'bots':
      return <BotManager />
    case 'forms':
      return <FormManager />
    case 'requests':
      return <RequestsView />
    case 'release-generator':
      return <ReleasePostGenerator />
    default:
      return <DashboardHome />
  }
}

// ----------------------------------------------------------------------------
// Main Application Content
// ----------------------------------------------------------------------------

function AppContent() {
  return (
    <DashboardLayout>
      <ViewRouter />
    </DashboardLayout>
  )
}

// ----------------------------------------------------------------------------
// Page Component with Providers
// ----------------------------------------------------------------------------

export default function Page() {
  return (
    <TooltipProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </TooltipProvider>
  )
}
