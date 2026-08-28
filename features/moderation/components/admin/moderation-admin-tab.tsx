"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Eye,
  RefreshCw,
  Shield,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  adminBlockIpAddress,
  adminReviewFlaggedRequest,
  adminUnblockIpAddress,
  getAdminBlockedIps,
  getAdminModerationFlags,
  getAdminModerationForms,
  getAdminModerationStats,
  type StaffRole,
} from "@/features/admin/actions/admin";
import { CustomBlocklist } from "@/features/moderation/components/custom-blocklist";
import { GlobalBlocklist } from "@/features/moderation/components/global-blocklist";
import { SensitivityLevelSettings } from "@/features/moderation/components/sensitivity-level";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";
import { cn, formatDateTime } from "@/lib/utils";

type ModerationStats = {
  open_flags: number;
  dangerous_open_flags: number;
  blocked_ips: number;
  global_block_patterns: number;
  custom_block_patterns: number;
  high_security_forms: number;
};

type ModerationForm = {
  id: string;
  title: string;
  user_id: string;
  security_sensitivity: string;
  is_active: boolean;
  updated_at: string;
  owner: {
    id: string;
    username: string | null;
    display_name: string | null;
  } | null;
};

type ModerationFlag = {
  id: string;
  form_id: string;
  request_id: string;
  risk_level: "warning" | "dangerous";
  flagged_fields: Record<string, unknown>;
  reason: string | null;
  reviewed: boolean;
  review_action: "approved" | "rejected" | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  form: {
    id: string;
    title: string;
    user_id: string;
  } | null;
  request: {
    id: string;
    submitter_name: string | null;
    ip_address: string | null;
  } | null;
  owner: {
    id: string;
    username: string | null;
    display_name: string | null;
  } | null;
};

type BlockedIpItem = {
  id: string;
  form_id: string;
  ip_address: string;
  reason: string;
  blocked_at: string;
  form: {
    id: string;
    title: string;
    user_id: string;
  } | null;
};

function RiskBadge({ level }: { level: "warning" | "dangerous" }) {
  return (
    <Badge
      variant={level === "dangerous" ? "destructive" : "secondary"}
      className="text-xs"
    >
      {level === "dangerous" ? "Dangerous" : "Warning"}
    </Badge>
  );
}

