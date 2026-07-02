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
import { ProfilePage } from "@/components/profile/profile-page";
import { FeedbackInbox } from "@/components/dashboard/feedback-inbox";
import ModerationPageContent from "@/app/dashboard/moderation/content";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";

function ResourcesWorkspaceView() {
  return (
    <div className="flex min-h-full items-center justify-center p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-3xl overflow-hidden border-border/70 bg-card/95 shadow-xl">
        <CardContent className="space-y-5 p-6 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookOpen className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="mx-auto w-fit">
              Coming soon
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Janitor Resources
            </h1>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
              This space is reserved for a curated directory of Janitor
              resources, references, and articles.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
    case "workspace":
      return <ResourcesWorkspaceView />;
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
