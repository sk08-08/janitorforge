"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownField } from "@/components/ui/markdown-field";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Clock,
  LibraryBig,
  MapPin,
  NotebookText,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  UserRound,
  X,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

type AtlasEntryKind = "lore" | "character" | "location" | "timeline" | "note";

type LorebookRow = {
  id: string;
  user_id: string;
  world_id: string;
  title: string;
  summary: string;
  created_at: string;
  updated_at: string;
};

type WorldRow = {
  id: string;
  title: string;
  slug: string;
};

type EntryRow = {
  id: string;
  user_id: string;
  world_id: string;
  lorebook_id: string;
  title: string;
  kind: AtlasEntryKind;
  body: string;
  created_at: string;
  updated_at: string;
};

const entryKindLabels: Record<AtlasEntryKind, string> = {
  lore: "Lore",
  character: "Character",
  location: "Location",
  timeline: "Timeline",
  note: "Note",
};

const entryKindBadges: Record<AtlasEntryKind, string> = {
  lore: "bg-primary/10 text-primary",
  character: "bg-chart-2/10 text-chart-2",
  location: "bg-chart-4/10 text-chart-4",
  timeline: "bg-success/10 text-success",
  note: "bg-muted text-muted-foreground",
};

const entryKindIcons: Record<AtlasEntryKind, React.ReactNode> = {
  lore: <BookOpen className="h-5 w-5 text-primary" />,
  character: <UserRound className="h-5 w-5 text-chart-2" />,
  location: <MapPin className="h-5 w-5 text-chart-4" />,
  timeline: <Clock className="h-5 w-5 text-success" />,
  note: <NotebookText className="h-5 w-5 text-muted-foreground" />,
};

const entryKinds: AtlasEntryKind[] = [
  "lore",
  "character",
  "location",
  "timeline",
  "note",
];

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseSearchQuery(rawQuery: string) {
  const query = rawQuery.trim();
  const tokens: string[] = [];
  const kindTokens: AtlasEntryKind[] = [];

  const matches = query.matchAll(/"([^"]+)"|(\S+)/g);
  for (const match of matches) {
    const token = (match[1] || match[2] || "").trim();
    if (!token) continue;

    const normalizedToken = normalizeForSearch(token);

    if (normalizedToken.startsWith("kind:")) {
      const kind = normalizedToken.slice(5) as AtlasEntryKind;
      if (entryKinds.includes(kind)) {
        kindTokens.push(kind);
      }
      continue;
    }

    if (normalizedToken.startsWith("#")) {
      const hashKind = normalizedToken.slice(1) as AtlasEntryKind;
      if (entryKinds.includes(hashKind)) {
        kindTokens.push(hashKind);
        continue;
      }
    }

    tokens.push(normalizedToken);
  }

  return {
    tokens,
    kindTokens,
    hasQuery: tokens.length > 0 || kindTokens.length > 0,
  };
}

