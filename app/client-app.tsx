// ============================================================================
// JanitorForge - Client Application Component
// Client-side app wrapper with providers
// ============================================================================

"use client";

import { StoreProvider, useStore } from "@/features/app-shell/store/app-store";
import { DashboardLayout } from "@/features/dashboard/components/layout";
import { DashboardHome } from "@/features/dashboard/components/dashboard-home";
import { AdminPanel } from "@/features/admin/components/admin-panel";
import { BotManager } from "@/features/bots/components/bot-manager";
import { FormManager } from "@/features/forms/components/form-manager";
import { RequestsView } from "@/features/forms/components/submissions/requests-view";
import { AtlasHub } from "@/features/atlas/components/atlas-hub";
import { CreatorPages } from "@/features/creator-pages/components/creator-pages";
import { ProfilePage } from "@/features/profile/components/profile-page";
import { FeedbackInbox } from "@/features/feedback/components/feedback-inbox";
import ModerationPageContent from "@/app/dashboard/moderation/content";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProfilesHub } from "@/features/hub/components/profiles-hub";
import { ResourcesHub } from "@/features/hub/components/resources-hub";
import { CommunityHub } from "@/features/hub/components/community-hub";

function ResourcesHubView() {
  return <ResourcesHub />;
}

function CommunityHubView() {
  return <CommunityHub />;
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
    case "community":
      return <CommunityHubView />;
    case "profile":
      return <ProfilePage />;
    case "admin":
      return <AdminPanel />;
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
