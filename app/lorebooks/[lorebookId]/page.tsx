"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, Plus, Search, Trash2 } from "lucide-react";
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
          .from("atlas_lorebooks")
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
            .from("atlas_worlds")
            .select("id,title,slug")
            .eq("id", nextLorebook.world_id)
            .eq("user_id", userId)
            .single(),
          supabase
            .from("atlas_entries")
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
        .delete()
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

      const { data: worldData, error: worldLoadError } = await supabase
        .from("atlas_worlds")
        .select("featured_lorebook_ids")
        .eq("id", lorebook.world_id)
        .eq("user_id", currentUserId)
        .single();

      if (!worldLoadError && worldData) {
        const currentFeatured = Array.isArray(worldData.featured_lorebook_ids)
          ? (worldData.featured_lorebook_ids as string[])
          : [];

        const nextFeatured = currentFeatured.filter(
          (featuredLorebookId) => featuredLorebookId !== lorebook.id,
        );

        const { error: worldUpdateError } = await supabase
          .from("atlas_worlds")
          .update({ featured_lorebook_ids: nextFeatured })
          .eq("id", lorebook.world_id)
          .eq("user_id", currentUserId);

        if (worldUpdateError) {
          console.warn(
            "Could not unpin lorebook before delete:",
            worldUpdateError,
          );
        }
      }

      const { error } = await supabase
        .from("atlas_lorebooks")
        .delete()
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
      <div className="mx-auto max-w-350 p-4 sm:p-6 md:p-8 lg:p-10">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading lorebook...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!lorebook) {
    return (
      <div className="mx-auto max-w-350 p-4 sm:p-6 md:p-8 lg:p-10">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Lorebook not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-350 space-y-6 p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" className="cursor-pointer">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Badge variant="secondary">{world?.title || "Unknown world"}</Badge>
          <Badge variant="outline">{entryCountLabel}</Badge>
          <Badge variant="outline">
            Updated {new Date(lorebook.updated_at).toLocaleDateString()}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Lorebook details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lorebook-title">Title</Label>
              <Input
                id="lorebook-title"
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lorebook-summary">Summary</Label>
              <Textarea
                id="lorebook-summary"
                rows={5}
                value={summaryDraft}
                onChange={(event) => setSummaryDraft(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="w-full cursor-pointer sm:w-auto"
                onClick={saveLorebook}
              >
                Save lorebook
              </Button>
              <Button
                variant="destructive"
                className="w-full cursor-pointer sm:w-auto"
                onClick={deleteLorebook}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete lorebook
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-entry-title">Title</Label>
                <Input
                  id="new-entry-title"
                  value={newEntryTitle}
                  onChange={(event) => setNewEntryTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-entry-kind">Type</Label>
                <Select
                  value={newEntryKind}
                  onValueChange={(value) =>
                    setNewEntryKind(value as AtlasEntryKind)
                  }
                >
                  <SelectTrigger id="new-entry-kind">
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
              <Textarea
                id="new-entry-body"
                rows={5}
                value={newEntryBody}
                onChange={(event) => setNewEntryBody(event.target.value)}
              />
            </div>
            <Button
              className="w-full cursor-pointer sm:w-auto"
              onClick={addEntry}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add entry
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={entrySearch}
                onChange={(event) => setEntrySearch(event.target.value)}
                placeholder='Search title/body, e.g. "red moon" or kind:character'
                className="pl-9"
              />
            </div>
            <Select
              value={entryKindFilter}
              onValueChange={(value) =>
                setEntryKindFilter(value as "all" | AtlasEntryKind)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by kind" />
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
          </div>

          <div className="text-xs text-muted-foreground">
            Search supports quoted phrases and kind filters like
            <span className="font-medium"> kind:lore</span> or
            <span className="font-medium"> #timeline</span>.
          </div>

          <div className="text-xs text-muted-foreground">
            Showing {filteredEntries.length} of {entries.length} entries
          </div>

          {filteredEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <div ref={parentRef} className="max-h-[60vh] overflow-auto">
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  position: "relative",
                }}
              >
                {virtualItems.map((virtualRow) => {
                  const entry = filteredEntries[virtualRow.index];
                  return (
                    <div
                      key={entry.id}
                      data-index={virtualRow.index}
                      ref={(el) => {
                        if (el) {
                          virtualizer.measureElement(el);
                        }
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
                      <Collapsible
                        open={expandedEntries[entry.id] ?? false}
                        onOpenChange={(open) =>
                          setExpandedEntries((prev) => ({
                            ...prev,
                            [entry.id]: open,
                          }))
                        }
                        className="rounded-xl border border-border/70"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0 space-y-1">
                            <div className="truncate text-sm font-medium">
                              {entry.title || "Untitled entry"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {entryKindLabels[entry.kind]}
                            </div>
                          </div>
                          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                            <Button
                              className="w-full cursor-pointer sm:w-auto"
                              size="sm"
                              onClick={() => saveEntry(entry)}
                            >
                              Save
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full cursor-pointer sm:w-auto"
                              onClick={() => deleteEntry(entry.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon-sm"
                                className="cursor-pointer"
                              >
                                <ChevronDown
                                  className={cn(
                                    "h-4 w-4 transition-transform",
                                    (expandedEntries[entry.id] ?? false) &&
                                      "rotate-180",
                                  )}
                                />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="space-y-3 border-t border-border/70 px-4 py-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Input
                                value={entry.title}
                                onChange={(event) =>
                                  setEntries((prev) =>
                                    prev.map((item) =>
                                      item.id === entry.id
                                        ? { ...item, title: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                              />
                              <Select
                                value={entry.kind}
                                onValueChange={(value) =>
                                  setEntries((prev) =>
                                    prev.map((item) =>
                                      item.id === entry.id
                                        ? {
                                            ...item,
                                            kind: value as AtlasEntryKind,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              >
                                <SelectTrigger>
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

                            <Textarea
                              rows={8}
                              value={entry.body}
                              onChange={(event) =>
                                setEntries((prev) =>
                                  prev.map((item) =>
                                    item.id === entry.id
                                      ? { ...item, body: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
