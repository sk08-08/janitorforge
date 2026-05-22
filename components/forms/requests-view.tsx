// ============================================================================
// JanitorForge - Requests View
// Kanban board view for managing incoming requests
// ============================================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Inbox, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KanbanBoard } from "./kanban-board";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import type { RequestStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";

function EmptyState() {
  const { setCurrentView } = useStore();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mt-6 text-xl font-semibold">No requests yet</h3>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Share your forms with your community to start receiving bot requests.
      </p>
      <Button
        className="mt-6 cursor-pointer"
        variant="outline"
        onClick={() => setCurrentView("forms")}
      >
        <LayoutGrid className="mr-2 h-4 w-4" />
        Manage Forms
      </Button>
    </div>
  );
}

export function RequestsView() {
  const { requests, forms, updateRequestStatus, deleteRequest } = useStore();
  const [filterFormId, setFilterFormId] = useState<string>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessLoaded, setAccessLoaded] = useState(false);

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

  const matchesFilter = (requestFormId: string) =>
    filterFormId === "all" || requestFormId === filterFormId;

  const isOwnRequest = (requestFormId: string) => {
    if (!currentUserId) return true;
    const ownerId = formOwnerMap.get(requestFormId);
    return !ownerId || ownerId === currentUserId;
  };

  const ownRequests = requests.filter(
    (request) => matchesFilter(request.formId) && isOwnRequest(request.formId),
  );
  const otherRequests = requests.filter(
    (request) => matchesFilter(request.formId) && !isOwnRequest(request.formId),
  );

  const hasVisibleRequests = ownRequests.length > 0 || otherRequests.length > 0;

  const handleStatusChange = (
    requestId: string,
    status: RequestStatus,
    notes?: string,
  ) => {
    updateRequestStatus(requestId, status, notes);
    const statusLabels: Record<RequestStatus, string> = {
      new: "New",
      accepted: "In Progress",
      completed: "Completed",
      rejected: "Rejected",
    };
    toast.success(`Request moved to ${statusLabels[status]}`);
  };

  const handleDelete = (requestId: string) => {
    deleteRequest(requestId);
    toast.success("Request deleted");
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Requests
          </h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
            Manage incoming bot requests with the Kanban board
          </p>
        </div>

        {forms.length > 0 && (
          <Select value={filterFormId} onValueChange={setFilterFormId}>
            <SelectTrigger className="w-full sm:w-auto">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by form" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Forms</SelectItem>
              {forms.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  {form.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!accessLoaded ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading request access...
          </CardContent>
        </Card>
      ) : hasVisibleRequests ? (
        <div className="space-y-8">
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">My requests</h2>
                <p className="text-sm text-muted-foreground">
                  Requests that belong to your own forms.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {ownRequests.length} total
              </p>
            </div>

            {ownRequests.length > 0 ? (
              <KanbanBoard
                requests={ownRequests}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No requests in this section.
                </CardContent>
              </Card>
            )}
          </section>

          {isAdmin && (
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Other accounts</h2>
                  <p className="text-sm text-muted-foreground">
                    Requests from forms owned by other users.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {otherRequests.length} total
                </p>
              </div>

              {otherRequests.length > 0 ? (
                <KanbanBoard
                  requests={otherRequests}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No requests from other accounts yet.
                  </CardContent>
                </Card>
              )}
            </section>
          )}
        </div>
      ) : requests.length > 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No requests match the selected filter
            </p>
            <Button variant="link" onClick={() => setFilterFormId("all")}>
              View all requests
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <EmptyState />
        </Card>
      )}
    </div>
  );
}
