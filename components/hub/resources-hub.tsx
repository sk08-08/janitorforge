"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownField } from "@/components/ui/markdown-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Eye,
  ExternalLink,
  Link2,
  Plus,
  Pencil,
  ArrowUp,
  ArrowDown,
  Trash2,
  BookOpen,
  ArrowRight,
  Globe,
  NotebookText,
  Layers3,
  Sparkles,
  Shield,
  Heart,
  Star,
  Info,
  Search,
  ShieldCheck,
  UserRound,
  Brain,
  Palette,
  Bot,
  PenLine,
  AppWindow,
  Folder,
  Lock,
  Server,
  Code,
  PenLineIcon,
  Upload,
  MessageCircle,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MarkdownContent } from "./markdown-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ResourceSectionRow = {
  id: string;
  title: string;
  description: string | null;
  icon_name: string | null;
  accent_color: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type ResourceEntryRow = {
  id: string;
  section_id: string;
  title: string;
  summary: string | null;
  url: string | null;
  label: string | null;
  is_platform_pinned: boolean;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type ResourceSectionFormState = {
  title: string;
  description: string;
  iconName: string;
  accentColor: string;
  isPublished: boolean;
};

type ResourceEntryFormState = {
  sectionId: string;
  title: string;
  summary: string;
  url: string;
  label: string;
  isPlatformPinned: boolean;
  isPublished: boolean;
};

type ResourceCommentRow = {
  id: string;
  entry_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

const RESOURCE_SECTION_STORAGE_KEY = "janitorforge-resources-section";
const RESOURCE_ENTRY_STORAGE_KEY = "janitorforge-resources-entry";
const RESOURCE_VIEWER_STORAGE_KEY = "janitorforge-resources-viewer";
const emptySectionForm: ResourceSectionFormState = {
  title: "",
  description: "",
  iconName: "book-open",
  accentColor: "#7c3aed",
  isPublished: true,
};

const emptyEntryForm: ResourceEntryFormState = {
  sectionId: "",
  title: "",
  summary: "",
  url: "",
  label: "",
  isPlatformPinned: false,
  isPublished: true,
};

type DeleteTarget =
  | { kind: "section"; id: string; title: string }
  | { kind: "entry"; id: string; title: string }
  | null;

const sectionIconOptions = [
  { value: "book-open", label: "Book", icon: BookOpen },
  { value: "heart", label: "Heart", icon: Heart },
  { value: "star", label: "Star", icon: Star },
  { value: "info", label: "Info", icon: Info },
  { value: "search", label: "Search", icon: Search },
  { value: "shield-check", label: "Shield Check", icon: ShieldCheck },
  { value: "user-round", label: "User Round", icon: UserRound },
  { value: "code", label: "Code", icon: Code },
  { value: "brain", label: "Brain", icon: Brain },
  { value: "palette", label: "Palette", icon: Palette },
  { value: "bot", label: "Bot", icon: Bot },
  { value: "pen-line", label: "Pen Line", icon: PenLine },
  { value: "app-window", label: "App Window", icon: AppWindow },
  { value: "folder", label: "Folder", icon: Folder },
  { value: "server", label: "Server", icon: Server },
  { value: "lock", label: "Lock", icon: Lock },
  { value: "globe", label: "Globe", icon: Globe },
  { value: "notebook-text", label: "Notebook", icon: NotebookText },
  { value: "layers-3", label: "Layers", icon: Layers3 },
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "shield", label: "Shield", icon: Shield },
];

const sectionIconMap = Object.fromEntries(
  sectionIconOptions.map((option) => [option.value, option.icon]),
) as Record<string, typeof BookOpen>;

function getOrCreateResourceViewerFingerprint() {
  if (typeof window === "undefined") return "";

  const current = localStorage.getItem(RESOURCE_VIEWER_STORAGE_KEY);
  if (current && current.trim()) return current;

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(RESOURCE_VIEWER_STORAGE_KEY, generated);
  return generated;
}

export function ResourcesHub() {
  const [sections, setSections] = useState<ResourceSectionRow[]>([]);
  const [entries, setEntries] = useState<ResourceEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [entryDetailOpen, setEntryDetailOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [sectionForm, setSectionForm] =
    useState<ResourceSectionFormState>(emptySectionForm);
  const [entryForm, setEntryForm] =
    useState<ResourceEntryFormState>(emptyEntryForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [dislikeCounts, setDislikeCounts] = useState<Record<string, number>>(
    {},
  );
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {},
  );
  const [myReactions, setMyReactions] = useState<Record<string, -1 | 0 | 1>>(
    {},
  );
  const [commentsByEntry, setCommentsByEntry] = useState<
    Record<string, ResourceCommentRow[]>
  >({});
  const [commentDraft, setCommentDraft] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const access = await getCurrentUserAccess(supabase);
      setIsAdmin(access.isAdmin);
      setAuthUserId(access.user?.id || null);

      let sectionQuery = supabase
        .from("hub_resource_sections")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      let entryQuery = supabase
        .from("hub_resource_entries")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!access.isAdmin) {
        sectionQuery = sectionQuery.eq("is_published", true);
        entryQuery = entryQuery.eq("is_published", true);
      }

      const [
        { data: sectionData, error: sectionError },
        { data: entryData, error: entryError },
      ] = await Promise.all([sectionQuery, entryQuery]);

      if (sectionError) throw sectionError;
      if (entryError) throw entryError;

      setSections((sectionData || []) as ResourceSectionRow[]);
      setEntries((entryData || []) as ResourceEntryRow[]);
    } catch (error: any) {
      console.error("Failed to load resources hub:", error);
      setSections([]);
      setEntries([]);
      toast.error(error.message || "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleEntries = useMemo(() => {
    if (!selectedSectionId) return [];
    return entries.filter((entry) => entry.section_id === selectedSectionId);
  }, [entries, selectedSectionId]);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? null,
    [sections, selectedSectionId],
  );

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [entries, selectedEntryId],
  );

  const entryCountBySection = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      counts.set(entry.section_id, (counts.get(entry.section_id) || 0) + 1);
    });
    return counts;
  }, [entries]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (selectedSectionId) {
      localStorage.setItem(RESOURCE_SECTION_STORAGE_KEY, selectedSectionId);
    } else {
      localStorage.removeItem(RESOURCE_SECTION_STORAGE_KEY);
    }
  }, [selectedSectionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (selectedEntryId) {
      localStorage.setItem(RESOURCE_ENTRY_STORAGE_KEY, selectedEntryId);
    } else {
      localStorage.removeItem(RESOURCE_ENTRY_STORAGE_KEY);
    }
  }, [selectedEntryId]);

  useEffect(() => {
    if (loading || hydrated) return;
    if (sections.length === 0) {
      setSelectedSectionId(null);
      setSelectedEntryId(null);
      setHydrated(true);
      return;
    }

    const savedSectionId = localStorage.getItem(RESOURCE_SECTION_STORAGE_KEY);
    const savedEntryId = localStorage.getItem(RESOURCE_ENTRY_STORAGE_KEY);
    const resolvedSection =
      sections.find((section) => section.id === savedSectionId) ?? sections[0];

    setSelectedSectionId(resolvedSection.id);

    const sectionEntries = entries.filter(
      (entry) => entry.section_id === resolvedSection.id,
    );
    const resolvedEntry =
      sectionEntries.find((entry) => entry.id === savedEntryId) ??
      sectionEntries[0] ??
      null;

    setSelectedEntryId(resolvedEntry?.id ?? null);
    setHydrated(true);
  }, [loading, hydrated, sections, entries]);

  useEffect(() => {
    if (!selectedSectionId || sections.length === 0) return;
    const sectionExists = sections.some(
      (section) => section.id === selectedSectionId,
    );
    if (!sectionExists) {
      setSelectedSectionId(sections[0]?.id ?? null);
      return;
    }

    const sectionEntries = entries.filter(
      (entry) => entry.section_id === selectedSectionId,
    );
    if (sectionEntries.length === 0) {
      setSelectedEntryId(null);
      return;
    }

    const entryExists = sectionEntries.some(
      (entry) => entry.id === selectedEntryId,
    );
    if (!entryExists) {
      setSelectedEntryId(sectionEntries[0].id);
    }
  }, [selectedSectionId, selectedEntryId, sections, entries]);

  const loadEntryMetrics = useCallback(
    async (entryIds: string[], userId?: string | null) => {
      if (entryIds.length === 0) {
        setViewCounts({});
        setLikeCounts({});
        setDislikeCounts({});
        setCommentCounts({});
        setMyReactions({});
        return;
      }

      const supabase = createClient();
      const [viewsRes, reactionsRes, commentsRes, mineRes] = await Promise.all([
        supabase
          .from("hub_resource_entry_views")
          .select("entry_id")
          .in("entry_id", entryIds),
        supabase
          .from("hub_resource_entry_reactions")
          .select("entry_id, reaction")
          .in("entry_id", entryIds),
        supabase
          .from("active_hub_resource_entry_comments")
          .select("entry_id")
          .in("entry_id", entryIds),
        userId
          ? supabase
              .from("hub_resource_entry_reactions")
              .select("entry_id, reaction")
              .eq("user_id", userId)
              .in("entry_id", entryIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (viewsRes.error || reactionsRes.error || commentsRes.error) return;

      const nextViews: Record<string, number> = {};
      const nextLikes: Record<string, number> = {};
      const nextDislikes: Record<string, number> = {};
      const nextComments: Record<string, number> = {};

      for (const entryId of entryIds) {
        nextViews[entryId] = 0;
        nextLikes[entryId] = 0;
        nextDislikes[entryId] = 0;
        nextComments[entryId] = 0;
      }

      (viewsRes.data || []).forEach((row: any) => {
        nextViews[row.entry_id] = (nextViews[row.entry_id] || 0) + 1;
      });

      (reactionsRes.data || []).forEach((row: any) => {
        if (row.reaction === 1) {
          nextLikes[row.entry_id] = (nextLikes[row.entry_id] || 0) + 1;
        }
        if (row.reaction === -1) {
          nextDislikes[row.entry_id] = (nextDislikes[row.entry_id] || 0) + 1;
        }
      });

      (commentsRes.data || []).forEach((row: any) => {
        nextComments[row.entry_id] = (nextComments[row.entry_id] || 0) + 1;
      });

      const nextMine: Record<string, -1 | 0 | 1> = {};
      (mineRes?.data || []).forEach((row: any) => {
        nextMine[row.entry_id] = row.reaction as -1 | 1;
      });

      setViewCounts(nextViews);
      setLikeCounts(nextLikes);
      setDislikeCounts(nextDislikes);
      setCommentCounts(nextComments);
      setMyReactions(nextMine);
    },
    [],
  );

  const loadEntryComments = useCallback(async (entryId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("active_hub_resource_entry_comments")
      .select(
        "id, entry_id, user_id, body, created_at, profiles:user_id(username, display_name, avatar_url)",
      )
      .eq("entry_id", entryId)
      .order("created_at", { ascending: true });

    if (error) return;
    const normalized = (data || []).map((row: any) => ({
      ...row,
      profiles: Array.isArray(row.profiles)
        ? (row.profiles[0] ?? null)
        : row.profiles,
    })) as ResourceCommentRow[];

    setCommentsByEntry((prev) => ({
      ...prev,
      [entryId]: normalized,
    }));
  }, []);

  const trackEntryView = useCallback(
    async (entryId: string) => {
      const viewerFingerprint = getOrCreateResourceViewerFingerprint();
      if (!viewerFingerprint) return;

      const supabase = createClient();
      await supabase.rpc("record_hub_resource_entry_view", {
        p_entry_id: entryId,
        p_viewer_fingerprint: viewerFingerprint,
        p_user_id: authUserId,
      });

      await loadEntryMetrics(
        entries.map((entry) => entry.id),
        authUserId,
      );
    },
    [authUserId, entries, loadEntryMetrics],
  );

  const setReaction = useCallback(
    async (entryId: string, reaction: -1 | 1) => {
      if (!authUserId) {
        toast.error("Sign in to react to resources");
        return;
      }

      const current = myReactions[entryId] || 0;
      const nextReaction: -1 | 0 | 1 = current === reaction ? 0 : reaction;
      const supabase = createClient();

      if (nextReaction === 0) {
        const { error } = await supabase
          .from("hub_resource_entry_reactions")
          .delete()
          .eq("entry_id", entryId)
          .eq("user_id", authUserId);
        if (error) {
          toast.error(error.message || "Failed to update reaction");
          return;
        }
      } else {
        const { error } = await supabase
          .from("hub_resource_entry_reactions")
          .upsert(
            {
              entry_id: entryId,
              user_id: authUserId,
              reaction: nextReaction,
            },
            { onConflict: "entry_id,user_id" },
          );
        if (error) {
          toast.error(error.message || "Failed to update reaction");
          return;
        }
      }

      await loadEntryMetrics(
        entries.map((entry) => entry.id),
        authUserId,
      );
    },
    [authUserId, entries, loadEntryMetrics, myReactions],
  );

  const submitComment = useCallback(async () => {
    if (!selectedEntry || !authUserId) {
      toast.error("Sign in to comment");
      return;
    }

    const body = commentDraft.trim();
    if (!body) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("hub_resource_entry_comments")
      .insert({
        entry_id: selectedEntry.id,
        user_id: authUserId,
        body,
      });

    if (error) {
      toast.error(error.message || "Failed to add comment");
      return;
    }

    setCommentDraft("");
    await loadEntryComments(selectedEntry.id);
    await loadEntryMetrics(
      entries.map((entry) => entry.id),
      authUserId,
    );
  }, [
    authUserId,
    commentDraft,
    entries,
    loadEntryComments,
    loadEntryMetrics,
    selectedEntry,
  ]);

  useEffect(() => {
    loadEntryMetrics(
      entries.map((entry) => entry.id),
      authUserId,
    );
  }, [authUserId, entries, loadEntryMetrics]);

  const openEntryDetail = (entry: ResourceEntryRow) => {
    setSelectedSectionId(entry.section_id);
    setSelectedEntryId(entry.id);
    setEntryDetailOpen(true);
    trackEntryView(entry.id);
    loadEntryComments(entry.id);
  };

  const openSectionDialog = (section?: ResourceSectionRow) => {
    if (section) {
      setEditingSectionId(section.id);
      setSectionForm({
        title: section.title,
        description: section.description || "",
        iconName: section.icon_name || "book-open",
        accentColor: section.accent_color || "#7c3aed",
        isPublished: section.is_published,
      });
    } else {
      setEditingSectionId(null);
      setSectionForm(emptySectionForm);
    }
    setSectionDialogOpen(true);
  };

  const openEntryDialog = (entry?: ResourceEntryRow) => {
    const sectionId =
      entry?.section_id || selectedSectionId || sections[0]?.id || "";
    if (entry) {
      setEditingEntryId(entry.id);
      setEntryForm({
        sectionId,
        title: entry.title,
        summary: entry.summary || "",
        url: entry.url || "",
        label: entry.label || "",
        isPlatformPinned: entry.is_platform_pinned,
        isPublished: entry.is_published,
      });
    } else {
      setEditingEntryId(null);
      setEntryForm({ ...emptyEntryForm, sectionId });
    }
    setEntryDialogOpen(true);
  };

  const saveSection = async () => {
    if (!sectionForm.title.trim()) {
      toast.error("Enter a section title");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      if (editingSectionId) {
        const { error } = await supabase
          .from("hub_resource_sections")
          .update({
            title: sectionForm.title.trim(),
            description: sectionForm.description.trim() || null,
            icon_name: sectionForm.iconName,
            accent_color: sectionForm.accentColor,
            is_published: sectionForm.isPublished,
          })
          .eq("id", editingSectionId);
        if (error) throw error;
      } else {
        const nextSortOrder = sections.length;
        const { error } = await supabase.from("hub_resource_sections").insert({
          title: sectionForm.title.trim(),
          description: sectionForm.description.trim() || null,
          icon_name: sectionForm.iconName,
          accent_color: sectionForm.accentColor,
          sort_order: nextSortOrder,
          is_published: sectionForm.isPublished,
        });
        if (error) throw error;
      }

      setSectionDialogOpen(false);
      setEditingSectionId(null);
      setSectionForm(emptySectionForm);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save section");
    } finally {
      setSaving(false);
    }
  };

  const saveEntry = async () => {
    if (!entryForm.sectionId) {
      toast.error("Choose a section");
      return;
    }
    if (!entryForm.title.trim()) {
      toast.error("Enter a resource title");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const nextSortOrder = entries.filter(
        (entry) => entry.section_id === entryForm.sectionId,
      ).length;
      const payload = {
        section_id: entryForm.sectionId,
        title: entryForm.title.trim(),
        summary: entryForm.summary.trim() || null,
        url: entryForm.url.trim() || null,
        label: entryForm.label.trim() || null,
        is_platform_pinned: entryForm.isPlatformPinned,
        is_published: entryForm.isPublished,
      };

      if (editingEntryId) {
        const { error } = await supabase
          .from("hub_resource_entries")
          .update(payload)
          .eq("id", editingEntryId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hub_resource_entries").insert({
          ...payload,
          sort_order: nextSortOrder,
        });
        if (error) throw error;
      }

      setEntryDialogOpen(false);
      setEditingEntryId(null);
      setEntryForm(emptyEntryForm);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const deleteSection = async (sectionId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("hub_resource_sections")
        .delete()
        .eq("id", sectionId);
      if (error) throw error;
      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null);
        setSelectedEntryId(null);
      }
      await loadData();
      toast.success("Section deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete section");
    }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("hub_resource_entries")
        .delete()
        .eq("id", entryId);
      if (error) throw error;
      if (selectedEntryId === entryId) {
        setSelectedEntryId(null);
      }
      await loadData();
      toast.success("Entry deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete entry");
    }
  };

  const reorderSections = async (
    sectionId: string,
    direction: "up" | "down",
  ) => {
    const index = sections.findIndex((section) => section.id === sectionId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const nextSections = [...sections];
    [nextSections[index], nextSections[targetIndex]] = [
      nextSections[targetIndex],
      nextSections[index],
    ];

    try {
      const supabase = createClient();
      await Promise.all(
        nextSections.map((section, sort_order) =>
          supabase
            .from("hub_resource_sections")
            .update({ sort_order })
            .eq("id", section.id),
        ),
      );
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reorder sections");
    }
  };

  const reorderEntries = async (entryId: string, direction: "up" | "down") => {
    if (!selectedSectionId) return;
    const sectionEntries = entries.filter(
      (entry) => entry.section_id === selectedSectionId,
    );
    const index = sectionEntries.findIndex((entry) => entry.id === entryId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sectionEntries.length) return;

    const nextEntries = [...sectionEntries];
    [nextEntries[index], nextEntries[targetIndex]] = [
      nextEntries[targetIndex],
      nextEntries[index],
    ];

    try {
      const supabase = createClient();
      await Promise.all(
        nextEntries.map((entry, sort_order) =>
          supabase
            .from("hub_resource_entries")
            .update({ sort_order })
            .eq("id", entry.id),
        ),
      );
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reorder entries");
    }
  };

  const toggleSectionPublish = async (section: ResourceSectionRow) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("hub_resource_sections")
        .update({ is_published: !section.is_published })
        .eq("id", section.id);
      if (error) throw error;
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update section");
    }
  };

  const toggleEntryPublish = async (entry: ResourceEntryRow) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("hub_resource_entries")
        .update({ is_published: !entry.is_published })
        .eq("id", entry.id);
      if (error) throw error;
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update entry");
    }
  };

  const pinnedEntries = entries.filter((entry) => entry.is_platform_pinned);

  const focusSection = (sectionId: string, entryId?: string) => {
    setSelectedSectionId(sectionId);
    if (entryId) {
      setSelectedEntryId(entryId);
    }

    window.requestAnimationFrame(() => {
      const target = document.getElementById(`resources-entries-${sectionId}`);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="min-h-full p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <Card className="border-border/70 bg-card/95 shadow-lg">
          <CardContent className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Janitor AI Resources
                  </h1>
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                  A browsable directory of useful articles, references, and
                  guides.
                </p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => openSectionDialog()}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" /> New section
                </Button>
                <Button
                  onClick={() => openEntryDialog()}
                  className="cursor-pointer"
                >
                  <Link2 className="mr-2 h-4 w-4" /> New entry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <Card className="border-border/70 bg-card/95">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Loading resources...
            </CardContent>
          </Card>
        ) : sections.length === 0 ? (
          <Card className="border-border/70 bg-card/95">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No sections yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Sections
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Choose a section to browse its entries.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sections.map((section, index) => {
                  const active = section.id === selectedSectionId;
                  const SectionIcon =
                    sectionIconMap[section.icon_name || "book-open"] ||
                    BookOpen;
                  const accentColor = section.accent_color || "#7c3aed";

                  return (
                    <div
                      key={section.id}
                      onClick={() => focusSection(section.id)}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "group relative overflow-hidden rounded-3xl border p-5 text-left transition-all",
                        active
                          ? "shadow-lg shadow-primary/10"
                          : "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                      )}
                      style={{ borderColor: active ? accentColor : undefined }}
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-1 rounded-t-3xl"
                        style={{ backgroundColor: accentColor }}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex items-start gap-3">
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                            style={{ backgroundColor: accentColor }}
                          >
                            <SectionIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-base font-semibold">
                                {section.title}
                              </h3>
                              <Badge
                                variant={
                                  section.is_published ? "default" : "secondary"
                                }
                              >
                                {section.is_published ? "Published" : "Draft"}
                              </Badge>
                            </div>
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                              {section.description || "No description yet."}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {entryCountBySection.get(section.id) || 0}
                        </Badge>
                      </div>

                      <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Open section</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </div>

                      {isAdmin && (
                        <Collapsible className="mt-4" defaultOpen={false}>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 cursor-pointer text-xs text-muted-foreground"
                              onClick={(event) => event.stopPropagation()}
                            >
                              Manage section
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div
                              className="mt-2 flex flex-wrap items-center gap-2"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 cursor-pointer"
                                disabled={index === 0}
                                onClick={() =>
                                  reorderSections(section.id, "up")
                                }
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 cursor-pointer"
                                disabled={index === sections.length - 1}
                                onClick={() =>
                                  reorderSections(section.id, "down")
                                }
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => openSectionDialog(section)}
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => toggleSectionPublish(section)}
                              >
                                {section.is_published ? "Unpublish" : "Publish"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDeleteTarget({
                                    kind: "section",
                                    id: section.id,
                                    title: section.title,
                                  })
                                }
                                className="cursor-pointer text-destructive hover:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </Button>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              className="space-y-4"
              id={`resources-entries-${selectedSectionId || "none"}`}
              style={{ scrollMarginTop: "6rem" }}
            >
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {selectedSection?.title || "Section entries"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedSection?.description ||
                      "No description available for this section."}
                  </p>
                </div>
                {isAdmin && selectedSection && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEntryDialog()}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add entry
                  </Button>
                )}
              </div>

              {visibleEntries.length === 0 ? (
                <Card className="border-border/70 bg-card/95">
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    No entries in this section.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 xl:grid-cols-3">
                  {visibleEntries.map((entry, index) => {
                    const active = entry.id === selectedEntryId;
                    const sourceSection = sections.find(
                      (candidate) => candidate.id === entry.section_id,
                    );
                    const sectionAccent =
                      sourceSection?.accent_color || "#7c3aed";
                    const cardBorder = entry.is_platform_pinned
                      ? "border-amber-400/60"
                      : active
                        ? "border-primary"
                        : undefined;
                    const cardBackground = entry.is_platform_pinned
                      ? "bg-amber-50/20 dark:bg-amber-500/5"
                      : active
                        ? "bg-primary/5"
                        : "bg-background/60";

                    return (
                      <div
                        key={entry.id}
                        onClick={() => openEntryDetail(entry)}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "group w-full min-w-0 overflow-hidden rounded-2xl border p-4 text-left transition-all",
                          cardBorder,
                          cardBackground,
                          !entry.is_platform_pinned &&
                            !active &&
                            "hover:border-primary/40",
                          entry.is_platform_pinned && "shadow-sm",
                        )}
                        style={{
                          borderColor: entry.is_platform_pinned
                            ? undefined
                            : active
                              ? sectionAccent
                              : `${sectionAccent}40`,
                        }}
                      >
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-semibold">
                                {entry.title}
                              </h3>
                              <Badge
                                variant={
                                  entry.is_published ? "default" : "secondary"
                                }
                              >
                                {entry.is_published ? "Published" : "Draft"}
                              </Badge>
                              {entry.is_platform_pinned && (
                                <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                                  Janitor Forge
                                </Badge>
                              )}
                            </div>
                            <div className="max-h-24 overflow-hidden text-sm text-muted-foreground [&_p]:mb-0 [&_ul]:mb-0 [&_ol]:mb-0 [&_ol]:pl-5 [&_ul]:pl-5">
                              <MarkdownContent
                                content={entry.summary || "No summary yet."}
                                className="prose-sm max-w-none"
                              />
                            </div>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {sourceSection && (
                            <Badge
                              variant="outline"
                              className="border-current/20"
                              style={{
                                color: sectionAccent,
                                borderColor: sectionAccent,
                              }}
                            >
                              {sourceSection.title}
                            </Badge>
                          )}
                          {entry.label && (
                            <Badge variant="outline">{entry.label}</Badge>
                          )}
                        </div>

                        <div className="mt-3 space-y-2 rounded-xl border border-border/60 bg-muted/15 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Engagement
                          </p>
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            <Badge variant="outline" className="gap-1">
                              <Eye className="h-3.5 w-3.5" />
                              {viewCounts[entry.id] || 0} views
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <ThumbsUp className="h-3.5 w-3.5" />
                              {likeCounts[entry.id] || 0} likes
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <ThumbsDown className="h-3.5 w-3.5" />
                              {dislikeCounts[entry.id] || 0} dislikes
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <MessageCircle className="h-3.5 w-3.5" />
                              {commentCounts[entry.id] || 0} comments
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              type="button"
                              variant={
                                myReactions[entry.id] === 1
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              className="h-8 px-3 cursor-pointer"
                              onClick={(event) => {
                                event.stopPropagation();
                                setReaction(entry.id, 1);
                              }}
                            >
                              <ThumbsUp className="mr-1.5 h-3.5 w-3.5" /> Like
                            </Button>
                            <Button
                              type="button"
                              variant={
                                myReactions[entry.id] === -1
                                  ? "destructive"
                                  : "outline"
                              }
                              size="sm"
                              className="h-8 px-3 cursor-pointer"
                              onClick={(event) => {
                                event.stopPropagation();
                                setReaction(entry.id, -1);
                              }}
                            >
                              <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
                              Dislike
                            </Button>
                          </div>
                        </div>

                        {isAdmin && (
                          <Collapsible className="mt-4" defaultOpen={false}>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 cursor-pointer text-xs text-muted-foreground"
                                onClick={(event) => event.stopPropagation()}
                              >
                                Manage entry
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div
                                className="mt-2 flex flex-wrap items-center gap-2"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 cursor-pointer"
                                  disabled={index === 0}
                                  onClick={() => reorderEntries(entry.id, "up")}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 cursor-pointer"
                                  disabled={index === visibleEntries.length - 1}
                                  onClick={() =>
                                    reorderEntries(entry.id, "down")
                                  }
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="cursor-pointer"
                                  onClick={() => openEntryDialog(entry)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="cursor-pointer"
                                  onClick={() => toggleEntryPublish(entry)}
                                >
                                  {entry.is_published ? "Unpublish" : "Publish"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="cursor-pointer text-destructive hover:text-destructive"
                                  onClick={() =>
                                    setDeleteTarget({
                                      kind: "entry",
                                      id: entry.id,
                                      title: entry.title,
                                    })
                                  }
                                  disabled={index === -1}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </Button>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {pinnedEntries.length > 0 && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Janitor Forge Picks
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Entries pinned by the platform for quick access.
                  </p>
                </div>

                <Card className="border-amber-400/60 bg-amber-50/30 shadow-sm dark:border-amber-400/40 dark:bg-amber-500/5">
                  <CardContent className="p-5">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {pinnedEntries.map((entry) => {
                        const section = sections.find(
                          (candidate) => candidate.id === entry.section_id,
                        );

                        return (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => openEntryDetail(entry)}
                            className={cn(
                              "group rounded-2xl border border-amber-400/60 bg-background/90 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                              selectedEntryId === entry.id &&
                                "ring-2 ring-amber-400/40",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                                    Janitor Forge
                                  </Badge>
                                  <Badge
                                    variant={
                                      entry.is_published
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {entry.is_published ? "Published" : "Draft"}
                                  </Badge>
                                </div>
                                <h3 className="text-base font-semibold">
                                  {entry.title}
                                </h3>
                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                  {entry.summary || "No summary yet."}
                                </p>
                              </div>
                              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              {section && (
                                <Badge variant="outline">{section.title}</Badge>
                              )}
                              {entry.label && (
                                <Badge variant="outline">{entry.label}</Badge>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={entryDetailOpen && !!selectedEntry}
        onOpenChange={setEntryDetailOpen}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl">
              {selectedEntry?.title}
            </DialogTitle>
            <DialogDescription>Full resource entry view.</DialogDescription>
          </DialogHeader>

          {selectedEntry && selectedSection && (
            <>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <ScrollArea className="h-[60vh] rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <div className="space-y-4 pr-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          selectedEntry.is_published ? "default" : "secondary"
                        }
                      >
                        {selectedEntry.is_published ? "Published" : "Draft"}
                      </Badge>
                      {selectedEntry.is_platform_pinned && (
                        <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                          Janitor Forge
                        </Badge>
                      )}
                      {selectedEntry.label && (
                        <Badge variant="outline">{selectedEntry.label}</Badge>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Summary
                      </p>
                      <div className="prose prose-sm mt-2 max-w-none leading-6 dark:prose-invert">
                        <MarkdownContent
                          content={selectedEntry.summary || "No summary yet."}
                        />
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div
                  className="space-y-4 rounded-2xl border p-4"
                  style={{
                    borderColor: selectedEntry.is_platform_pinned
                      ? "#f59e0b"
                      : selectedSection.accent_color || "#7c3aed",
                  }}
                >
                  <div>
                    <p className="text-sm font-medium">Section</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSection.title}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Source</p>
                    {selectedEntry.url ? (
                      <a
                        href={selectedEntry.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: selectedEntry.is_platform_pinned
                            ? "#f59e0b"
                            : selectedSection.accent_color || "#7c3aed",
                        }}
                        className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                      >
                        Open source <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No source link yet.
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Metadata</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">
                        Created{" "}
                        {new Date(
                          selectedEntry.created_at,
                        ).toLocaleDateString()}
                        <PenLineIcon className="ml-2 h-4 w-4" />
                      </Badge>
                      {selectedEntry.updated_at && (
                        <Badge variant="outline">
                          Updated{" "}
                          {new Date(
                            selectedEntry.updated_at,
                          ).toLocaleDateString()}
                          <Upload className="ml-2 h-4 w-4" />
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium">Engagement</p>
                    <div className="mt-2 space-y-3 rounded-xl border border-border/60 bg-muted/15 p-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {viewCounts[selectedEntry.id] || 0} views
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <ThumbsUp className="h-3.5 w-3.5" />
                          {likeCounts[selectedEntry.id] || 0} likes
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <ThumbsDown className="h-3.5 w-3.5" />
                          {dislikeCounts[selectedEntry.id] || 0} dislikes
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {commentCounts[selectedEntry.id] || 0} comments
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            myReactions[selectedEntry.id] === 1
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => setReaction(selectedEntry.id, 1)}
                        >
                          <ThumbsUp className="mr-2 h-4 w-4" /> Like
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            myReactions[selectedEntry.id] === -1
                              ? "destructive"
                              : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => setReaction(selectedEntry.id, -1)}
                        >
                          <ThumbsDown className="mr-2 h-4 w-4" /> Dislike
                        </Button>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => {
                          setEntryDetailOpen(false);
                          openEntryDialog(selectedEntry);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="cursor-pointer"
                        onClick={() => toggleEntryPublish(selectedEntry)}
                      >
                        {selectedEntry.is_published ? "Unpublish" : "Publish"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-sm font-medium">Comments</p>
                <div className="flex gap-2">
                  <Textarea
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    rows={3}
                    placeholder={
                      authUserId
                        ? "Write your comment..."
                        : "Sign in to write a comment"
                    }
                    disabled={!authUserId}
                  />
                  <Button
                    type="button"
                    className="cursor-pointer self-end"
                    onClick={submitComment}
                    disabled={!authUserId || !commentDraft.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {(commentsByEntry[selectedEntry.id] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No comments yet.
                    </p>
                  ) : (
                    (commentsByEntry[selectedEntry.id] || []).map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-xl border border-border/70 p-3"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">
                            {comment.profiles?.display_name ||
                              comment.profiles?.username ||
                              "User"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">
                          {comment.body}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.kind === "section" ? "section" : "entry"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "section"
                ? `This will also remove its entries. ${deleteTarget.title} will be gone permanently.`
                : `${deleteTarget?.title || "This entry"} will be removed permanently.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                const target = deleteTarget;
                setDeleteTarget(null);
                if (target.kind === "section") {
                  await deleteSection(target.id);
                } else {
                  await deleteEntry(target.id);
                }
              }}
              className="bg-destructive cursor-pointer text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSectionId ? "Edit section" : "New section"}
            </DialogTitle>
            <DialogDescription>
              Define a section that groups related resources.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={sectionForm.title}
                onChange={(event) =>
                  setSectionForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={sectionForm.description}
                onChange={(event) =>
                  setSectionForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Icon</label>
                <Select
                  value={sectionForm.iconName}
                  onValueChange={(value) =>
                    setSectionForm((prev) => ({ ...prev, iconName: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionIconOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Accent color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={sectionForm.accentColor}
                    onChange={(event) =>
                      setSectionForm((prev) => ({
                        ...prev,
                        accentColor: event.target.value,
                      }))
                    }
                    className="h-10 w-10 rounded border border-border/70 bg-background p-1"
                  />
                  <Input
                    value={sectionForm.accentColor}
                    onChange={(event) =>
                      setSectionForm((prev) => ({
                        ...prev,
                        accentColor: event.target.value,
                      }))
                    }
                    placeholder="#7c3aed"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Published</p>
                <p className="text-xs text-muted-foreground">
                  Visible to everyone when enabled.
                </p>
              </div>
              <Switch
                checked={sectionForm.isPublished}
                onCheckedChange={(checked) =>
                  setSectionForm((prev) => ({ ...prev, isPublished: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setSectionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveSection}
              className="cursor-pointer"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEntryId ? "Edit entry" : "New entry"}
            </DialogTitle>
            <DialogDescription>
              Add a link or reference inside a section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Select
                value={entryForm.sectionId}
                onValueChange={(value) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    sectionId: value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={entryForm.title}
                onChange={(event) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Summary</label>
              <p className="text-xs text-muted-foreground">
                Markdown is supported in the summary.
              </p>
              <MarkdownField
                value={entryForm.summary}
                onChange={(event) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    summary: event.target.value,
                  }))
                }
                rows={3}
                className="min-h-[10rem] md:min-h-[12rem]"
                previewMaxHeightRem={20}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL</label>
              <Input
                value={entryForm.url}
                onChange={(event) =>
                  setEntryForm((prev) => ({ ...prev, url: event.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Label</label>
              <Input
                value={entryForm.label}
                onChange={(event) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    label: event.target.value,
                  }))
                }
                placeholder="Reference, guide, template..."
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Pinned by platform</p>
                <p className="text-xs text-muted-foreground">
                  Show this entry in the highlighted Forge picks section.
                </p>
              </div>
              <Switch
                checked={entryForm.isPlatformPinned}
                onCheckedChange={(checked) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    isPlatformPinned: checked,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Published</p>
                <p className="text-xs text-muted-foreground">
                  Visible to everyone when enabled.
                </p>
              </div>
              <Switch
                checked={entryForm.isPublished}
                onCheckedChange={(checked) =>
                  setEntryForm((prev) => ({ ...prev, isPublished: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setEntryDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveEntry}
              className="cursor-pointer"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