export default function LorebookPage() {
  const params = useParams<{ lorebookId: string }>();
  const router = useRouter();
  const lorebookId = params?.lorebookId;

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [world, setWorld] = useState<WorldRow | null>(null);
  const [lorebook, setLorebook] = useState<LorebookRow | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([]);

  const [titleDraft, setTitleDraft] = useState("");
  const [summaryDraft, setSummaryDraft] = useState("");

  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [newEntryKind, setNewEntryKind] = useState<AtlasEntryKind>("note");
  const [newEntryBody, setNewEntryBody] = useState("");
  const [expandedEntries, setExpandedEntries] = useState<
    Record<string, boolean>
  >({});

  const [entrySearch, setEntrySearch] = useState("");
  const [entryKindFilter, setEntryKindFilter] = useState<
    "all" | AtlasEntryKind
  >("all");
  const [editingDetails, setEditingDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!lorebookId) return;

      try {
        const supabase = createClient();
        const access = await getCurrentUserAccess(supabase);
        const userId = access.user?.id ?? null;

        if (!mounted) return;
        setCurrentUserId(userId);

        if (!userId) {
          toast.error("Sign in to access lorebooks");
          return;
        }

        const { data: lorebookData, error: lorebookError } = await supabase
          .from("active_atlas_lorebooks")
          .select("*")
          .eq("id", lorebookId)
          .eq("user_id", userId)
          .single();

        if (lorebookError) throw lorebookError;
        if (!lorebookData) throw new Error("Lorebook not found");

        const nextLorebook = lorebookData as LorebookRow;

        const [
          { data: worldData, error: worldError },
          { data: entriesData, error: entriesError },
        ] = await Promise.all([
          supabase
            .from("active_atlas_worlds")
            .select("id,title,slug")
            .eq("id", nextLorebook.world_id)
            .eq("user_id", userId)
            .single(),
          supabase
            .from("active_atlas_entries")
            .select("*")
            .eq("lorebook_id", lorebookId)
            .eq("user_id", userId)
            .order("updated_at", { ascending: false }),
        ]);

        if (worldError) throw worldError;
        if (entriesError) throw entriesError;

        if (!mounted) return;

        setLorebook(nextLorebook);
        setWorld(worldData as WorldRow);
        setEntries(
          Array.isArray(entriesData) ? (entriesData as EntryRow[]) : [],
        );
        setTitleDraft(nextLorebook.title || "");
        setSummaryDraft(nextLorebook.summary || "");
      } catch (error) {
        console.error("Failed to load lorebook page:", error);
        toast.error("Could not load lorebook");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [lorebookId]);

  const entryCountLabel = useMemo(
    () => `${entries.length} entries`,
    [entries.length],
  );

  const entryKindCounts = useMemo(() => {
    const counts: Partial<Record<AtlasEntryKind, number>> = {};
    entries.forEach((e) => {
      counts[e.kind] = (counts[e.kind] || 0) + 1;
    });
    return counts;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const { tokens, kindTokens, hasQuery } = parseSearchQuery(entrySearch);

    const ranked = entries
      .filter((entry) => {
        const matchesKindFilter =
          entryKindFilter === "all" || entry.kind === entryKindFilter;
        if (!matchesKindFilter) return false;

        const matchesKindTokens =
          kindTokens.length === 0 || kindTokens.includes(entry.kind);
        if (!matchesKindTokens) return false;

        if (tokens.length === 0) return true;

        const title = normalizeForSearch(entry.title);
        const body = normalizeForSearch(entry.body);
        const kind = normalizeForSearch(entryKindLabels[entry.kind]);
        const searchable = `${title}\n${body}\n${kind}`;

        return tokens.every((token) => searchable.includes(token));
      })
      .map((entry) => {
        if (!hasQuery) {
          return { entry, score: 0 };
        }

        const title = normalizeForSearch(entry.title);
        const body = normalizeForSearch(entry.body);
        const kind = normalizeForSearch(entryKindLabels[entry.kind]);

        let score = 0;
        for (const token of tokens) {
          if (title === token) score += 120;
          else if (title.startsWith(token)) score += 70;
          else if (title.includes(token)) score += 40;
          else if (kind.includes(token)) score += 18;
          else if (body.includes(token)) score += 12;
        }

        if (kindTokens.includes(entry.kind)) {
          score += 20;
        }

        return { entry, score };
      });

    if (!hasQuery) {
      return ranked.map((item) => item.entry);
    }

    return ranked.sort((a, b) => b.score - a.score).map((item) => item.entry);
  }, [entries, entryKindFilter, entrySearch]);

  useEffect(() => {
    setExpandedEntries((prev) => {
      const next = { ...prev };
      for (const entry of entries) {
        if (typeof next[entry.id] === "undefined") {
          next[entry.id] = false;
        }
      }
      return next;
    });
  }, [entries]);

  // Virtualizer must be declared at top-level so hooks order stays stable
  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: filteredEntries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 6,
    getItemKey: (index) => filteredEntries[index].id,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [expandedEntries, filteredEntries.length]);

  const virtualItems = virtualizer.getVirtualItems();

  const saveLorebook = async () => {
    if (!currentUserId || !lorebook) return;

    const title = titleDraft.trim();
    if (!title) {
      toast.error("Lorebook title is required");
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("atlas_lorebooks")
        .update({ title, summary: summaryDraft.trim() })
        .eq("id", lorebook.id)
        .eq("user_id", currentUserId)
        .select("*")
        .single();

      if (error) throw error;
      if (data) {
        const next = data as LorebookRow;
        setLorebook(next);
        setTitleDraft(next.title);
        setSummaryDraft(next.summary || "");
      }

      toast.success("Lorebook updated");
    } catch (error) {
      console.error("Failed to save lorebook:", error);
      toast.error("Could not save lorebook");
    }
  };

  const addEntry = async () => {
    if (!currentUserId || !lorebook || !world) return;

    const title = newEntryTitle.trim();
    const body = newEntryBody.trim();

    if (!title || !body) {
      toast.error("Entry title and body are required");
      return;
    }

    try {
      const supabase = createClient();
      const payload = {
        id: crypto.randomUUID(),
        user_id: currentUserId,
        world_id: world.id,
        lorebook_id: lorebook.id,
        title,
        kind: newEntryKind,
        body,
      };

      const { data, error } = await supabase
        .from("atlas_entries")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        setEntries((prev) => [data as EntryRow, ...prev]);
      }

      setNewEntryTitle("");
      setNewEntryKind("note");
      setNewEntryBody("");
      toast.success("Entry added");
    } catch (error) {
      console.error("Failed to add entry:", error);
      toast.error("Could not add entry");
    }
  };

  const saveEntry = async (entry: EntryRow) => {
    if (!currentUserId) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("atlas_entries")
        .update({
          title: entry.title.trim(),
          kind: entry.kind,
          body: entry.body.trim(),
        })
        .eq("id", entry.id)
        .eq("user_id", currentUserId)
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        const updated = data as EntryRow;
        setEntries((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
      }

      toast.success("Entry saved");
    } catch (error) {
      console.error("Failed to save entry:", error);
      toast.error("Could not save entry");
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!currentUserId) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("atlas_entries")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", entryId)
        .eq("user_id", currentUserId);

      if (error) throw error;

      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
      setExpandedEntries((prev) => {
        const next = { ...prev };
        delete next[entryId];
        return next;
      });
      toast.success("Entry deleted");
    } catch (error) {
      console.error("Failed to delete entry:", error);
      toast.error("Could not delete entry");
    }
  };

  const deleteLorebook = async () => {
    if (!currentUserId || !lorebook) return;

    try {
      const supabase = createClient();

      const { error: relationDeleteError } = await supabase
        .from("atlas_world_featured_lorebooks")
        .delete()
        .eq("world_id", lorebook.world_id)
        .eq("lorebook_id", lorebook.id);

      if (relationDeleteError) {
        console.warn(
          "Could not unpin lorebook before delete:",
          relationDeleteError,
        );
      }

      const { error } = await supabase
        .from("atlas_lorebooks")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", lorebook.id)
        .eq("user_id", currentUserId);

      if (error) throw error;

      toast.success("Lorebook deleted");
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to delete lorebook:", error);
      toast.error("Could not delete lorebook");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Loading lorebook…</p>
        </div>
      </div>
    );
  }

  if (!lorebook) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/30">
            <NotebookText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Lorebook not found</h2>
          <p className="text-sm text-muted-foreground">
            This lorebook may have been deleted or you don't have access.
          </p>
          <Button asChild variant="outline" className="cursor-pointer">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to hub
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4 pb-16 sm:p-6 md:p-8 lg:p-10">
      {/* ─── Back + breadcrumb ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="cursor-pointer -ml-2"
        >
          <Link href="/">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Atlas
          </Link>
        </Button>
        {world && (
          <>
            <span className="text-muted-foreground">/</span>
            <Badge variant="secondary" className="rounded-full">
              <LibraryBig className="mr-1 h-3 w-3" />
              {world.title}
            </Badge>
          </>
        )}
      </div>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-border/60 bg-card shadow-lg">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.14),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.1),transparent_50%)]" />
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-start lg:gap-10">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary">
              <NotebookText className="h-3.5 w-3.5" />
              Lorebook
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {lorebook.title}
            </h1>
            {lorebook.summary && (
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {lorebook.summary}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {entries.length} entries
              </Badge>
              {Object.entries(entryKindCounts).map(([kind, count]) => (
                <Badge
                  key={kind}
                  variant="outline"
                  className="rounded-full px-3 py-1"
                >
                  {entryKindIcons[kind as AtlasEntryKind]} {count}{" "}
                  {entryKindLabels[kind as AtlasEntryKind].toLowerCase()}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setEditingDetails(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit details
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setShowAddEntry(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add entry
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="cursor-pointer"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Edit details (collapsible) ──────────────────────────── */}
      {editingDetails && (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold">Edit lorebook details</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer"
              onClick={() => setEditingDetails(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lorebook-title">Title</Label>
              <Input
                id="lorebook-title"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lorebook-summary">Summary</Label>
              <MarkdownField
                id="lorebook-summary"
                rows={4}
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                className="min-h-[9rem] md:min-h-[10rem]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="cursor-pointer"
                onClick={() => {
                  saveLorebook();
                  setEditingDetails(false);
                }}
              >
                Save changes
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  setTitleDraft(lorebook.title);
                  setSummaryDraft(lorebook.summary || "");
                  setEditingDetails(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ─── Add entry (collapsible) ─────────────────────────────── */}
      {showAddEntry && (
        <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold">Add new entry</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer"
              onClick={() => setShowAddEntry(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <div className="space-y-2">
                <Label htmlFor="new-entry-title">Title</Label>
                <Input
                  id="new-entry-title"
                  value={newEntryTitle}
                  onChange={(e) => setNewEntryTitle(e.target.value)}
                  placeholder="Entry title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-entry-kind">Type</Label>
                <Select
                  value={newEntryKind}
                  onValueChange={(v) => setNewEntryKind(v as AtlasEntryKind)}
                >
                  <SelectTrigger id="new-entry-kind" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(entryKindLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-entry-body">Body</Label>
              <MarkdownField
                id="new-entry-body"
                rows={5}
                value={newEntryBody}
                onChange={(e) => setNewEntryBody(e.target.value)}
                placeholder="Write the lore, character info, location details…"
                className="min-h-[11rem] md:min-h-[13rem]"
              />
            </div>
            <Button
              className="cursor-pointer"
              onClick={() => {
                addEntry();
              }}
              disabled={!newEntryTitle.trim() || !newEntryBody.trim()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add entry
            </Button>
          </div>
        </section>
      )}

      {/* ─── Search & filter toolbar ─────────────────────────────── */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={entrySearch}
            onChange={(e) => setEntrySearch(e.target.value)}
            placeholder='Search entries… e.g. "red moon" or kind:character'
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={entryKindFilter}
            onValueChange={(v) =>
              setEntryKindFilter(v as "all" | AtlasEntryKind)
            }
          >
            <SelectTrigger className="w-37.5">
              <SelectValue placeholder="All kinds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              {Object.entries(entryKindLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="shrink-0">
            {filteredEntries.length} of {entries.length}
          </Badge>
        </div>
      </section>

      {/* ─── Entries list ────────────────────────────────────────── */}
      {filteredEntries.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-center sm:p-12">
          <div className="mx-auto max-w-md space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">
              {entries.length === 0 ? "No entries yet" : "No matches"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {entries.length === 0
                ? "Add your first lore entry, character profile, or location note."
                : "Try a different search term or clear the kind filter."}
            </p>
            {entries.length === 0 && (
              <Button
                className="cursor-pointer"
                onClick={() => setShowAddEntry(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add first entry
              </Button>
            )}
          </div>
        </section>
      ) : (
        <div ref={parentRef} className="max-h-[65vh] overflow-auto rounded-xl">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {virtualItems.map((virtualRow) => {
              const entry = filteredEntries[virtualRow.index];
              const isExpanded = expandedEntries[entry.id] ?? false;

              return (
                <div
                  key={entry.id}
                  data-index={virtualRow.index}
                  ref={(el) => {
                    if (el) virtualizer.measureElement(el);
                    return undefined;
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: "0.75rem",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    className={cn(
                      "rounded-2xl border transition-all duration-200",
                      isExpanded
                        ? "border-primary/30 bg-card shadow-md"
                        : "border-border/60 bg-card hover:border-primary/20 hover:shadow-sm",
                    )}
                  >
                    {/* Header row */}
                    <div className="flex items-start gap-3 px-4 py-3 sm:px-5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/30 text-base">
                        {entryKindIcons[entry.kind]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">
                            {entry.title || "Untitled entry"}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "border-0 text-[11px]",
                              entryKindBadges[entry.kind],
                            )}
                          >
                            {entryKindLabels[entry.kind]}
                          </Badge>
                        </div>
                        {!isExpanded && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {entry.body || "Empty body"}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="cursor-pointer"
                          onClick={() =>
                            setExpandedEntries((prev) => ({
                              ...prev,
                              [entry.id]: !prev[entry.id],
                            }))
                          }
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-180",
                            )}
                          />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded editor */}
                    {isExpanded && (
                      <div className="space-y-4 border-t border-border/60 px-4 py-4 sm:px-5">
                        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                          <Input
                            value={entry.title}
                            onChange={(e) =>
                              setEntries((prev) =>
                                prev.map((item) =>
                                  item.id === entry.id
                                    ? { ...item, title: e.target.value }
                                    : item,
                                ),
                              )
                            }
                            placeholder="Entry title"
                          />
                          <Select
                            value={entry.kind}
                            onValueChange={(v) =>
                              setEntries((prev) =>
                                prev.map((item) =>
                                  item.id === entry.id
                                    ? { ...item, kind: v as AtlasEntryKind }
                                    : item,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(entryKindLabels).map(
                                ([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <MarkdownField
                          rows={8}
                          value={entry.body}
                          onChange={(e) =>
                            setEntries((prev) =>
                              prev.map((item) =>
                                item.id === entry.id
                                  ? { ...item, body: e.target.value }
                                  : item,
                              ),
                            )
                          }
                          placeholder="Write the lore, character info, location details…"
                          className="min-h-[13rem] md:min-h-[15rem]"
                        />

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs text-muted-foreground">
                            Last updated{" "}
                            {new Date(entry.updated_at).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => saveEntry(entry)}
                            >
                              Save changes
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => setDeletingEntryId(entry.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Delete lorebook confirmation ────────────────────────── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{lorebook.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the lorebook and all {entries.length} entries
              permanently. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteLorebook}
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete lorebook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Delete entry confirmation ───────────────────────────── */}
      <AlertDialog
        open={deletingEntryId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingEntryId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This entry will be permanently removed from the lorebook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingEntryId) {
                  deleteEntry(deletingEntryId);
                  setDeletingEntryId(null);
                }
              }}
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
