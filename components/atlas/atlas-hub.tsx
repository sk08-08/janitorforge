// ============================================================================
// JanitorForge - Atlas Hub
// Persistent hub for series, lorebooks, and creator spaces
// ============================================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Globe,
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
  Layout,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Bot as BotType } from "@/lib/types";
import { toast } from "sonner";
import { CreatorPages } from "./creator-pages";
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
  entryKindBadges,
  WORLDS_PER_PAGE,
  WORLD_CARD_HEIGHT,
  WORLD_LIST_GAP,
  WORLD_LIST_PADDING,
  WORLD_LIST_MAX_HEIGHT,
  WORLD_LIST_MIN_HEIGHT,
  PAGINATION_HEIGHT,
  LOREBOOK_LIST_HEIGHT,
  LOREBOOK_CARD_HEIGHT,
  LOREBOOK_LIST_GAP,
  LOREBOOK_LIST_PADDING,
  LEGACY_ATLAS_STORAGE_KEY,
  slugify,
  mapWorldRow,
  mapLorebookRow,
  mapEntryRow,
  buildWorldRow,
  createEmptyWorldEditorState,
  createEmptyEntryEditorState,
  createLorebookPackage,
  createJanitorLorebookExport,
  mapEntryKindToJanitorCategory,
  mapJanitorCategoryToEntryKind,
  buildImportedEntryBody,
  stripImportedMetadataBlock,
  isAtlasPackage,
} from "./atlas-utils";

const ATLAS_SELECTED_WORLD_STORAGE_KEY = "atlas-selected-world-id";
const ATLAS_WORLD_PAGE_STORAGE_KEY = "atlas-world-page";
const ATLAS_SHOW_CREATOR_PAGES_STORAGE_KEY = "atlas-show-creator-pages";

