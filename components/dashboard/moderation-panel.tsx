// ============================================================================
// JanitorForge - Moderation Panel
// Review and manage flagged form submissions
// ============================================================================

"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  AlertCircle,
  Ban,
  Copy,
  RefreshCw,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getFlaggedRequestsForForm,
  markFlaggedAsReviewed,
  blockIpAddress,
} from "@/app/actions/safety";
import type { ContentFilterResult } from "@/lib/content-filter";
import { CustomBlocklist } from "./custom-blocklist";
import { SensitivityLevelSettings } from "./sensitivity-level";
import { Checkbox } from "@/components/ui/checkbox";

interface FlaggedRequest {
  id: string;
  form_id: string;
  request_id: string;
  risk_level: "warning" | "dangerous";
  flagged_fields: Record<string, ContentFilterResult>;
  reason?: string;
  reviewed: boolean;
  review_action?: "approved" | "rejected";
  review_notes?: string;
  created_at: string;
}

interface ModerationPanelProps {
  formId: string;
  formTitle?: string;
}

function RiskBadge({ level }: { level: "warning" | "dangerous" }) {
  if (level === "dangerous") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Dangerous
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <AlertCircle className="h-3 w-3" />
      Warning
    </Badge>
  );
}

function FlaggedFieldsViewer({
  flaggedFields,
}: {
  flaggedFields: Record<string, ContentFilterResult>;
}) {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const toggleExpand = (fieldName: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {Object.entries(flaggedFields).map(([fieldName, result]) => (
        <div key={fieldName} className="border rounded-lg p-3 bg-muted/50">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleExpand(fieldName)}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{fieldName}</span>
              <Badge variant="outline" className="text-xs">
                {result.flags.length} flags
              </Badge>
            </div>
            {expandedFields.has(fieldName) ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {expandedFields.has(fieldName) && (
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex flex-wrap gap-1">
                {result.flags.map((flag) => (
                  <Badge key={flag} variant="outline" className="text-xs">
                    {flag}
                  </Badge>
                ))}
              </div>
              {result.reason && (
                <p className="text-muted-foreground text-xs italic">
                  "{result.reason}"
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ReviewFlaggedDialog({
  flagged,
  onApprove,
  onReject,
}: {
  flagged: FlaggedRequest;
  onApprove: (notes?: string) => Promise<void>;
  onReject: (notes?: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove(notes);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject(notes);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Review Flagged Submission</DialogTitle>
        <DialogDescription>
          Risk Level: <RiskBadge level={flagged.risk_level} />
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        <div>
          <h4 className="font-medium text-sm mb-2">Reason for Flag</h4>
          <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
            {flagged.reason || "No specific reason provided"}
          </p>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-2">Flagged Fields</h4>
          <FlaggedFieldsViewer flaggedFields={flagged.flagged_fields} />
        </div>

        <div>
          <Label htmlFor="review-notes" className="text-sm font-medium">
            Review Notes (Optional)
          </Label>
          <Textarea
            id="review-notes"
            placeholder="Add notes about your decision..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 text-sm"
            rows={3}
          />
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button
          variant="destructive"
          onClick={handleReject}
          disabled={isProcessing}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
        <Button
          variant="default"
          onClick={handleApprove}
          disabled={isProcessing}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Approve
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function BlockIpDialog({
  ipAddress,
  onBlock,
}: {
  ipAddress: string;
  onBlock: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBlock = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for blocking");
      return;
    }

    setIsProcessing(true);
    try {
      await onBlock(reason);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Block IP Address</DialogTitle>
        <DialogDescription>
          Are you sure you want to block this IP?
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">IP Address</Label>
          <div className="mt-1 p-2 bg-muted rounded font-mono text-sm">
            {ipAddress}
          </div>
        </div>

        <div>
          <Label htmlFor="block-reason" className="text-sm font-medium">
            Reason for Blocking
          </Label>
          <Textarea
            id="block-reason"
            placeholder="e.g., Multiple abusive submissions, contains threatening content..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 text-sm"
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="destructive"
          onClick={handleBlock}
          disabled={isProcessing}
        >
          <Ban className="mr-2 h-4 w-4" />
          Block IP
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function ModerationPanel({ formId, formTitle }: ModerationPanelProps) {
  const [flaggedRequests, setFlaggedRequests] = useState<FlaggedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "warning" | "dangerous">("all");
  const [selectedFlagged, setSelectedFlagged] = useState<FlaggedRequest | null>(
    null,
  );
  const [blockingIp, setBlockingIp] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadFlaggedRequests();
  }, [formId]);

  const loadFlaggedRequests = async () => {
    setLoading(true);
    try {
      const result = await getFlaggedRequestsForForm(formId);
      if (result.success && result.flaggedRequests) {
        setFlaggedRequests(result.flaggedRequests);
      }
    } catch (error) {
      console.error("Failed to load flagged requests:", error);
      toast.error("Failed to load flagged requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (flaggedId: string, notes?: string) => {
    try {
      const result = await markFlaggedAsReviewed(flaggedId, "approved", notes);
      if (result.success) {
        toast.success("Submission approved");
        setSelectedFlagged(null);
        await loadFlaggedRequests();
      } else {
        toast.error(result.error || "Failed to approve");
      }
    } catch (error) {
      console.error("Error approving:", error);
      toast.error("Failed to approve submission");
    }
  };

  const handleReject = async (flaggedId: string, notes?: string) => {
    try {
      const result = await markFlaggedAsReviewed(flaggedId, "rejected", notes);
      if (result.success) {
        toast.success("Submission rejected");
        setSelectedFlagged(null);
        await loadFlaggedRequests();
      } else {
        toast.error(result.error || "Failed to reject");
      }
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error("Failed to reject submission");
    }
  };

  const handleBlockIp = async (ipAddress: string, reason: string) => {
    try {
      const result = await blockIpAddress(formId, ipAddress, reason);
      if (result.success) {
        toast.success(`IP ${ipAddress} blocked`);
        setBlockingIp(null);
      } else {
        toast.error(result.error || "Failed to block IP");
      }
    } catch (error) {
      console.error("Error blocking IP:", error);
      toast.error("Failed to block IP");
    }
  };

  const toggleSelectId = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.map((r) => r.id)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    setBulkProcessing(true);
    let successful = 0;
    let failed = 0;

    for (const id of selectedIds) {
      try {
        const result = await markFlaggedAsReviewed(id, "approved");
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    setBulkProcessing(false);
    setSelectedIds(new Set());
    await loadFlaggedRequests();

    if (failed === 0) {
      toast.success(
        `Approved ${successful} submission${successful !== 1 ? "s" : ""}`,
      );
    } else {
      toast.warning(
        `Approved ${successful}, failed ${failed}. Please try again for failures.`,
      );
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;

    setBulkProcessing(true);
    let successful = 0;
    let failed = 0;

    for (const id of selectedIds) {
      try {
        const result = await markFlaggedAsReviewed(id, "rejected");
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    setBulkProcessing(false);
    setSelectedIds(new Set());
    await loadFlaggedRequests();

    if (failed === 0) {
      toast.success(
        `Rejected ${successful} submission${successful !== 1 ? "s" : ""}`,
      );
    } else {
      toast.warning(
        `Rejected ${successful}, failed ${failed}. Please try again for failures.`,
      );
    }
  };

  const filteredRequests = flaggedRequests.filter((req) => {
    if (filter === "all") return true;
    return req.risk_level === filter;
  });

  const stats = {
    total: flaggedRequests.length,
    pending: flaggedRequests.filter((r) => !r.reviewed).length,
    dangerous: flaggedRequests.filter((r) => r.risk_level === "dangerous")
      .length,
    warnings: flaggedRequests.filter((r) => r.risk_level === "warning").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Flagged</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">
              {stats.warnings}
            </div>
            <p className="text-xs text-muted-foreground">Warnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {stats.dangerous}
            </div>
            <p className="text-xs text-muted-foreground">Dangerous</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Refresh & Bulk Actions */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          <Select
            value={filter}
            onValueChange={(value: any) => setFilter(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="warning">Warnings</SelectItem>
              <SelectItem value="dangerous">Dangerous</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="cursor-pointer"
            onClick={loadFlaggedRequests}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? "Hide Settings" : "Show Settings"}
          </Button>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedIds.size} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkApprove}
                    disabled={bulkProcessing}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve All
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkReject}
                    disabled={bulkProcessing}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject All
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds(new Set())}
                    disabled={bulkProcessing}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="space-y-4">
          <SensitivityLevelSettings formId={formId} formTitle={formTitle} />
          <CustomBlocklist formId={formId} formTitle={formTitle} />
        </div>
      )}

      {/* Flagged Requests List */}
      <div className="space-y-2">
        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Loading flagged requests...
            </CardContent>
          </Card>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {stats.total === 0
                ? "No flagged submissions yet. Great job!"
                : "No submissions match the current filter."}
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((flagged) => (
            <Card
              key={flagged.id}
              className={`${
                flagged.reviewed ? "opacity-60" : ""
              } hover:shadow-md transition-shadow`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {!flagged.reviewed && (
                      <Checkbox
                        checked={selectedIds.has(flagged.id)}
                        onCheckedChange={() => toggleSelectId(flagged.id)}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <RiskBadge level={flagged.risk_level} />
                        {flagged.reviewed && (
                          <Badge variant="outline">
                            {flagged.review_action === "approved" ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approved
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Rejected
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(flagged.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {!flagged.reviewed && (
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedFlagged(flagged)}
                          >
                            Review
                          </Button>
                        </DialogTrigger>
                        {selectedFlagged?.id === flagged.id && (
                          <ReviewFlaggedDialog
                            flagged={flagged}
                            onApprove={(notes) =>
                              handleApprove(flagged.id, notes)
                            }
                            onReject={(notes) =>
                              handleReject(flagged.id, notes)
                            }
                          />
                        )}
                      </Dialog>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {flagged.reason && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Reason
                    </p>
                    <p className="text-sm bg-muted p-2 rounded">
                      {flagged.reason}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Flagged Fields ({Object.keys(flagged.flagged_fields).length}
                    )
                  </p>
                  <FlaggedFieldsViewer flaggedFields={flagged.flagged_fields} />
                </div>

                {flagged.review_notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Review Notes
                    </p>
                    <p className="text-sm italic text-muted-foreground">
                      "{flagged.review_notes}"
                    </p>
                  </div>
                )}

                {flagged.reviewed && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setBlockingIp("0.0.0.0")} // Placeholder
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Block IP
                        </Button>
                      </DialogTrigger>
                      {blockingIp && (
                        <BlockIpDialog
                          ipAddress={blockingIp}
                          onBlock={(reason) =>
                            handleBlockIp(blockingIp, reason)
                          }
                        />
                      )}
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
