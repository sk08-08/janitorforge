// ============================================================================
// JanitorForge - Submissions View
// Kanban board view for managing incoming submissions
// ============================================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Inbox, LayoutGrid, Download, FileDown } from "lucide-react";
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
import {
  exportToCsv,
  exportToJson,
  transformSubmissionsForExport,
} from "@/lib/form-export";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
        Share your forms with your community to start receiving submissions.
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
  const [accessLoaded, setAccessLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const supabase = createClient();
        const access = await getCurrentUserAccess(supabase);
        if (!mounted) return;
        setCurrentUserId(access.user?.id ?? null);
      } catch {
        if (!mounted) return;
        setCurrentUserId(null);
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
    if (!currentUserId) return false;
    const ownerId = formOwnerMap.get(requestFormId);
    return ownerId === currentUserId;
  };

  const filteredRequests = requests.filter((request) =>
    matchesFilter(request.formId),
  );
  const selectedFormOwnerId =
    filterFormId === "all" ? null : (formOwnerMap.get(filterFormId) ?? null);
  const isSelectedFormOwn =
    filterFormId === "all" ||
    !currentUserId ||
    !selectedFormOwnerId ||
    selectedFormOwnerId === currentUserId;

  const showOwnRequestsSection = filterFormId === "all" || isSelectedFormOwn;

  const ownRequests =
    filterFormId === "all"
      ? currentUserId
        ? filteredRequests.filter(
            (request) =>
              request.ownerId === currentUserId || isOwnRequest(request.formId),
          )
        : filteredRequests
      : isSelectedFormOwn
        ? filteredRequests.filter(
            (request) =>
              request.ownerId === currentUserId || isOwnRequest(request.formId),
          )
        : [];

  const hasVisibleRequests = ownRequests.length > 0;

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

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [selectedExportFormId, setSelectedExportFormId] = useState<string>("");

  // Only user's own forms for export
  const ownForms = useMemo(
    () => forms.filter((f) => !currentUserId || f.ownerId === currentUserId),
    [forms, currentUserId],
  );

  const openExportDialog = (format: "csv" | "json") => {
    setExportFormat(format);
    if (ownForms.length === 1) {
      // If only one form, export directly
      doExport(ownForms[0].id, format);
    } else if (ownForms.length > 1) {
      // Pre-select current filter if it's a user form
      const preSelected =
        filterFormId !== "all" && ownForms.some((f) => f.id === filterFormId)
          ? filterFormId
          : "";
      setSelectedExportFormId(preSelected);
      setExportDialogOpen(true);
    } else {
      toast.error("No forms to export");
    }
  };

  const doExport = (formId: string, format: "csv" | "json") => {
    const form = forms.find((f) => f.id === formId);
    if (!form) return;

    // Only export submissions for this specific form
    const formRequests = requests.filter((r) => r.formId === formId);
    if (formRequests.length === 0) {
      toast.error("No submissions to export for this form");
      return;
    }

    const data = transformSubmissionsForExport(
      formRequests.map((r) => ({
        created_at: r.createdAt ? new Date(r.createdAt).toISOString() : "",
        status: r.status,
        submitter_name: r.submitterName,
        responses: r.responses as Record<string, unknown>,
        response_labels: r.responseLabels as Record<string, string>,
      })),
    );

    const safeName = form.title
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `requests-${safeName}-${timestamp}`;

    if (format === "csv") {
      exportToCsv(data, `${filename}.csv`);
    } else {
      exportToJson(data, `${filename}.json`);
    }
    setExportDialogOpen(false);
    toast.success(
      `Exported ${data.length} submissions as ${format.toUpperCase()}`,
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Submissions
          </h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
            Manage incoming submissions with the Kanban board
          </p>
        </div>

        <div className="flex items-center gap-2">
          {ownForms.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => openExportDialog("csv")}
              >
                <FileDown className="mr-1 h-3.5 w-3.5" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => openExportDialog("json")}
              >
                <FileDown className="mr-1 h-3.5 w-3.5" />
                JSON
              </Button>
            </>
          )}
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
      </div>

      {!accessLoaded ? (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">Loading submissions…</p>
          </div>
        </div>
      ) : hasVisibleRequests ? (
        <KanbanBoard
          requests={ownRequests}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          collapseStateKey="kanban-collapsed-requests"
        />
      ) : requests.length > 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No submissions match the selected filter
            </p>
            <Button variant="link" onClick={() => setFilterFormId("all")}>
              View all submissions
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <EmptyState />
        </Card>
      )}

      {/* Export Dialog - Select which form to export */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Export Submissions</DialogTitle>
            <DialogDescription>
              Select which form to export. Only your own forms are available.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select
              value={selectedExportFormId}
              onValueChange={setSelectedExportFormId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a form..." />
              </SelectTrigger>
              <SelectContent>
                {ownForms.map((form) => {
                  const count = requests.filter(
                    (r) => r.formId === form.id,
                  ).length;
                  return (
                    <SelectItem key={form.id} value={form.id}>
                      {form.title} ({count} requests)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              disabled={!selectedExportFormId}
              onClick={() => doExport(selectedExportFormId, exportFormat)}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export {exportFormat.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