function HubCard({
  title,
  description,
  icon: Icon,
  badge,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  icon: typeof BookOpen;
  badge?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75 transition-all hover:border-primary/40 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-border/50">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
          {badge && (
            <Badge variant="secondary" className="shrink-0 self-start">
              {badge}
            </Badge>
          )}
        </div>
      </CardHeader>
      {actionLabel && onAction && (
        <CardContent className="pt-0">
          <Button
            variant="ghost"
            className="w-full justify-between px-2 text-xs"
            onClick={onAction}
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

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
  const [showCreatorPages, setShowCreatorPages] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem(ATLAS_SHOW_CREATOR_PAGES_STORAGE_KEY) === "true"
    );
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      ATLAS_SHOW_CREATOR_PAGES_STORAGE_KEY,
      String(showCreatorPages),
    );
  }, [showCreatorPages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedWorldId = localStorage.getItem(ATLAS_SELECTED_WORLD_STORAGE_KEY);
    const savedPage = localStorage.getItem(ATLAS_WORLD_PAGE_STORAGE_KEY);

    if (savedWorldId) {
      setSelectedWorldId(savedWorldId);
      setWorldDetailsOpen(true);
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
        const supabase = createClient();
        const access = await getCurrentUserAccess(supabase);
        if (!mounted) return;

        const userId = access.user?.id ?? null;
        setCurrentUserId(userId);

        if (!userId) {
          setWorlds([]);
          setLorebooks([]);
          setEntries([]);
          return;
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
            .order("updated_at", { ascending: false }),
          supabase
            .from("atlas_lorebooks")
            .select("*")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false }),
          supabase
            .from("atlas_entries")
            .select("*")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false }),
        ]);

        if (!mounted) return;
        if (worldError) throw worldError;
        if (lorebookError) throw lorebookError;
        if (entryError) throw entryError;

        const nextWorlds = Array.isArray(worldData)
          ? worldData.map((row) => mapWorldRow(row as AtlasWorldRow))
          : [];
        const nextLorebooks = Array.isArray(lorebookData)
          ? lorebookData.map((row) => mapLorebookRow(row as AtlasLorebookRow))
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

        if (nextWorlds.length > 0) {
          setWorlds(nextWorlds);
        } else if (typeof window !== "undefined") {
          const legacySaved = localStorage.getItem(LEGACY_ATLAS_STORAGE_KEY);
          if (legacySaved) {
            const legacyWorlds = JSON.parse(legacySaved) as AtlasWorld[];
            if (Array.isArray(legacyWorlds) && legacyWorlds.length > 0) {
              const migrationPayload = legacyWorlds.map((world) =>
                buildWorldRow(world, userId),
              );

              const { data: migratedData, error: migrateError } = await supabase
                .from("atlas_worlds")
                .upsert(migrationPayload, { onConflict: "id" })
                .select("*")
                .order("updated_at", { ascending: false });

              if (migrateError) throw migrateError;
              localStorage.removeItem(LEGACY_ATLAS_STORAGE_KEY);
              setWorlds(
                Array.isArray(migratedData)
                  ? migratedData.map((row) => mapWorldRow(row as AtlasWorldRow))
                  : [],
              );
            }
          } else {
            setWorlds([]);
          }
        } else {
          setWorlds([]);
        }

        setLorebooks(nextLorebooks);
        setEntries(normalizedEntries);

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

  const worldListHeight = useMemo(() => {
    const itemCount = paginatedWorlds.length;
    const estimatedHeight =
      itemCount * WORLD_CARD_HEIGHT +
      Math.max(itemCount - 1, 0) * WORLD_LIST_GAP +
      WORLD_LIST_PADDING;
    const extra = worldPageCount > 1 ? PAGINATION_HEIGHT : 0;
    const total = estimatedHeight + extra;
    return Math.max(
      WORLD_LIST_MIN_HEIGHT,
      Math.min(total, WORLD_LIST_MAX_HEIGHT),
    );
  }, [paginatedWorlds, worldPageCount]);

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

  const pinnedLorebooksHeight = useMemo(() => {
    if (featuredLorebooks.length <= 2) return null;

    const estimatedHeight =
      featuredLorebooks.length * LOREBOOK_CARD_HEIGHT +
      Math.max(featuredLorebooks.length - 1, 0) * LOREBOOK_LIST_GAP +
      LOREBOOK_LIST_PADDING;

    return Math.min(estimatedHeight, LOREBOOK_LIST_HEIGHT);
  }, [featuredLorebooks]);

  const linkedBotCount = worlds.reduce(
    (total, world) => total + world.botIds.length,
    0,
  );
  const featuredCount = worlds.reduce(
    (total, world) => total + world.featuredLorebookIds.length,
    0,
  );
  const totalEntries = entries.length;

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
        .delete()
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
        .delete()
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
              world_id: targetWorldId,
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
        .delete()
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

  // Show Creator Pages if active
  if (showCreatorPages) {
    return (
      <CreatorPages
        onBack={() => {
          setShowCreatorPages(false);
        }}
      />
    );
  }

  if (!accessLoaded) {
    return (
      <div className="p-4 sm:p-6 md:p-8 lg:p-10">
        <Card className="border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75 xl:sticky xl:top-6">
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading Atlas worlds...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="mb-8 sm:mb-10">
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Atlas
            </h1>
            <p className="mt-1 max-w-2xl text-sm sm:text-base text-muted-foreground">
              A workspace for series, universes, and lorebooks. Organize bots,
              canon, and worldbuilding notes in one place.
            </p>
          </div>
          <Button
            onClick={() => openWorldEditor()}
            className="w-full cursor-pointer sm:w-auto md:self-start"
          >
            <Plus className="mr-2 h-4 w-4" />
            New world
          </Button>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Worlds",
            value: worlds.length,
            description: "Series, universes, locations, and timelines",
          },
          {
            label: "Linked bots",
            value: linkedBotCount,
            description: "Bots organized inside Atlas worlds",
          },
          {
            label: "Lore entries",
            value: totalEntries,
            description: "Canon notes, characters, locations, and timelines",
          },
          {
            label: "Lorebooks",
            value: lorebooks.length,
            description: "Imported lorebooks across all worlds",
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className="border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold tracking-tight sm:text-3xl">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <Card className="border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <LibraryBig className="h-4 w-4 text-primary" />
                Worlds
              </CardTitle>
              <CardDescription className="max-w-2xl">
                Create series or universes and attach bots and featured
                lorebooks to them. This panel fills the page width so the list
                can breathe when the collection grows.
              </CardDescription>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 self-start sm:w-auto sm:flex-nowrap">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <SearchInput
                  value={search}
                  onChange={(v) => {
                    setSearch(v);
                    setWorldPage(0);
                  }}
                  placeholder="Search worlds, lorebooks, entries..."
                  shortcutKey="/"
                  className="w-full sm:w-64"
                />
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{sortedWorlds.length} total</Badge>
                  <div className="text-sm text-muted-foreground">
                    Matches: {filteredWorlds.length} worlds ·{" "}
                    {filteredLorebooks.length} lorebooks ·{" "}
                    {filteredEntries.length} entries
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full cursor-pointer sm:w-auto"
                onClick={() => openWorldEditor()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedWorldIds.size > 0 && (
              <Card className="mb-4 border-primary/30 bg-primary/5">
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="text-sm font-medium">
                    {selectedWorldIds.size} world
                    {selectedWorldIds.size === 1 ? "" : "s"} selected
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkExport}
                      className="cursor-pointer"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export selected
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      className="cursor-pointer"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete selected
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
                </CardContent>
              </Card>
            )}
            <div
              className="space-y-3"
              style={{ height: `${worldListHeight}px` }}
            >
              <div className="flex flex-col h-full">
                <ScrollArea className="flex-1 pr-2">
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
                              "group w-full rounded-xl border p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm sm:p-5 flex items-start gap-3",
                              isSelected
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border/70 bg-background/50",
                            )}
                          >
                            <div className="pt-1">
                              <Checkbox
                                className="cursor-pointer"
                                checked={selectedWorldIds.has(world.id)}
                                onCheckedChange={(val) => {
                                  // prevent parent click
                                  toggleWorldSelection(world.id, val === true);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Select world ${world.title}`}
                              />
                            </div>
                            <div
                              className="flex-1"
                              onClick={() => openWorldDetails(world.id)}
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                <div className="min-w-0 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate font-semibold">
                                      {world.title}
                                    </h3>
                                    <Badge
                                      variant="secondary"
                                      className={cn(
                                        "border-0",
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
                                    >
                                      {world.status}
                                    </Badge>
                                  </div>
                                  <p className="line-clamp-2 text-sm text-muted-foreground">
                                    {world.description || "No description yet."}
                                  </p>
                                </div>
                                <div className="shrink-0 text-left text-xs text-muted-foreground sm:text-right">
                                  <div>{botCount} bots</div>
                                  <div>{loreCount} lorebooks</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                        No worlds yet. Create your first series or universe to
                        start organizing your bots and lore.
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {worldPageCount > 1 && (
                  <div className="pt-2">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(event) => {
                              event.preventDefault();
                              setWorldPage((prev) => Math.max(0, prev - 1));
                            }}
                            className={cn(
                              worldPage === 0 &&
                                "pointer-events-none opacity-50",
                            )}
                          />
                        </PaginationItem>

                        {paginationItems.map((item) => {
                          if (item.type === "ellipsis") {
                            return (
                              <PaginationItem key={item.key}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }

                          const isCurrent = item.index === worldPage;

                          return (
                            <PaginationItem key={item.key}>
                              <PaginationLink
                                href="#"
                                size="default"
                                isActive={isCurrent}
                                onClick={(event) => {
                                  event.preventDefault();
                                  setWorldPage(item.index);
                                }}
                              >
                                {item.index + 1}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(event) => {
                              event.preventDefault();
                              setWorldPage((prev) =>
                                Math.min(worldPageCount - 1, prev + 1),
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
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <HubCard
            title="Bots by world"
            description="Open a visual page that groups your bots by Atlas worlds so you can review coverage quickly."
            icon={Layers3}
            badge={`${bots.length} available`}
            actionLabel="Open world bot page"
            onAction={() => {
              window.location.href = "/atlas/bot-series";
            }}
          />
          <HubCard
            title="Creator Pages"
            description="Build your public creator page. Showcase your bots, group them into worlds, and customize the look and feel."
            icon={Layout}
            badge="New"
            actionLabel="Open Creator Pages"
            onAction={() => setShowCreatorPages(true)}
          />
        </div>
      </div>

      <Dialog
        open={worldDetailsOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeWorldDetails();
          } else {
            setWorldDetailsOpen(true);
          }
        }}
      >
        <DialogContent className="h-[92vh] max-w-[calc(100vw-1rem)] overflow-hidden p-0 sm:h-[90vh] sm:max-w-4xl">
          <div className="flex h-full min-h-0 flex-col">
            <DialogHeader className="border-b border-border/70 px-4 py-4 sm:px-6 sm:py-5">
              <DialogTitle className="flex items-center gap-2 text-base">
                <PanelsTopLeft className="h-4 w-4 text-primary" />
                World Details
              </DialogTitle>
              <DialogDescription>
                View the selected world, its linked bots, and its lorebook
                summary in a dedicated modal.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="min-h-0 flex-1 px-4 py-4 sm:px-6 sm:py-5">
              <div className="space-y-5 pr-2">
                {selectedWorld ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {selectedWorld.title}
                        </h3>
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
                      <p className="text-sm text-muted-foreground">
                        {selectedWorld.description || "No description yet."}
                      </p>
                    </div>

                    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Lore summary
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {selectedWorld.loreSummary ||
                          "Add world lore, canon notes, timelines, or important references here."}
                      </p>
                    </div>

                    <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <NotebookText className="h-4 w-4 text-primary" />
                          Lorebooks in this world
                        </div>
                        <div className="text-2xl font-bold tracking-tight sm:text-3xl">
                          {featuredLorebooks.length}
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer justify-start"
                          onClick={openImportDialog}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Import
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer justify-start"
                          onClick={handleExportClick}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer justify-start"
                          onClick={() => openEntryEditor()}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add
                        </Button>
                      </div>

                      <ScrollArea
                        style={{
                          height: pinnedLorebooksHeight
                            ? `${pinnedLorebooksHeight}px`
                            : "auto",
                        }}
                      >
                        <div className="space-y-2">
                          {featuredLorebooks.length > 0 ? (
                            featuredLorebooks.map((lorebook) => (
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
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    setEntryEditorState(
                                      createEmptyEntryEditorState(
                                        selectedWorld.id,
                                        lorebook.id,
                                      ),
                                    );
                                    setEntryEditorOpen(true);
                                  }
                                }}
                                className="w-full rounded-xl border border-border/70 bg-background/70 p-3 text-left transition-colors hover:border-primary/40 hover:bg-background/90"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 space-y-1">
                                    <div className="truncate text-sm font-medium">
                                      {lorebook.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {
                                        entries.filter(
                                          (entry) =>
                                            entry.lorebookId === lorebook.id,
                                        ).length
                                      }{" "}
                                      entries
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <Badge variant="outline">pinned</Badge>
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="ghost"
                                      className="cursor-pointer"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void removeFeaturedLorebook(
                                          lorebook.id,
                                        );
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
                                    onClick={(event) => event.stopPropagation()}
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
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void deleteLorebook(lorebook.id);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete lorebook
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-xl border border-dashed border-border/70 bg-background/70 p-6 text-center text-sm text-muted-foreground">
                              No lorebooks yet.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-medium">Linked bots</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedWorld.botIds.length > 0 ? (
                          selectedWorld.botIds.map((botId) => {
                            const bot = botMap.get(botId);
                            return (
                              <Badge key={botId} variant="secondary">
                                {bot?.name || botId}
                              </Badge>
                            );
                          })
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No bots linked yet.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
                      Imported lorebooks are pinned automatically so they appear
                      here immediately.
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    Create a world to see its imported lorebooks, linked bots,
                    and canon here.
                  </div>
                )}
              </div>
            </ScrollArea>

            {selectedWorld ? (
              <div className="border-t border-border/70 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer sm:flex-1"
                    onClick={() => openWorldEditor(selectedWorld)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full cursor-pointer sm:flex-1"
                    onClick={() => deleteWorld(selectedWorld.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={worldEditorOpen} onOpenChange={setWorldEditorOpen}>
        <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {worldEditorState.id ? "Edit world" : "New world"}
            </DialogTitle>
            <DialogDescription>
              Create a series, universe, location, or timeline and attach bots
              and lorebooks to it.
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

              <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Bot className="h-4 w-4 text-primary" />
                  Link bots
                </div>
                <ScrollArea className="mt-3 h-48 pr-3">
                  <div className="space-y-2">
                    {bots.length > 0 ? (
                      bots.map((bot: BotType) => (
                        <label
                          key={bot.id}
                          className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/70 p-3 text-sm"
                        >
                          <Checkbox
                            checked={worldEditorState.botIds.includes(bot.id)}
                            onCheckedChange={() =>
                              toggleSelection("botIds", bot.id)
                            }
                          />
                          <span className="min-w-0">
                            <span className="block font-medium">
                              {bot.name}
                            </span>
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
                </ScrollArea>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <NotebookText className="h-4 w-4 text-primary" />
                  Featured lorebooks
                </div>
                <ScrollArea className="mt-3 h-48 pr-3">
                  <div className="space-y-2">
                    {worldEditorState.id ? (
                      selectedWorldLorebooks.length > 0 ? (
                        selectedWorldLorebooks.map((lorebook) => (
                          <label
                            key={lorebook.id}
                            className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/70 p-3 text-sm"
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
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full cursor-pointer sm:w-auto"
              variant="outline"
              onClick={() => setWorldEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveWorld}
              className="w-full cursor-pointer sm:w-auto"
              disabled={!worldEditorState.title.trim()}
            >
              Save world
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={entryEditorOpen} onOpenChange={setEntryEditorOpen}>
        <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {entryEditorState.id
                ? "Edit lorebook entry"
                : "New lorebook entry"}
            </DialogTitle>
            <DialogDescription>
              Add or update a lore note, character profile, location sheet, or
              timeline block in the selected world.
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
                      lorebooks.find((lorebook) => lorebook.worldId === value)
                        ?.id ?? "";
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
              className="w-full cursor-pointer sm:w-auto"
              onClick={saveEntry}
            >
              {entryEditorState.id ? "Save changes" : "Save entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1rem)] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import lorebook</DialogTitle>
            <DialogDescription>
              Name the lorebook first, then paste a Janitor AI JSON export or
              load a file. If the package includes world metadata, Atlas will
              create that world and import the entries.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-3">
            <div className="space-y-4 pb-2">
              <div className="space-y-2">
                <Label htmlFor="lorebook-name">Lorebook name</Label>
                <Input
                  id="lorebook-name"
                  value={importName}
                  onChange={(event) => setImportName(event.target.value)}
                  placeholder="Lorebook"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lorebook-file">JSON file</Label>
                <div
                  className="rounded-md border border-dashed border-border/60 p-3 text-sm text-muted-foreground"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void handleDrop(e.dataTransfer.files);
                  }}
                >
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs sm:text-sm">
                      Drag & drop a JSON file here, or
                    </div>
                    <Input
                      id="lorebook-file"
                      type="file"
                      accept="application/json,.json"
                      onChange={(event) => {
                        void handleImportFile(event.target.files?.[0] ?? null);
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
                  onChange={(event) => setImportText(event.target.value)}
                  placeholder='{"version":1,"world":{"title":"..."},"entries":[...]}'
                  rows={12}
                  className="min-h-72"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              className="w-full cursor-pointer sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              className="w-full cursor-pointer sm:w-auto"
              onClick={importLorebook}
            >
              Import lorebook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
