// ============================================================================
// JanitorForge - Atlas Hub
// Persistent hub for series, lorebooks, and creator spaces
// ============================================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { cachedBrowserRequest } from "@/lib/browser-request-cache";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Download,
  Layers3,
  LibraryBig,
  NotebookText,
  PanelsTopLeft,
  Pencil,
  Plus,
  Sparkles,
  Upload,
  X,
  Trash2,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Bot as BotType } from "@/lib/types";
import { toast } from "sonner";
import type {
  AtlasWorld,
  AtlasWorldRow,
  AtlasLorebook,
  AtlasLorebookRow,
  AtlasEntry,
  AtlasEntryRow,
  AtlasWorldKind,
  AtlasWorldStatus,
  AtlasEntryKind,
  WorldEditorState,
  EntryEditorState,
  JanitorLorebookEntry,
} from "./atlas-types";
import {
  worldKindLabels,
  worldKindBadges,
  entryKindLabels,
  WORLDS_PER_PAGE,
  LEGACY_ATLAS_STORAGE_KEY,
  slugify,
  mapWorldRow,
  mapLorebookRow,
  mapEntryRow,
  buildWorldRow,
  createEmptyWorldEditorState,
  createEmptyEntryEditorState,
  createJanitorLorebookExport,
  mapJanitorCategoryToEntryKind,
  buildImportedEntryBody,
  stripImportedMetadataBlock,
  isAtlasPackage,
} from "./atlas-utils";

const ATLAS_SELECTED_WORLD_STORAGE_KEY = "atlas-selected-world-id";
const ATLAS_WORLD_PAGE_STORAGE_KEY = "atlas-world-page";

