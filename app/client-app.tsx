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
import { AtlasHub } from "@/components/atlas/atlas-hub";
import { CreatorPages } from "@/components/creator-pages/creator-pages";
import { ProfilePage } from "@/components/profile/profile-page";
import { FeedbackInbox } from "@/components/dashboard/feedback-inbox";
import ModerationPageContent from "@/app/dashboard/moderation/content";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProfilesHub } from "@/components/hub/profiles-hub";
import { ResourcesHub } from "@/components/hub/resources-hub";
import { LogsHub } from "@/components/hub/logs-hub";

function ResourcesHubView() {
  return <ResourcesHub />;
}

function LogsHubView() {
  return <LogsHub />;
}

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
    case "feedback":
      return <FeedbackInbox />;
    case "atlas":
      return <AtlasHub />;
    case "creator-pages":
      return <CreatorPages />;
    case "profiles":
      return <ProfilesHub />;
    case "resources":
      return <ResourcesHubView />;
    case "logs":
      return <LogsHubView />;
    case "profile":
      return <ProfilePage />;
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
