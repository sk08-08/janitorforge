// ============================================================================
// JanitorForge - Admin Feedback Inbox
// Dedicated admin view for suggestions and bug reports
// ============================================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquareMore, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";

type FeedbackType = "suggestion" | "bug";
type FeedbackStatus = "new" | "reviewing" | "resolved" | "closed";

interface FeedbackItem {
  id: string;
  feedback_type: FeedbackType;
  status: FeedbackStatus;
  subject: string;
  message: string;
  source_label: string;
  source_page: string;
  source_path: string;
  related_id: string | null;
  contact: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString();
}

export function FeedbackInbox() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | FeedbackType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>(
    "all",
  );

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const access = await getCurrentUserAccess(supabase);
      setIsAdmin(access.isAdmin);

      if (!access.user || !access.isAdmin) {
        setItems([]);
        return;
      }

      const { data, error } = await supabase
        .from("feedback_submissions")
        .select(
          "id, feedback_type, status, subject, message, source_label, source_page, source_path, related_id, contact, metadata, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Failed to load feedback submissions:", error);
        setItems([]);
        return;
      }

      setItems((data ?? []) as FeedbackItem[]);
    } catch (error) {
      console.error("Error loading feedback inbox:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesType =
          typeFilter === "all" || item.feedback_type === typeFilter;
        const matchesStatus =
          statusFilter === "all" || item.status === statusFilter;
        return matchesType && matchesStatus;
      }),
    [items, typeFilter, statusFilter],
  );

  if (!loading && !isAdmin) {
    return (
      <div className="p-4 sm:p-6 md:p-8 lg:p-10">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            You do not have access to the admin feedback inbox.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquareMore className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Feedback Inbox
              </h1>
              <p className="text-sm text-muted-foreground">
                Review suggestions and bug reports sent by users.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="self-start cursor-pointer sm:mt-0"
          onClick={loadFeedback}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card className="border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Narrow the inbox by type or status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Type</p>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as any)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="suggestion">Suggestions</SelectItem>
                <SelectItem value="bug">Bug reports</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Status</p>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as any)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            Loading feedback submissions...
          </CardContent>
        </Card>
      ) : filteredItems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="space-y-3 pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <CardTitle className="line-clamp-2 text-base leading-snug">
                    {item.subject}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Badge
                      variant={
                        item.feedback_type === "bug"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {item.feedback_type === "bug" ? "Bug" : "Suggestion"}
                    </Badge>
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                </div>
                <CardDescription className="text-xs break-words">
                  {item.source_label || "Unknown source"} ·{" "}
                  {formatDate(item.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-4 text-sm text-muted-foreground">
                  {item.message}
                </p>
                {item.contact && (
                  <p className="text-xs text-muted-foreground break-all">
                    Contact: {item.contact}
                  </p>
                )}
                <Button
                  variant="outline"
                  className="w-full cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  View details
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            No feedback matches the current filters.
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:max-w-4xl sm:p-6">
          {selectedItem && (
            <>
              <DialogHeader>
                <div className="flex mt-4 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <DialogTitle className="text-xl leading-snug">
                      {selectedItem.subject}
                    </DialogTitle>
                    <DialogDescription className="break-words">
                      {selectedItem.source_label || "Unknown source"} ·{" "}
                      {formatDate(selectedItem.created_at)}
                    </DialogDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Badge
                      variant={
                        selectedItem.feedback_type === "bug"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {selectedItem.feedback_type === "bug"
                        ? "Bug"
                        : "Suggestion"}
                    </Badge>
                    <Badge variant="outline">{selectedItem.status}</Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
                <Card className="border-border/70">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Message</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {selectedItem.message}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/70">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Source page
                      </p>
                      <p className="break-words">
                        {selectedItem.source_page || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Source path
                      </p>
                      <p className="break-all">
                        {selectedItem.source_path || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Related ID
                      </p>
                      <p className="break-all">
                        {selectedItem.related_id || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Contact
                      </p>
                      <p className="break-all">{selectedItem.contact || "-"}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {Array.isArray(selectedItem.metadata?.images) &&
                (
                  selectedItem.metadata.images as Array<{
                    name?: string;
                    size?: number;
                    dataUrl?: string;
                  }>
                ).length > 0 && (
                  <Card className="border-border/70">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Attached images
                      </CardTitle>
                      <CardDescription>
                        Images are stored in the feedback payload and shown here
                        directly.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {(
                          selectedItem.metadata.images as Array<{
                            name?: string;
                            size?: number;
                            dataUrl?: string;
                          }>
                        ).map((image, index) =>
                          image.dataUrl ? (
                            <div
                              key={`${selectedItem.id}-${index}`}
                              className="overflow-hidden rounded-lg border"
                            >
                              <img
                                src={image.dataUrl}
                                alt={image.name || `Attachment ${index + 1}`}
                                className="h-44 w-full object-cover"
                              />
                              <div className="space-y-1 p-3 text-xs text-muted-foreground">
                                <p className="truncate font-medium text-foreground">
                                  {image.name || `Attachment ${index + 1}`}
                                </p>
                                {typeof image.size === "number" && (
                                  <p>{Math.round(image.size / 1024)} KB</p>
                                )}
                              </div>
                            </div>
                          ) : null,
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
