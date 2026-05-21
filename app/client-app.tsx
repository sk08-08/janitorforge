// ============================================================================
// JanitorForge - Client Application Component
// Client-side app wrapper with providers
// ============================================================================

"use client";

import { StoreProvider, useStore } from "@/lib/store";
import { DashboardLayout } from "@/components/dashboard/layout";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { BotManager } from "@/components/bots/bot-manager";
import { FormManager } from "@/components/forms/form-manager";
import { RequestsView } from "@/components/forms/requests-view";
import { ReleasePostGenerator } from "@/components/release/release-post-generator";
import ModerationPageContent from "@/app/dashboard/moderation/content";
import { TooltipProvider } from "@/components/ui/tooltip";

// ----------------------------------------------------------------------------
// View Router Component
// Renders the appropriate view based on current navigation state
// ----------------------------------------------------------------------------

function ViewRouter() {
  const { currentView } = useStore();

  switch (currentView) {
    case "dashboard":
      return <DashboardHome />;
    case "bots":
      return <BotManager />;
    case "forms":
      return <FormManager />;
    case "requests":
      return <RequestsView />;
    case "moderation":
      return <ModerationPageContent />;
    case "release-generator":
      return <ReleasePostGenerator />;
    default:
      return <DashboardHome />;
  }
}

// ----------------------------------------------------------------------------
// Main Application Content
// ----------------------------------------------------------------------------

function AppContent({ username }: { username: string }) {
  return (
    <DashboardLayout username={username}>
      <ViewRouter />
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------------
// Client App with Providers
// ----------------------------------------------------------------------------

export function ClientApp({ username }: { username: string }) {
  return (
    <TooltipProvider>
      <StoreProvider>
        <AppContent username={username} />
      </StoreProvider>
    </TooltipProvider>
  );
}