export function ModerationAdminTab({ staffRole }: { staffRole: StaffRole }) {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [forms, setForms] = useState<ModerationForm[]>([]);
  const [flags, setFlags] = useState<ModerationFlag[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("queue");

  const [riskFilter, setRiskFilter] = useState<"all" | "warning" | "dangerous">(
    "all",
  );
  const [reviewFilter, setReviewFilter] = useState<"open" | "reviewed" | "all">(
    "open",
  );
  const [flagSearch, setFlagSearch] = useState("");

  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [ipSearch, setIpSearch] = useState("");
  const [manualBlockFormId, setManualBlockFormId] = useState("");
  const [manualBlockIp, setManualBlockIp] = useState("");
  const [manualBlockReason, setManualBlockReason] = useState("");

  const [reviewingFlag, setReviewingFlag] = useState<ModerationFlag | null>(
    null,
  );
  const [reviewNotes, setReviewNotes] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const isOwner = staffRole === "owner";

  const loadStats = useCallback(async () => {
    const result = await getAdminModerationStats();
    if (result.success) {
      setStats(result.stats as ModerationStats);
    }
  }, []);

  const loadForms = useCallback(async () => {
    const result = await getAdminModerationForms();
    if (!result.success) {
      toast.error(result.error || "Failed to load moderation forms");
      setForms([]);
      return;
    }

    const items = (result.items || []) as ModerationForm[];
    setForms(items);

    if (!selectedFormId && items.length > 0) {
      setSelectedFormId(items[0].id);
      setManualBlockFormId(items[0].id);
    }
  }, [selectedFormId]);

  const loadFlags = useCallback(async () => {
    const result = await getAdminModerationFlags({
      riskLevel: riskFilter,
      reviewed: reviewFilter,
      limit: 150,
    });

    if (!result.success) {
      toast.error(result.error || "Failed to load moderation queue");
      setFlags([]);
      return;
    }

    setFlags((result.items || []) as ModerationFlag[]);
  }, [riskFilter, reviewFilter]);

  const loadBlockedIps = useCallback(async () => {
    const result = await getAdminBlockedIps({ limit: 200, search: ipSearch });
    if (!result.success) {
      toast.error(result.error || "Failed to load blocked IPs");
      setBlockedIps([]);
      return;
    }
    setBlockedIps((result.items || []) as BlockedIpItem[]);
  }, [ipSearch]);

  const loadBase = useCallback(async () => {
    setLoading(true);

    try {
      await Promise.all([loadStats(), loadForms()]);
    } finally {
      setLoading(false);
    }
  }, [loadStats, loadForms]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadBlockedIps();
    }, 220);
    return () => clearTimeout(timeout);
  }, [ipSearch, loadBlockedIps]);

  useEffect(() => {
    if (
      staffRole === "moderator" &&
      (activeTab === "form-security" || activeTab === "global-rules")
    ) {
      setActiveTab("queue");
    }
  }, [staffRole, activeTab]);

  const selectedForm = useMemo(
    () => forms.find((form) => form.id === selectedFormId) || null,
    [forms, selectedFormId],
  );

  const filteredFlags = useMemo(() => {
    const query = flagSearch.trim().toLowerCase();
    if (!query) return flags;

    return flags.filter((flag) => {
      const haystack = [
        flag.form?.title || "",
        flag.owner?.username || "",
        flag.request?.submitter_name || "",
        flag.request?.ip_address || "",
        flag.reason || "",
        flag.request_id,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [flags, flagSearch]);

  const openFlagsForSelectedForm = useMemo(() => {
    if (!selectedFormId) return 0;
    return flags.filter(
      (flag) => flag.form_id === selectedFormId && flag.reviewed === false,
    ).length;
  }, [flags, selectedFormId]);

  const handleReviewAction = async (action: "approved" | "rejected") => {
    if (!reviewingFlag) return;

    setSubmittingAction(true);
    const result = await adminReviewFlaggedRequest(
      reviewingFlag.id,
      action,
      reviewNotes,
    );
    setSubmittingAction(false);

    if (!result.success) {
      toast.error(result.error || "Failed to save review");
      return;
    }

    toast.success(action === "approved" ? "Flag approved" : "Flag rejected");
    setReviewingFlag(null);
    setReviewNotes("");
    await Promise.all([loadFlags(), loadStats()]);
  };

  const handleBlockIpFromFlag = async () => {
    if (!reviewingFlag?.request?.ip_address) return;

    setSubmittingAction(true);
    const result = await adminBlockIpAddress(
      reviewingFlag.form_id,
      reviewingFlag.request.ip_address,
      reviewNotes.trim() ||
        reviewingFlag.reason ||
        "Blocked by admin moderation",
    );
    setSubmittingAction(false);

    if (!result.success) {
      toast.error(result.error || "Failed to block IP");
      return;
    }

    toast.success("IP blocked");
    await Promise.all([loadBlockedIps(), loadStats()]);
  };

  const handleManualBlockIp = async () => {
    const formId = manualBlockFormId || selectedFormId;
    const ipAddress = manualBlockIp.trim();
    const reason = manualBlockReason.trim() || "Blocked by admin";

    if (!formId || !ipAddress) {
      toast.error("Form and IP are required");
      return;
    }

    const result = await adminBlockIpAddress(formId, ipAddress, reason);
    if (!result.success) {
      toast.error(result.error || "Failed to block IP");
      return;
    }

    toast.success("IP blocked");
    setManualBlockIp("");
    setManualBlockReason("");
    await Promise.all([loadBlockedIps(), loadStats()]);
  };

  const handleUnblockIp = async (id: string) => {
    const result = await adminUnblockIpAddress(id);
    if (!result.success) {
      toast.error(result.error || "Failed to unblock IP");
      return;
    }

    toast.success("IP unblocked");
    await Promise.all([loadBlockedIps(), loadStats()]);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-gradient-to-br from-card via-card to-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shield className="h-5 w-5 text-primary" /> Platform Moderation &
            Security
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? "Review platform moderation, manage security controls, global rules, and IP restrictions."
              : "Review flagged submissions and manage IP restrictions across the platform."}
          </p>
        </CardHeader>
        <CardContent
          className={cn(
            "grid gap-3 sm:grid-cols-2",
            isOwner ? "lg:grid-cols-3 xl:grid-cols-6" : "lg:grid-cols-3",
          )}
        >
          <div className="rounded-xl border border-border/60 bg-card/80 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Open flags
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {stats?.open_flags ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
            <p className="text-xs uppercase tracking-wide text-red-600">
              Dangerous
            </p>
            <p className="mt-1 text-2xl font-semibold text-red-600">
              {stats?.dangerous_open_flags ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-xs uppercase tracking-wide text-amber-600">
              Blocked IPs
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">
              {stats?.blocked_ips ?? 0}
            </p>
          </div>
          {isOwner && (
            <>
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
                <p className="text-xs uppercase tracking-wide text-blue-600">
                  Global rules
                </p>
                <p className="mt-1 text-2xl font-semibold text-blue-600">
                  {stats?.global_block_patterns ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
                <p className="text-xs uppercase tracking-wide text-violet-600">
                  Custom rules
                </p>
                <p className="mt-1 text-2xl font-semibold text-violet-600">
                  {stats?.custom_block_patterns ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-600">
                  High security forms
                </p>
                <p className="mt-1 text-2xl font-semibold text-emerald-600">
                  {stats?.high_security_forms ?? 0}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="grid h-auto w-full gap-1 p-1 sm:w-auto sm:grid-cols-none sm:flex">
            <TabsTrigger value="queue" className="cursor-pointer">
              Flag Queue
            </TabsTrigger>

            {isOwner && (
              <TabsTrigger value="form-security" className="cursor-pointer">
                Form Security
              </TabsTrigger>
            )}

            {isOwner && (
              <TabsTrigger value="global-rules" className="cursor-pointer">
                Global Rules
              </TabsTrigger>
            )}

            <TabsTrigger value="ip-firewall" className="cursor-pointer">
              IP Firewall
            </TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="icon"
            className="cursor-pointer"
            onClick={() => {
              void (async () => {
                setLoading(true);

                try {
                  await Promise.all([
                    loadStats(),
                    loadForms(),
                    loadFlags(),
                    loadBlockedIps(),
                  ]);
                } finally {
                  setLoading(false);
                }
              })();
            }}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Global Flag Queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <SearchInput
                  value={flagSearch}
                  onChange={setFlagSearch}
                  placeholder="Search by form, submitter, IP, reason"
                  className="w-full sm:max-w-sm"
                  debounce={180}
                  shortcutKey="/"
                />
                <Select
                  value={riskFilter}
                  onValueChange={(value) =>
                    setRiskFilter(value as "all" | "warning" | "dangerous")
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All risk levels</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="dangerous">Dangerous</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={reviewFilter}
                  onValueChange={(value) =>
                    setReviewFilter(value as "open" | "reviewed" | "all")
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Review" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open only</SelectItem>
                    <SelectItem value="reviewed">Reviewed only</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Risk</TableHead>
                      <TableHead>Form</TableHead>
                      <TableHead>Submitter</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFlags.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No moderation flags match current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFlags.map((flag) => {
                        const ownerLabel =
                          flag.owner?.username ||
                          flag.owner?.display_name ||
                          "unknown";
                        return (
                          <TableRow key={flag.id}>
                            <TableCell>
                              <RiskBadge level={flag.risk_level} />
                            </TableCell>
                            <TableCell className="max-w-56">
                              <p className="truncate text-sm font-medium">
                                {stripMarkdownToText(
                                  flag.form?.title || "Untitled form",
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                @{ownerLabel}
                              </p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {flag.request?.submitter_name || "-"}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {flag.request?.ip_address || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDateTime(flag.created_at)}
                            </TableCell>
                            <TableCell>
                              {flag.reviewed ? (
                                <Badge variant="outline" className="text-xs">
                                  {flag.review_action || "Reviewed"}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Open
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => {
                                  setReviewingFlag(flag);
                                  setReviewNotes(flag.review_notes || "");
                                }}
                              >
                                <Eye className="mr-2 h-3.5 w-3.5" /> Review
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isOwner && (
          <TabsContent value="form-security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Form Security Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <Select
                    value={selectedFormId}
                    onValueChange={(value) => {
                      setSelectedFormId(value);
                      setManualBlockFormId(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a form" />
                    </SelectTrigger>
                    <SelectContent>
                      {forms.map((form) => {
                        const ownerLabel =
                          form.owner?.username ||
                          form.owner?.display_name ||
                          "unknown";
                        return (
                          <SelectItem key={form.id} value={form.id}>
                            {stripMarkdownToText(form.title || "Untitled form")}{" "}
                            - @{ownerLabel}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  <div className="rounded-lg border px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Open flags for selected form
                    </p>
                    <p className="text-lg font-semibold">
                      {openFlagsForSelectedForm}
                    </p>
                  </div>
                </div>

                {selectedForm ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    <SensitivityLevelSettings
                      formId={selectedForm.id}
                      formTitle={selectedForm.title}
                      currentLevel={
                        (selectedForm.security_sensitivity as any) || "medium"
                      }
                    />
                    <CustomBlocklist
                      formId={selectedForm.id}
                      formTitle={selectedForm.title}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Select a form to manage its moderation and security
                    settings.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="global-rules" className="space-y-4">
            <GlobalBlocklist />
          </TabsContent>
        )}

        <TabsContent value="ip-firewall" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">IP Firewall</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div className="space-y-3">
                  <SearchInput
                    value={ipSearch}
                    onChange={setIpSearch}
                    placeholder="Search by IP or reason"
                    className="w-full sm:max-w"
                    debounce={180}
                  />
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IP</TableHead>
                          <TableHead>Form</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Blocked at</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {blockedIps.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center py-8 text-muted-foreground"
                            >
                              No blocked IPs found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          blockedIps.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-mono text-xs">
                                {row.ip_address}
                              </TableCell>
                              <TableCell className="max-w-48">
                                <span className="truncate block text-sm">
                                  {stripMarkdownToText(
                                    row.form?.title || "Unknown form",
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-56">
                                <span className="truncate block">
                                  {row.reason || "-"}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {formatDateTime(row.blocked_at)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="cursor-pointer"
                                  onClick={() => void handleUnblockIp(row.id)}
                                >
                                  Unblock
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Card className="border-border/70">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Manual IP block</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Target form</Label>
                      <Select
                        value={manualBlockFormId}
                        onValueChange={setManualBlockFormId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select form" />
                        </SelectTrigger>
                        <SelectContent>
                          {forms.map((form) => (
                            <SelectItem key={form.id} value={form.id}>
                              {stripMarkdownToText(
                                form.title || "Untitled form",
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="manual-ip">IP address</Label>
                      <Input
                        id="manual-ip"
                        value={manualBlockIp}
                        onChange={(event) =>
                          setManualBlockIp(event.target.value)
                        }
                        placeholder="203.0.113.42"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="manual-reason">Reason</Label>
                      <Textarea
                        id="manual-reason"
                        value={manualBlockReason}
                        onChange={(event) =>
                          setManualBlockReason(event.target.value)
                        }
                        placeholder="Repeated dangerous submissions"
                        className="min-h-24"
                      />
                    </div>
                    <Button
                      className="w-full cursor-pointer"
                      onClick={() => void handleManualBlockIp()}
                    >
                      <Ban className="mr-2 h-4 w-4" /> Block IP
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!reviewingFlag}
        onOpenChange={(open) => !open && setReviewingFlag(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Review Flag
              {reviewingFlag && <RiskBadge level={reviewingFlag.risk_level} />}
            </DialogTitle>
            <DialogDescription>
              Decide whether to approve or reject this flagged submission and
              optionally block the submitter IP.
            </DialogDescription>
          </DialogHeader>

          {reviewingFlag && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Form
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {stripMarkdownToText(
                      reviewingFlag.form?.title || "Untitled form",
                    )}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Submitter
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {reviewingFlag.request?.submitter_name || "Unknown"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    IP
                  </p>
                  <p className="text-xs font-mono mt-1 break-all">
                    {reviewingFlag.request?.ip_address || "Unavailable"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Created
                  </p>
                  <p className="text-sm mt-1">
                    {formatDateTime(reviewingFlag.created_at)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Reason
                </p>
                <p className="text-sm mt-1 text-muted-foreground">
                  {reviewingFlag.reason || "No reason provided"}
                </p>
              </div>

              <div>
                <Label htmlFor="review-notes">Review notes</Label>
                <Textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  className="mt-1 min-h-24"
                  placeholder="Optional moderation notes"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              disabled={submittingAction || !reviewingFlag?.request?.ip_address}
              className="cursor-pointer"
              onClick={() => void handleBlockIpFromFlag()}
            >
              <Ban className="mr-2 h-4 w-4" /> Block IP
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={submittingAction}
                className="cursor-pointer"
                onClick={() => void handleReviewAction("rejected")}
              >
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button
                type="button"
                disabled={submittingAction}
                className="cursor-pointer"
                onClick={() => void handleReviewAction("approved")}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