export function AtlasHub() {
  const { bots } = useStore();
  const [worlds, setWorlds] = useState<AtlasWorld[]>([]);
  const [lorebooks, setLorebooks] = useState<AtlasLorebook[]>([]);
  const [entries, setEntries] = useState<AtlasEntry[]>([]);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [worldPage, setWorldPage] = useState(0);
  const [worldEditorOpen, setWorldEditorOpen] = useState(false);
  const [entryEditorOpen, setEntryEditorOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedWorldIds, setSelectedWorldIds] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [worldDetailsOpen, setWorldDetailsOpen] = useState(false);
  const [importName, setImportName] = useState("");
  const [importText, setImportText] = useState("");
  const [worldEditorState, setWorldEditorState] = useState<WorldEditorState>(
    createEmptyWorldEditorState(),
  );
  const [entryEditorState, setEntryEditorState] = useState<EntryEditorState>(
    createEmptyEntryEditorState(),
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mobileTab, setMobileTab] = useState<"worlds" | "lorebooks">("worlds");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedWorldId = localStorage.getItem(ATLAS_SELECTED_WORLD_STORAGE_KEY);
    const savedPage = localStorage.getItem(ATLAS_WORLD_PAGE_STORAGE_KEY);

    if (savedWorldId) {
      setSelectedWorldId(savedWorldId);
    }

    if (savedPage) {
      const parsedPage = Number(savedPage);
      if (!Number.isNaN(parsedPage)) {
        setWorldPage(parsedPage);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedWorldId) {
      localStorage.setItem(ATLAS_SELECTED_WORLD_STORAGE_KEY, selectedWorldId);
    } else {
      localStorage.removeItem(ATLAS_SELECTED_WORLD_STORAGE_KEY);
    }
  }, [selectedWorldId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ATLAS_WORLD_PAGE_STORAGE_KEY, String(worldPage));
  }, [worldPage]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const result = await cachedBrowserRequest(
          "atlas-hub:load",
          15_000,
          async () => {
            const supabase = createClient();
            const access = await getCurrentUserAccess(supabase);
            const userId = access.user?.id ?? null;

            if (!userId) {
              return {
                userId: null as string | null,
                worlds: [] as AtlasWorld[],
                lorebooks: [] as AtlasLorebook[],
                entries: [] as AtlasEntry[],
              };
            }

            const [
              { data: worldData, error: worldError },
              { data: lorebookData, error: lorebookError },
              { data: entryData, error: entryError },
            ] = await Promise.all([
              supabase
                .from("atlas_worlds")
                .select("*")
                .eq("user_id", userId)
                .is("deleted_at", null)
                .order("updated_at", { ascending: false }),
              supabase
                .from("atlas_lorebooks")
                .select("*")
                .eq("user_id", userId)
                .is("deleted_at", null)
                .order("updated_at", { ascending: false }),
              supabase
                .from("atlas_entries")
                .select("*")
                .eq("user_id", userId)
                .is("deleted_at", null)
                .order("updated_at", { ascending: false }),
            ]);

            if (worldError) throw worldError;
            if (lorebookError) throw lorebookError;
            if (entryError) throw entryError;

            const nextWorlds = Array.isArray(worldData)
              ? worldData.map((row) => mapWorldRow(row as AtlasWorldRow))
              : [];
            const nextLorebooks = Array.isArray(lorebookData)
              ? lorebookData.map((row) =>
                  mapLorebookRow(row as AtlasLorebookRow),
                )
              : [];
            const nextEntries = Array.isArray(entryData)
              ? entryData.map((row) => mapEntryRow(row as AtlasEntryRow))
              : [];

            const normalizedEntries = nextEntries.map((entry) => ({
              ...entry,
              body: stripImportedMetadataBlock(entry.body),
            }));

            const entriesToNormalize = normalizedEntries.filter(
              (entry, index) => entry.body !== nextEntries[index]?.body,
            );

            if (entriesToNormalize.length > 0) {
              await Promise.all(
                entriesToNormalize.map(async (entry) => {
                  const { error: normalizeError } = await supabase
                    .from("atlas_entries")
                    .update({ body: entry.body })
                    .eq("id", entry.id)
                    .eq("user_id", userId);

                  if (normalizeError) {
                    console.error(
                      "Failed to normalize imported metadata block:",
                      normalizeError,
                    );
                  }
                }),
              );
            }

            if (nextWorlds.length === 0 && typeof window !== "undefined") {
              const legacySaved = localStorage.getItem(
                LEGACY_ATLAS_STORAGE_KEY,
              );
              if (legacySaved) {
                const legacyWorlds = JSON.parse(legacySaved) as AtlasWorld[];
                if (Array.isArray(legacyWorlds) && legacyWorlds.length > 0) {
                  const migrationPayload = legacyWorlds.map((world) =>
                    buildWorldRow(world, userId),
                  );

                  const { data: migratedData, error: migrateError } =
                    await supabase
                      .from("atlas_worlds")
                      .upsert(migrationPayload, { onConflict: "id" })
                      .select("*")
                      .order("updated_at", { ascending: false });

                  if (migrateError) throw migrateError;
                  localStorage.removeItem(LEGACY_ATLAS_STORAGE_KEY);

                  return {
                    userId,
                    worlds: Array.isArray(migratedData)
                      ? migratedData.map((row) =>
                          mapWorldRow(row as AtlasWorldRow),
                        )
                      : [],
                    lorebooks: nextLorebooks,
                    entries: normalizedEntries,
                  };
                }
              }
            }

            return {
              userId,
              worlds: nextWorlds,
              lorebooks: nextLorebooks,
              entries: normalizedEntries,
            };
          },
        );

        if (!mounted) return;
        setCurrentUserId(result.userId);
        setWorlds(result.worlds);
        setLorebooks(result.lorebooks);
        setEntries(result.entries);
      } catch (error) {
        console.error("Failed to load Atlas worlds:", error);
        toast.error("Could not load Atlas worlds");
        if (mounted) {
          setWorlds([]);
          setLorebooks([]);
          setEntries([]);
        }
      } finally {
        if (mounted) setAccessLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const botMap = useMemo(
    () => new Map(bots.map((bot) => [bot.id, bot])),
    [bots],
  );

  const sortedWorlds = useMemo(
    () => [...worlds].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [worlds],
  );

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  const filteredWorlds = useMemo(() => {
    if (!debouncedSearch) return sortedWorlds;
    const q = debouncedSearch.toLowerCase();
    return sortedWorlds.filter((w) => {
      return (
        w.title.toLowerCase().includes(q) ||
        (w.description || "").toLowerCase().includes(q) ||
        (w.loreSummary || "").toLowerCase().includes(q)
      );
    });
  }, [sortedWorlds, debouncedSearch]);

  const filteredLorebooks = useMemo(() => {
    if (!debouncedSearch) return lorebooks;
    const q = debouncedSearch.toLowerCase();
    return lorebooks.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.summary || "").toLowerCase().includes(q),
    );
  }, [lorebooks, debouncedSearch]);

  const filteredEntries = useMemo(() => {
    if (!debouncedSearch) return entries;
    const q = debouncedSearch.toLowerCase();
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.body || "").toLowerCase().includes(q),
    );
  }, [entries, debouncedSearch]);

  const worldPageCount = Math.max(
    1,
    Math.ceil(filteredWorlds.length / WORLDS_PER_PAGE),
  );

  const paginatedWorlds = useMemo(() => {
    const normalizedPage = Math.min(worldPage, worldPageCount - 1);
    const startIndex = normalizedPage * WORLDS_PER_PAGE;
    return filteredWorlds.slice(startIndex, startIndex + WORLDS_PER_PAGE);
  }, [filteredWorlds, worldPage, worldPageCount]);

  useEffect(() => {
    // remove any selected ids that no longer exist
    setSelectedWorldIds((prev) => {
      const valid = new Set(worlds.map((w) => w.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [worlds]);

  const toggleWorldSelection = (worldId: string, selected: boolean) => {
    setSelectedWorldIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(worldId);
      else next.delete(worldId);
      return next;
    });
  };

  const clearWorldSelection = () => setSelectedWorldIds(new Set());
  const closeWorldDetails = () => {
    setWorldDetailsOpen(false);
    setSelectedWorldId(null);
  };

  const selectedWorlds = useMemo(
    () => worlds.filter((w) => selectedWorldIds.has(w.id)),
    [worlds, selectedWorldIds],
  );

  const handleBulkExport = () => {
    selectedWorlds.forEach((world) => {
      const targetLorebook =
        lorebooks.find(
          (l) =>
            l.worldId === world.id && world.featuredLorebookIds.includes(l.id),
        ) ?? lorebooks.find((l) => l.worldId === world.id);
      if (targetLorebook) exportLorebook(world, targetLorebook);
    });
    clearWorldSelection();
    toast.success("Export started for selected worlds");
  };

  const handleBulkDelete = async () => {
    for (const world of selectedWorlds) {
      await deleteWorld(world.id);
    }
    clearWorldSelection();
    setShowBulkDeleteConfirm(false);
  };

  const paginationItems = useMemo(() => {
    if (worldPageCount <= 7) {
      return Array.from({ length: worldPageCount }, (_, index) => ({
        type: "page" as const,
        index,
        key: `page-${index}`,
      }));
    }

    const items: Array<
      | { type: "page"; index: number; key: string }
      | { type: "ellipsis"; key: string }
    > = [];

    const addPage = (index: number) => {
      if (
        index < 0 ||
        index >= worldPageCount ||
        items.some((item) => item.type === "page" && item.index === index)
      ) {
        return;
      }

      items.push({ type: "page", index, key: `page-${index}` });
    };

    addPage(0);

    if (worldPage > 2) {
      items.push({ type: "ellipsis", key: "ellipsis-start" });
    }

    for (
      let index = Math.max(1, worldPage - 1);
      index <= Math.min(worldPageCount - 2, worldPage + 1);
      index += 1
    ) {
      addPage(index);
    }

    if (worldPage < worldPageCount - 3) {
      items.push({ type: "ellipsis", key: "ellipsis-end" });
    }

    addPage(worldPageCount - 1);

    return items;
  }, [worldPage, worldPageCount]);

  const selectedWorld = useMemo(
    () => sortedWorlds.find((world) => world.id === selectedWorldId) ?? null,
    [sortedWorlds, selectedWorldId],
  );

  const openWorldDetails = (worldId: string) => {
    const worldIndex = sortedWorlds.findIndex((world) => world.id === worldId);
    if (worldIndex >= 0) {
      setWorldPage(Math.floor(worldIndex / WORLDS_PER_PAGE));
    }
    setSelectedWorldId(worldId);
    setWorldDetailsOpen(true);
  };

  const selectedWorldEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.worldId === selectedWorldId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [entries, selectedWorldId],
  );

  const worldById = useMemo(
    () => new Map(worlds.map((world) => [world.id, world])),
    [worlds],
  );

  const lorebookEntryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      counts.set(entry.lorebookId, (counts.get(entry.lorebookId) || 0) + 1);
    });
    return counts;
  }, [entries]);

  const selectedWorldLorebooks = useMemo(
    () =>
      lorebooks
        .filter((lorebook) => lorebook.worldId === selectedWorldId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [lorebooks, selectedWorldId],
  );

  const featuredLorebooks = useMemo(() => {
    if (!selectedWorld) return [];

    return selectedWorld.featuredLorebookIds
      .map((lorebookId) =>
        lorebooks.find((lorebook) => lorebook.id === lorebookId),
      )
      .filter((lorebook): lorebook is AtlasLorebook => Boolean(lorebook));
  }, [lorebooks, selectedWorld]);

  const linkedBotCount = worlds.reduce(
    (total, world) => total + world.botIds.length,
    0,
  );
  const featuredCount = worlds.reduce(
    (total, world) => total + world.featuredLorebookIds.length,
    0,
  );
  const totalEntries = entries.length;
  const selectedWorldLorebookCount = selectedWorldLorebooks.length;
  const selectedWorldBotCount = selectedWorld?.botIds.length || 0;

  const entryEditorLorebooks = useMemo(
    () =>
      lorebooks
        .filter((lorebook) => lorebook.worldId === entryEditorState.worldId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [lorebooks, entryEditorState.worldId],
  );

  useEffect(() => {
    if (!selectedWorld && sortedWorlds.length > 0) {
      setSelectedWorldId(sortedWorlds[0].id);
    }
  }, [selectedWorld, sortedWorlds]);

  useEffect(() => {
    setWorldPage((prev) => Math.min(prev, worldPageCount - 1));
  }, [worldPageCount]);

  const openWorldEditor = (world?: AtlasWorld) => {
    if (world) {
      setWorldEditorState({
        id: world.id,
        title: world.title,
        slug: world.slug,
        kind: world.kind,
        status: world.status,
        description: world.description,
        loreSummary: world.loreSummary,
        botIds: world.botIds,
        featuredLorebookIds: world.featuredLorebookIds,
      });
    } else {
      setWorldEditorState(createEmptyWorldEditorState());
    }
    setWorldEditorOpen(true);
  };

  const openEntryEditor = (entry?: AtlasEntry) => {
    if (entry) {
      setEntryEditorState({
        id: entry.id,
        worldId: entry.worldId,
        lorebookId: entry.lorebookId,
        title: entry.title,
        kind: entry.kind,
        body: entry.body,
      });
    } else {
      const defaultWorldId = selectedWorldId ?? sortedWorlds[0]?.id ?? "";
      const defaultLorebookId =
        lorebooks.find((lorebook) => lorebook.worldId === defaultWorldId)?.id ??
        "";
      setEntryEditorState(
        createEmptyEntryEditorState(defaultWorldId, defaultLorebookId),
      );
    }
    setEntryEditorOpen(true);
  };

  const exportLorebook = (world: AtlasWorld, lorebook: AtlasLorebook) => {
    const lorebookEntries = entries.filter(
      (entry) => entry.lorebookId === lorebook.id,
    );
    const packageData = createJanitorLorebookExport(lorebookEntries);

    const blob = new Blob([JSON.stringify(packageData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${lorebook.title || world.slug || slugify(world.title)}.lorebook.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportEntry = (entry: AtlasEntry) => {
    const blob = new Blob([JSON.stringify(entry, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(entry.title || "entry")}-${entry.id}.lore.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openImportDialog = () => {
    setImportName("");
    setImportText("");
    setImportDialogOpen(true);
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setImportText(text);
  };

  const handleDrop = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    await handleImportFile(fileList[0]);
  };

  const saveWorld = async () => {
    if (!currentUserId) {
      toast.error("Sign in to save Atlas worlds");
      return;
    }

    const title = worldEditorState.title.trim();
    if (!title) return;

    const now = new Date().toISOString();
    const existingWorld = worlds.find(
      (world) => world.id === worldEditorState.id,
    );
    const normalizedWorld: AtlasWorld = {
      id: worldEditorState.id ?? crypto.randomUUID(),
      title,
      slug: worldEditorState.slug.trim() || slugify(title),
      kind: worldEditorState.kind,
      status: worldEditorState.status,
      description: worldEditorState.description.trim(),
      loreSummary: worldEditorState.loreSummary.trim(),
      botIds: worldEditorState.botIds,
      featuredLorebookIds: worldEditorState.featuredLorebookIds,
      createdAt: existingWorld?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("atlas_worlds")
        .upsert([buildWorldRow(normalizedWorld, currentUserId)], {
          onConflict: "id",
        })
        .select("*")
        .single();

      if (error) throw error;

      const savedWorld = data
        ? mapWorldRow(data as AtlasWorldRow)
        : normalizedWorld;
      setWorlds((prev) => {
        const exists = prev.some((world) => world.id === savedWorld.id);
        return exists
          ? prev.map((world) =>
              world.id === savedWorld.id ? savedWorld : world,
            )
          : [savedWorld, ...prev];
      });
      setSelectedWorldId(savedWorld.id);
      setWorldPage(0);
      setWorldEditorOpen(false);
      toast.success(worldEditorState.id ? "World updated" : "World created");
    } catch (error) {
      console.error("Failed to save Atlas world:", error);
      toast.error("Could not save Atlas world");
    }
  };

  const deleteWorld = async (worldId: string) => {
    if (!currentUserId) {
      toast.error("Sign in to delete Atlas worlds");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("atlas_worlds")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", worldId)
        .eq("user_id", currentUserId);

      if (error) throw error;

      setWorlds((prev) => prev.filter((world) => world.id !== worldId));
      setEntries((prev) => prev.filter((entry) => entry.worldId !== worldId));
      if (selectedWorldId === worldId) setSelectedWorldId(null);
      toast.success("World deleted");
    } catch (error) {
      console.error("Failed to delete Atlas world:", error);
      toast.error("Could not delete Atlas world");
    }
  };

  const removeFeaturedLorebook = async (lorebookId: string) => {
    if (!currentUserId || !selectedWorld) {
      toast.error("Select a world before removing a pinned lorebook");
      return;
    }

    try {
      const nextFeaturedLorebookIds = selectedWorld.featuredLorebookIds.filter(
        (featuredLorebookId) => featuredLorebookId !== lorebookId,
      );

      const supabase = createClient();
      const { data, error } = await supabase
        .from("atlas_worlds")
        .update({ featured_lorebook_ids: nextFeaturedLorebookIds })
        .eq("id", selectedWorld.id)
        .eq("user_id", currentUserId)
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        const updatedWorld = mapWorldRow(data as AtlasWorldRow);
        setWorlds((prev) =>
          prev.map((world) =>
            world.id === updatedWorld.id ? updatedWorld : world,
          ),
        );

        setWorldEditorState((prev) =>
          prev.id === updatedWorld.id
            ? { ...prev, featuredLorebookIds: updatedWorld.featuredLorebookIds }
            : prev,
        );
      }

      toast.success("Lorebook removed from world");
    } catch (error) {
      console.error("Failed to remove featured lorebook:", error);
      toast.error("Could not remove pinned lorebook");
    }
  };

  const deleteLorebook = async (lorebookId: string) => {
    if (!currentUserId) {
      toast.error("Sign in to delete lorebooks");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("atlas_lorebooks")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", lorebookId)
        .eq("user_id", currentUserId);

      if (error) throw error;

      setLorebooks((prev) =>
        prev.filter((lorebook) => lorebook.id !== lorebookId),
      );
      setEntries((prev) =>
        prev.filter((entry) => entry.lorebookId !== lorebookId),
      );

      setWorlds((prev) =>
        prev.map((world) => ({
          ...world,
          featuredLorebookIds: world.featuredLorebookIds.filter(
            (featuredLorebookId) => featuredLorebookId !== lorebookId,
          ),
        })),
      );

      setWorldEditorState((prev) => ({
        ...prev,
        featuredLorebookIds: prev.featuredLorebookIds.filter(
          (featuredLorebookId) => featuredLorebookId !== lorebookId,
        ),
      }));

      toast.success("Lorebook deleted");
    } catch (error) {
      console.error("Failed to delete lorebook:", error);
      toast.error("Could not delete lorebook");
    }
  };

  const saveEntry = async () => {
    if (!currentUserId) {
      toast.error("Sign in to save Atlas entries");
      return;
    }

    const worldId = entryEditorState.worldId || selectedWorldId;
    const lorebookId = entryEditorState.lorebookId;
    const title = entryEditorState.title.trim();
    const body = entryEditorState.body.trim();

    if (!worldId || !lorebookId || !title || !body) {
      toast.error("Add world, lorebook, title, and body first");
      return;
    }

    try {
      const supabase = createClient();
      const payload = {
        id: entryEditorState.id ?? crypto.randomUUID(),
        user_id: currentUserId,
        world_id: worldId,
        lorebook_id: lorebookId,
        title,
        kind: entryEditorState.kind,
        body,
      };

      const { data, error } = await supabase
        .from("atlas_entries")
        .upsert(payload, { onConflict: "id" })
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        const savedEntry = mapEntryRow(data as AtlasEntryRow);
        setEntries((prev) => {
          const exists = prev.some((entry) => entry.id === savedEntry.id);
          return exists
            ? prev.map((entry) =>
                entry.id === savedEntry.id ? savedEntry : entry,
              )
            : [savedEntry, ...prev];
        });
      }

      setEntryEditorOpen(false);
      toast.success(entryEditorState.id ? "Entry updated" : "Entry created");
    } catch (error) {
      console.error("Failed to save Atlas entry:", error);
      toast.error("Could not save Atlas entry");
    }
  };

  const importLorebook = async () => {
    if (!currentUserId) {
      toast.error("Sign in to import lorebooks");
      return;
    }

    const lorebookName = importName.trim();
    if (!lorebookName) {
      toast.error("Add a lorebook name first");
      return;
    }

    if (!importText.trim()) {
      toast.error("Paste or load a lorebook JSON file first");
      return;
    }

    try {
      const parsed = JSON.parse(importText) as unknown;
      const worldId = selectedWorldId ?? sortedWorlds[0]?.id ?? null;
      const supabase = createClient();

      let targetWorldId = worldId;

      if (isAtlasPackage(parsed) && parsed.world) {
        const worldPayload = {
          id: crypto.randomUUID(),
          user_id: currentUserId,
          title: lorebookName,
          slug:
            slugify(parsed.world.slug || lorebookName || "imported-lorebook") ||
            `imported-lorebook-${Date.now()}`,
          kind: parsed.world.kind ?? "series",
          status: parsed.world.status ?? "draft",
          description: parsed.world.description ?? "",
          lore_summary: parsed.world.loreSummary ?? "",
          bot_ids: parsed.world.botIds ?? [],
          featured_lorebook_ids: [],
        };

        const { data: worldData, error: worldError } = await supabase
          .from("atlas_worlds")
          .insert(worldPayload)
          .select("*")
          .single();

        if (worldError) throw worldError;
        if (worldData) {
          const importedWorld = mapWorldRow(worldData as AtlasWorldRow);
          setWorlds((prev) => [importedWorld, ...prev]);
          targetWorldId = importedWorld.id;
        }
      }

      if (!targetWorldId) {
        const sourceEntries = Array.isArray(parsed)
          ? parsed
          : isAtlasPackage(parsed) && Array.isArray(parsed.entries)
            ? parsed.entries
            : [];

        const firstSourceName = sourceEntries.find((entry) => {
          if (!entry || typeof entry !== "object") return false;
          const candidate = entry as JanitorLorebookEntry;
          return Boolean(candidate.name?.trim());
        }) as JanitorLorebookEntry | undefined;

        const worldPayload = {
          id: crypto.randomUUID(),
          user_id: currentUserId,
          title: lorebookName,
          slug:
            slugify(
              (isAtlasPackage(parsed) && parsed.world?.slug) ||
                lorebookName ||
                "imported-lorebook",
            ) || `imported-lorebook-${Date.now()}`,
          kind: (isAtlasPackage(parsed) && parsed.world?.kind) || "series",
          status: (isAtlasPackage(parsed) && parsed.world?.status) || "draft",
          description:
            (isAtlasPackage(parsed) && parsed.world?.description) || "",
          lore_summary:
            (isAtlasPackage(parsed) && parsed.world?.loreSummary) || "",
          bot_ids: (isAtlasPackage(parsed) && parsed.world?.botIds) || [],
          featured_lorebook_ids: [],
        };

        const { data: worldData, error: worldError } = await supabase
          .from("atlas_worlds")
          .insert(worldPayload)
          .select("*")
          .single();

        if (worldError) throw worldError;
        if (worldData) {
          const importedWorld = mapWorldRow(worldData as AtlasWorldRow);
          setWorlds((prev) => [importedWorld, ...prev]);
          targetWorldId = importedWorld.id;
        }
      }

      if (!targetWorldId) {
        throw new Error("No world available for import");
      }

      const lorebookSummary =
        (isAtlasPackage(parsed) && parsed.world?.loreSummary?.trim()) || "";

      const { data: lorebookData, error: lorebookError } = await supabase
        .from("atlas_lorebooks")
        .insert({
          id: crypto.randomUUID(),
          user_id: currentUserId,
          world_id: targetWorldId,
          title: lorebookName,
          summary: lorebookSummary,
        })
        .select("*")
        .single();

      if (lorebookError) throw lorebookError;
      if (!lorebookData) throw new Error("Could not create lorebook");

      const importedLorebook = mapLorebookRow(lorebookData as AtlasLorebookRow);
      setLorebooks((prev) => [importedLorebook, ...prev]);

      const sourceEntries = Array.isArray(parsed)
        ? parsed
        : isAtlasPackage(parsed) && Array.isArray(parsed.entries)
          ? parsed.entries
          : [];

      const entriesPayload = sourceEntries
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;

          if (isAtlasPackage(parsed)) {
            const atlasEntry = entry as {
              title?: string;
              kind?: AtlasEntryKind;
              body?: string;
            };
            const title = atlasEntry.title?.trim();
            const body = atlasEntry.body?.trim();
            if (!title && !body) return null;

            return {
              id: crypto.randomUUID(),
              user_id: currentUserId,
              lorebook_id: importedLorebook.id,
              title: title || "Imported entry",
              kind: atlasEntry.kind ?? "note",
              body: body || "",
            };
          }

          const janitorEntry = entry as JanitorLorebookEntry;
          const title = janitorEntry.name?.trim();
          const content = janitorEntry.content?.trim();
          const body = buildImportedEntryBody(janitorEntry).trim();

          if (!title && !content && !body) return null;

          return {
            id: crypto.randomUUID(),
            user_id: currentUserId,
            world_id: targetWorldId,
            lorebook_id: importedLorebook.id,
            title:
              title || `Imported entry ${janitorEntry.priority ?? ""}`.trim(),
            kind: mapJanitorCategoryToEntryKind(janitorEntry.category),
            body,
          };
        })
        .filter(
          (
            entry,
          ): entry is {
            id: string;
            user_id: string;
            world_id: string;
            lorebook_id: string;
            title: string;
            kind: AtlasEntryKind;
            body: string;
          } => Boolean(entry),
        );

      if (entriesPayload.length === 0) {
        throw new Error("No entries found in the import package");
      }

      const { data: importedEntries, error: entryError } = await supabase
        .from("atlas_entries")
        .insert(entriesPayload)
        .select("*");

      if (entryError) throw entryError;

      if (Array.isArray(importedEntries)) {
        const mappedImportedEntries = importedEntries.map((row) =>
          mapEntryRow(row as AtlasEntryRow),
        );
        const importedEntryIds = mappedImportedEntries.map((entry) => entry.id);

        setEntries((prev) => [...mappedImportedEntries, ...prev]);
        const existingFeaturedLorebookIds =
          worlds.find((world) => world.id === targetWorldId)
            ?.featuredLorebookIds ?? [];

        const nextFeaturedLorebookIds = Array.from(
          new Set([...existingFeaturedLorebookIds, importedLorebook.id]),
        );

        const { data: updatedWorldData, error: worldUpdateError } =
          await supabase
            .from("atlas_worlds")
            .update({ featured_lorebook_ids: nextFeaturedLorebookIds })
            .eq("id", targetWorldId)
            .eq("user_id", currentUserId)
            .select("*")
            .single();

        if (worldUpdateError) throw worldUpdateError;

        if (updatedWorldData) {
          const updatedWorld = mapWorldRow(updatedWorldData as AtlasWorldRow);
          setWorlds((prev) =>
            prev.map((world) =>
              world.id === updatedWorld.id ? updatedWorld : world,
            ),
          );
        }
      }

      setSelectedWorldId(targetWorldId);
      setWorldPage(0);
      setImportDialogOpen(false);
      toast.success("Lorebook imported");
    } catch (error) {
      console.error("Failed to import lorebook:", error);
      toast.error("Could not import lorebook JSON");
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!currentUserId) {
      toast.error("Sign in to delete Atlas entries");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("atlas_entries")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", entryId)
        .eq("user_id", currentUserId);

      if (error) throw error;

      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
      toast.success("Entry deleted");
    } catch (error) {
      console.error("Failed to delete Atlas entry:", error);
      toast.error("Could not delete Atlas entry");
    }
  };

  const handleExportClick = () => {
    if (!selectedWorld) {
      toast.error("Select a world before exporting");
      return;
    }

    const targetLorebook = featuredLorebooks[0] ?? selectedWorldLorebooks[0];
    if (!targetLorebook) {
      toast.error("No lorebook available to export");
      return;
    }

    exportLorebook(selectedWorld, targetLorebook);
    toast.success("Lorebook exported");
  };

  const toggleSelection = (
    field: "botIds" | "featuredLorebookIds",
    id: string,
  ) => {
    setWorldEditorState((prev) => {
      const nextValues = prev[field].includes(id)
        ? prev[field].filter((value) => value !== id)
        : [...prev[field], id];
      return { ...prev, [field]: nextValues };
    });
  };

  if (!accessLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Loading Atlas…</p>
        </div>
      </div>
    );
  }

  const isEmpty =
    worlds.length === 0 && lorebooks.length === 0 && entries.length === 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-4 pb-16 sm:p-6 md:p-8 lg:p-10">
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-border/60 bg-card shadow-lg">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.18),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.14),transparent_50%),linear-gradient(160deg,rgba(255,255,255,0.03),transparent_60%)]" />
        <div className="flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-start lg:gap-12">
          {/* Copy */}
          <div className="flex-1 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary">
              <Globe className="h-3.5 w-3.5" />
              Workspace
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem]">
                Worlds & Lorebooks
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Build immersive worlds, organize canon into lorebooks, and keep
                every bot in your series anchored to the same universe.
              </p>
            </div>
          </div>
          {/* Stats grid */}
          <div className="grid w-full shrink-0 grid-cols-2 gap-3 sm:gap-4 lg:w-auto lg:min-w-70">
            {[
              { label: "Worlds", value: worlds.length, icon: LibraryBig },
              {
                label: "Lorebooks",
                value: lorebooks.length,
                icon: NotebookText,
              },
              { label: "Entries", value: totalEntries, icon: BookOpen },
              { label: "Linked bots", value: linkedBotCount, icon: Bot },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur"
              >
                <stat.icon className="mb-2 h-4 w-4 text-muted-foreground" />
                <p className="text-2xl font-bold tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Empty state ──────────────────────────────────────────── */}
      {isEmpty && (
        <section className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-center sm:p-12">
          <div className="mx-auto max-w-md space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <LibraryBig className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Start your first world</h2>
            <p className="text-sm text-muted-foreground">
              Create a world to organize your bots, attach lorebooks, and build
              canon that stays consistent across your entire series.
            </p>
            <Button
              onClick={() => openWorldEditor()}
              className="cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create a world
            </Button>
          </div>
        </section>
      )}

      {/* ─── Toolbar ──────────────────────────────────────────────── */}
      {!isEmpty && (
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setWorldPage(0);
              }}
              placeholder="Search worlds, lorebooks, entries…"
              shortcutKey="/"
              className="w-full sm:max-w-xl"
            />
            {debouncedSearch && (
              <Badge
                variant="outline"
                className="hidden shrink-0 sm:inline-flex"
              >
                {filteredWorlds.length} worlds · {filteredLorebooks.length}{" "}
                lorebooks · {filteredEntries.length} entries
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={openImportDialog}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={handleExportClick}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() => openWorldEditor()}
            >
              <Plus className="mr-2 h-4 w-4" />
              New world
            </Button>
          </div>
        </section>
      )}

      {/* ─── Mobile tab switcher ──────────────────────────────────── */}
      {!isEmpty && (
        <div className="flex rounded-xl border border-border/60 bg-muted/30 p-1 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileTab("worlds")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              mobileTab === "worlds"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LibraryBig className="h-4 w-4" />
            Worlds ({worlds.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("lorebooks")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              mobileTab === "lorebooks"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <NotebookText className="h-4 w-4" />
            Lorebooks ({lorebooks.length})
          </button>
        </div>
      )}

      {/* ─── Bulk selection bar ───────────────────────────────────── */}
      {selectedWorldIds.size > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium">
            {selectedWorldIds.size} world
            {selectedWorldIds.size === 1 ? "" : "s"} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkExport}
              className="cursor-pointer"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearWorldSelection}
              className="cursor-pointer"
            >
              Clear
            </Button>
          </div>
        </section>
      )}

      {/* ─── Main content grid ────────────────────────────────────── */}
      {!isEmpty && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          {/* ── Worlds column ── */}
          <div
            className={cn(
              "space-y-4",
              mobileTab === "lorebooks" && "hidden lg:block",
            )}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Globe className="h-5 w-5 text-primary" />
                Worlds
              </h2>
              <Badge variant="secondary">{filteredWorlds.length}</Badge>
            </div>

            <div className="space-y-3">
              {paginatedWorlds.length > 0 ? (
                paginatedWorlds.map((world) => {
                  const botCount = world.botIds.length;
                  const loreCount = world.featuredLorebookIds.length;
                  const isSelected = world.id === selectedWorldId;

                  return (
                    <div
                      key={world.id}
                      className={cn(
                        "group rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5",
                        isSelected
                          ? "border-primary/50 bg-primary/5 shadow-md ring-1 ring-primary/20"
                          : "border-border/60 bg-card hover:border-primary/30",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          <Checkbox
                            className="cursor-pointer"
                            checked={selectedWorldIds.has(world.id)}
                            onCheckedChange={(val) =>
                              toggleWorldSelection(world.id, val === true)
                            }
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select ${world.title}`}
                          />
                        </div>
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => openWorldDetails(world.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") openWorldDetails(world.id);
                          }}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold">
                                  {world.title}
                                </h3>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "border-0 text-[11px]",
                                    worldKindBadges[world.kind],
                                  )}
                                >
                                  {worldKindLabels[world.kind]}
                                </Badge>
                                <Badge
                                  variant={
                                    world.status === "active"
                                      ? "default"
                                      : "outline"
                                  }
                                  className="text-[11px]"
                                >
                                  {world.status}
                                </Badge>
                              </div>
                              <p className="line-clamp-2 text-sm text-muted-foreground">
                                {world.description || "No description yet."}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Bot className="h-3 w-3" />
                                {botCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <NotebookText className="h-3 w-3" />
                                {loreCount}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary">
                              <Sparkles className="h-3 w-3" />
                              Active · {selectedWorldBotCount} bots ·{" "}
                              {selectedWorldLorebookCount} lorebooks
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                  {debouncedSearch
                    ? "No worlds match your search."
                    : "No worlds yet. Create one to get started."}
                </div>
              )}
            </div>

            {worldPageCount > 1 && (
              <div className="pt-2">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setWorldPage((p) => Math.max(0, p - 1));
                        }}
                        className={cn(
                          worldPage === 0 && "pointer-events-none opacity-50",
                        )}
                      />
                    </PaginationItem>
                    {paginationItems.map((item) =>
                      item.type === "ellipsis" ? (
                        <PaginationItem key={item.key}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={item.key}>
                          <PaginationLink
                            href="#"
                            isActive={item.index === worldPage}
                            onClick={(e) => {
                              e.preventDefault();
                              setWorldPage(item.index);
                            }}
                          >
                            {item.index + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setWorldPage((p) =>
                            Math.min(worldPageCount - 1, p + 1),
                          );
                        }}
                        className={cn(
                          worldPage === worldPageCount - 1 &&
                            "pointer-events-none opacity-50",
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>

          {/* ── Lorebooks column ── */}
          <div
            className={cn(
              "space-y-4",
              mobileTab === "worlds" && "hidden lg:block",
            )}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <LibraryBig className="h-5 w-5 text-primary" />
                Lorebooks
              </h2>
              <Badge variant="secondary">{filteredLorebooks.length}</Badge>
            </div>

            {filteredLorebooks.length > 0 ? (
              <div className="space-y-3">
                {filteredLorebooks.map((lorebook) => {
                  const world = worldById.get(lorebook.worldId);
                  const entryCount = lorebookEntryCounts.get(lorebook.id) || 0;

                  return (
                    <div
                      key={lorebook.id}
                      className="group rounded-2xl border border-border/60 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <h3 className="text-base font-semibold">
                            {lorebook.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {world?.title || "Unknown world"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[11px]"
                        >
                          {entryCount} entries
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {lorebook.summary || "No summary yet."}
                      </p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        {world && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full cursor-pointer sm:w-auto"
                            onClick={() => openWorldDetails(world.id)}
                          >
                            View world
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="w-full cursor-pointer sm:w-auto"
                        >
                          <Link href={`/lorebooks/${lorebook.id}`}>
                            Open full page
                          </Link>
                        </Button>
                      </div>
                      {world && (
                        <div className="mt-3 flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                          <span className="truncate">{world.title}</span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "border-0 text-[10px]",
                              worldKindBadges[world.kind],
                            )}
                          >
                            {worldKindLabels[world.kind]}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                {debouncedSearch
                  ? "No lorebooks match your search."
                  : "No lorebooks yet. Import one or create an entry."}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Bots by world shortcut ───────────────────────────────── */}
      {!isEmpty && (
        <section className="rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Layers3 className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Bots by world</h3>
                <p className="text-sm text-muted-foreground">
                  See all your bots organized by their Atlas world for quick
                  coverage review.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 cursor-pointer"
              onClick={() => {
                window.location.href = "/atlas/bot-series";
              }}
            >
              Open page
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* ═══ Dialogs ═══════════════════════════════════════════════ */}

      {/* ── World details ── */}
      <Dialog
        open={worldDetailsOpen}
        onOpenChange={(open) => {
          if (!open) closeWorldDetails();
          else setWorldDetailsOpen(true);
        }}
      >
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] overflow-hidden p-0 sm:max-w-4xl">
          <div className="flex h-full max-h-[92vh] flex-col">
            <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4 sm:px-6">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <PanelsTopLeft className="h-5 w-5 text-primary" />
                {selectedWorld?.title || "World details"}
              </DialogTitle>
              <DialogDescription>
                Lorebooks, bots, and canon for this world.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {selectedWorld ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={cn(
                          "border-0",
                          worldKindBadges[selectedWorld.kind],
                        )}
                      >
                        {worldKindLabels[selectedWorld.kind]}
                      </Badge>
                      <Badge
                        variant={
                          selectedWorld.status === "active"
                            ? "default"
                            : "outline"
                        }
                      >
                        {selectedWorld.status}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {selectedWorld.description || "No description yet."}
                    </p>
                  </div>

                  {/* Lore summary */}
                  {selectedWorld.loreSummary && (
                    <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Lore summary
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {selectedWorld.loreSummary}
                      </p>
                    </div>
                  )}

                  {/* Lorebooks */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <NotebookText className="h-4 w-4 text-primary" />
                        Pinned lorebooks
                      </div>
                      <Badge variant="secondary">
                        {featuredLorebooks.length}
                      </Badge>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto cursor-pointer justify-start rounded-xl p-3"
                        onClick={openImportDialog}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto cursor-pointer justify-start rounded-xl p-3"
                        onClick={handleExportClick}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto cursor-pointer justify-start rounded-xl p-3"
                        onClick={() => openEntryEditor()}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        New entry
                      </Button>
                    </div>

                    {featuredLorebooks.length > 0 ? (
                      <div className="space-y-2">
                        {featuredLorebooks.map((lorebook) => {
                          const loreEntryCount = entries.filter(
                            (e) => e.lorebookId === lorebook.id,
                          ).length;
                          return (
                            <div
                              key={lorebook.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setEntryEditorState(
                                  createEmptyEntryEditorState(
                                    selectedWorld.id,
                                    lorebook.id,
                                  ),
                                );
                                setEntryEditorOpen(true);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setEntryEditorState(
                                    createEmptyEntryEditorState(
                                      selectedWorld.id,
                                      lorebook.id,
                                    ),
                                  );
                                  setEntryEditorOpen(true);
                                }
                              }}
                              className="rounded-xl border border-border/60 bg-background/60 p-4 transition-colors hover:border-primary/30 hover:bg-background/80"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <div className="text-sm font-medium">
                                    {lorebook.title}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {loreEntryCount} entries
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    pinned
                                  </Badge>
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void removeFeaturedLorebook(lorebook.id);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                                {lorebook.summary || "No summary yet."}
                              </p>
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  className="w-full cursor-pointer sm:w-auto"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Link href={`/lorebooks/${lorebook.id}`}>
                                    Open full page
                                  </Link>
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="w-full cursor-pointer sm:w-auto"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void deleteLorebook(lorebook.id);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                        No pinned lorebooks yet. Import one to see it here.
                      </div>
                    )}
                  </div>

                  {/* Linked bots */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Bot className="h-4 w-4 text-primary" />
                      Linked bots
                      <Badge variant="secondary" className="ml-auto">
                        {selectedWorld.botIds.length}
                      </Badge>
                    </div>
                    {selectedWorld.botIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedWorld.botIds.map((botId) => {
                          const bot = botMap.get(botId);
                          return (
                            <Badge
                              key={botId}
                              variant="secondary"
                              className={cn(!bot && "opacity-60 italic")}
                            >
                              {bot?.name || "Unknown bot"}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No bots linked yet.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  Select a world to see its details.
                </div>
              )}
            </div>

            {selectedWorld && (
              <div className="shrink-0 border-t border-border/60 px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer sm:flex-1"
                    onClick={() => openWorldEditor(selectedWorld)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit world
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full cursor-pointer sm:flex-1"
                    onClick={() => deleteWorld(selectedWorld.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete world
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── World editor ── */}
      <Dialog open={worldEditorOpen} onOpenChange={setWorldEditorOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {worldEditorState.id ? "Edit world" : "New world"}
            </DialogTitle>
            <DialogDescription>
              Create a series, universe, location, or timeline and attach bots
              and lorebooks.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="atlas-title">Title</Label>
                <Input
                  id="atlas-title"
                  value={worldEditorState.title}
                  onChange={(e) => {
                    const nextTitle = e.target.value;
                    setWorldEditorState((prev) => ({
                      ...prev,
                      title: nextTitle,
                      slug: prev.slug || slugify(nextTitle),
                    }));
                  }}
                  placeholder="My fantasy series"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="atlas-slug">Slug</Label>
                  <Input
                    id="atlas-slug"
                    value={worldEditorState.slug}
                    onChange={(e) =>
                      setWorldEditorState((prev) => ({
                        ...prev,
                        slug: slugify(e.target.value),
                      }))
                    }
                    placeholder="my-fantasy-series"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="atlas-kind">Type</Label>
                  <Select
                    value={worldEditorState.kind}
                    onValueChange={(value) =>
                      setWorldEditorState((prev) => ({
                        ...prev,
                        kind: value as AtlasWorldKind,
                      }))
                    }
                  >
                    <SelectTrigger id="atlas-kind" className="w-full">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(worldKindLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="atlas-status">Status</Label>
                <Select
                  value={worldEditorState.status}
                  onValueChange={(value) =>
                    setWorldEditorState((prev) => ({
                      ...prev,
                      status: value as AtlasWorldStatus,
                    }))
                  }
                >
                  <SelectTrigger id="atlas-status" className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="atlas-description">Description</Label>
                <Textarea
                  id="atlas-description"
                  value={worldEditorState.description}
                  onChange={(e) =>
                    setWorldEditorState((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="One-line overview of the world or series."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="atlas-lore">Lore summary</Label>
                <Textarea
                  id="atlas-lore"
                  value={worldEditorState.loreSummary}
                  onChange={(e) =>
                    setWorldEditorState((prev) => ({
                      ...prev,
                      loreSummary: e.target.value,
                    }))
                  }
                  placeholder="Canon notes, timeline, places, relationships, rules, etc."
                  rows={7}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Bot className="h-4 w-4 text-primary" />
                  Link bots
                </div>
                <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                  {bots.length > 0 ? (
                    bots.map((bot: BotType) => (
                      <label
                        key={bot.id}
                        className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/60 p-3 text-sm transition-colors hover:border-primary/30"
                      >
                        <Checkbox
                          checked={worldEditorState.botIds.includes(bot.id)}
                          onCheckedChange={() =>
                            toggleSelection("botIds", bot.id)
                          }
                        />
                        <span className="min-w-0">
                          <span className="block font-medium">{bot.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {bot.shortDescription || "No description"}
                          </span>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No bots available yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <NotebookText className="h-4 w-4 text-primary" />
                  Featured lorebooks
                </div>
                <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                  {worldEditorState.id ? (
                    selectedWorldLorebooks.length > 0 ? (
                      selectedWorldLorebooks.map((lorebook) => (
                        <label
                          key={lorebook.id}
                          className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/60 p-3 text-sm transition-colors hover:border-primary/30"
                        >
                          <Checkbox
                            checked={worldEditorState.featuredLorebookIds.includes(
                              lorebook.id,
                            )}
                            onCheckedChange={() =>
                              toggleSelection(
                                "featuredLorebookIds",
                                lorebook.id,
                              )
                            }
                          />
                          <span className="min-w-0">
                            <span className="block font-medium">
                              {lorebook.title}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {lorebook.summary || "No summary"}
                            </span>
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No lorebooks available yet for this world.
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Save the world first, then feature its lorebooks.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWorldEditorOpen(false)}
              className="w-full cursor-pointer sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={saveWorld}
              className="w-full cursor-pointer sm:w-auto"
              disabled={!worldEditorState.title.trim()}
            >
              {worldEditorState.id ? "Save changes" : "Create world"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Entry editor ── */}
      <Dialog open={entryEditorOpen} onOpenChange={setEntryEditorOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {entryEditorState.id ? "Edit entry" : "New lorebook entry"}
            </DialogTitle>
            <DialogDescription>
              Add a lore note, character profile, location, or timeline block.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entry-world">World</Label>
                <Select
                  value={entryEditorState.worldId || selectedWorldId || ""}
                  onValueChange={(value) => {
                    const nextLorebookId =
                      lorebooks.find((l) => l.worldId === value)?.id ?? "";
                    setEntryEditorState((prev) => ({
                      ...prev,
                      worldId: value,
                      lorebookId: nextLorebookId,
                    }));
                  }}
                >
                  <SelectTrigger id="entry-world" className="w-full">
                    <SelectValue placeholder="Select a world" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedWorlds.length > 0 ? (
                      sortedWorlds.map((world) => (
                        <SelectItem key={world.id} value={world.id}>
                          {world.title}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__none__" disabled>
                        No worlds available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entry-lorebook">Lorebook</Label>
                <Select
                  value={entryEditorState.lorebookId}
                  onValueChange={(value) =>
                    setEntryEditorState((prev) => ({
                      ...prev,
                      lorebookId: value,
                    }))
                  }
                >
                  <SelectTrigger id="entry-lorebook" className="w-full">
                    <SelectValue placeholder="Select a lorebook" />
                  </SelectTrigger>
                  <SelectContent>
                    {entryEditorLorebooks.length > 0 ? (
                      entryEditorLorebooks.map((lorebook) => (
                        <SelectItem key={lorebook.id} value={lorebook.id}>
                          {lorebook.title}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__none__" disabled>
                        No lorebooks available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entry-kind">Type</Label>
                <Select
                  value={entryEditorState.kind}
                  onValueChange={(value) =>
                    setEntryEditorState((prev) => ({
                      ...prev,
                      kind: value as AtlasEntryKind,
                    }))
                  }
                >
                  <SelectTrigger id="entry-kind" className="w-full">
                    <SelectValue placeholder="Select a type" />
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
              <Label htmlFor="entry-title">Title</Label>
              <Input
                id="entry-title"
                value={entryEditorState.title}
                onChange={(e) =>
                  setEntryEditorState((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="The old capital"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry-body">Body</Label>
              <Textarea
                id="entry-body"
                value={entryEditorState.body}
                onChange={(e) =>
                  setEntryEditorState((prev) => ({
                    ...prev,
                    body: e.target.value,
                  }))
                }
                placeholder="Write the lore, note, or canon block here."
                rows={8}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEntryEditorOpen(false)}
              className="w-full cursor-pointer sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={saveEntry}
              className="w-full cursor-pointer sm:w-auto"
            >
              {entryEditorState.id ? "Save changes" : "Save entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import dialog ── */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import lorebook</DialogTitle>
            <DialogDescription>
              Paste a Janitor AI JSON export or load a file. If the package
              includes world metadata, Atlas creates that world automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="lorebook-name">Lorebook name</Label>
              <Input
                id="lorebook-name"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="Lorebook"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lorebook-file">JSON file</Label>
              <div
                className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleDrop(e.dataTransfer.files);
                }}
              >
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs sm:text-sm">
                    Drag & drop a JSON file here, or
                  </span>
                  <Input
                    id="lorebook-file"
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => {
                      void handleImportFile(e.target.files?.[0] ?? null);
                    }}
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lorebook-json">Lorebook JSON</Label>
              <Textarea
                id="lorebook-json"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='{"version":1,"world":{"title":"..."},"entries":[...]}'
                rows={12}
                className="min-h-60"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              className="w-full cursor-pointer sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={importLorebook}
              className="w-full cursor-pointer sm:w-auto"
            >
              Import lorebook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk delete confirmation ── */}
      <AlertDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedWorldIds.size} worlds?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the worlds, all their lorebooks, and all entries
              permanently. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
