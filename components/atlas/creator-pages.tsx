// ============================================================================
// JanitorForge - Creator Pages Editor
// Create and manage customizable public creator pages
// ============================================================================

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Layout,
  Plus,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  ExternalLink,
  GripVertical,
  ArrowLeft,
  Save,
  Loader2,
  Globe,
  LayoutGrid,
  LayoutList,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreatorPage {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string;
  layout: "grid" | "showcase" | "timeline" | "list";
  config: Record<string, unknown>;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface PageSection {
  id: string;
  page_id: string;
  kind:
    | "bot_showcase"
    | "world_showcase"
    | "text_block"
    | "lorebook_gallery"
    | "banner"
    | "bot_group"
    | "form"
    | "sticker"
    | "divider"
    | "social_links"
    | "spacer";
  title: string;
  config: Record<string, unknown>;
  position: number;
  created_at: string;
}

type SectionKind = PageSection["kind"];

const sectionKindLabels: Record<SectionKind, string> = {
  bot_showcase: "Bot Showcase",
  world_showcase: "World Showcase",
  text_block: "Text Block",
  lorebook_gallery: "Lorebook Gallery",
  banner: "Banner",
  bot_group: "Bot Group",
  form: "Request Form",
  sticker: "Sticker / Image",
  divider: "Divider",
  social_links: "Social Links",
  spacer: "Spacer",
};

const sectionKindIcons: Record<SectionKind, typeof Layout> = {
  bot_showcase: LayoutGrid,
  world_showcase: Globe,
  text_block: LayoutList,
  lorebook_gallery: Layers,
  banner: Layout,
  bot_group: LayoutGrid,
  form: Layout,
  sticker: Layout,
  divider: Layout,
  social_links: Layout,
  spacer: Layout,
};

const layoutLabels: Record<CreatorPage["layout"], string> = {
  grid: "Grid",
  showcase: "Showcase",
  timeline: "Timeline",
  list: "List",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreatorPagesProps {
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreatorPages({ onBack }: CreatorPagesProps) {
  const [pages, setPages] = useState<CreatorPage[]>([]);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Editor state
  const [editingPage, setEditingPage] = useState<CreatorPage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLayout, setEditLayout] = useState<CreatorPage["layout"]>("grid");
  const [editAccentColor, setEditAccentColor] = useState("#7c3aed");
  const [editBgStyle, setEditBgStyle] = useState("default");
  const [editFontStyle, setEditFontStyle] = useState("default");
  const [editHeaderStyle, setEditHeaderStyle] = useState("split");
  const [editAvatarSize, setEditAvatarSize] = useState("large");
  const [editShowBackButton, setEditShowBackButton] = useState(true);
  const [editShowBadges, setEditShowBadges] = useState(true);
  const [saving, setSaving] = useState(false);

  // Section dialog
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSectionKind, setNewSectionKind] =
    useState<SectionKind>("bot_showcase");
  const [newSectionTitle, setNewSectionTitle] = useState("");

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const access = await getCurrentUserAccess(supabase);
      if (!access.user) {
        setLoading(false);
        return;
      }
      setCurrentUserId(access.user.id);

      const [
        { data: pageData, error: pageError },
        { data: sectionData, error: sectionError },
      ] = await Promise.all([
        supabase
          .from("creator_pages")
          .select("*")
          .eq("user_id", access.user.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("creator_page_sections")
          .select("*")
          .order("position", { ascending: true }),
      ]);

      if (pageError) throw pageError;
      if (sectionError) throw sectionError;

      setPages((pageData || []) as CreatorPage[]);
      setSections((sectionData || []) as PageSection[]);
    } catch (error: any) {
      console.error("Failed to load creator pages:", error);
      // Tables might not exist yet - show empty state
      setPages([]);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create new page
  const handleCreatePage = async () => {
    if (!currentUserId) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const slug = `page-${Date.now().toString(36)}`;
      const { data, error } = await supabase
        .from("creator_pages")
        .insert({
          user_id: currentUserId,
          slug,
          title: "My Creator Page",
          description: "",
          layout: "grid",
        })
        .select("*")
        .single();

      if (error) throw error;
      const newPage = data as CreatorPage;
      setPages((prev) => [newPage, ...prev]);
      openEditor(newPage);
      toast.success("Page created");
    } catch (error: any) {
      toast.error(error.message || "Failed to create page");
    } finally {
      setSaving(false);
    }
  };

  // Open editor
  const openEditor = (page: CreatorPage) => {
    setEditingPage(page);
    setEditTitle(page.title);
    setEditSlug(page.slug);
    setEditDescription(page.description);
    setEditLayout(page.layout);
    const cfg = (page.config as Record<string, string>) || {};
    setEditAccentColor(cfg.accentColor || "#7c3aed");
    setEditBgStyle(cfg.bgStyle || "default");
    setEditFontStyle(cfg.fontStyle || "default");
    setEditHeaderStyle((cfg as any).headerStyle || "split");
    setEditAvatarSize((cfg as any).avatarSize || "large");
    setEditShowBackButton((cfg as any).showBackButton !== "false");
    setEditShowBadges((cfg as any).showBadges !== "false");
  };

  // Save page
  const handleSavePage = async () => {
    if (!editingPage || !currentUserId) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const pageConfig: Record<string, string> = {};
      if (editAccentColor && editAccentColor !== "#7c3aed")
        pageConfig.accentColor = editAccentColor;
      if (editBgStyle && editBgStyle !== "default")
        pageConfig.bgStyle = editBgStyle;
      if (editFontStyle && editFontStyle !== "default")
        pageConfig.fontStyle = editFontStyle;
      if (editHeaderStyle && editHeaderStyle !== "split")
        pageConfig.headerStyle = editHeaderStyle;
      if (editAvatarSize && editAvatarSize !== "large")
        pageConfig.avatarSize = editAvatarSize;
      if (!editShowBackButton) pageConfig.showBackButton = "false";
      if (!editShowBadges) pageConfig.showBadges = "false";

      const { error } = await supabase
        .from("creator_pages")
        .update({
          title: editTitle.trim() || "Untitled",
          slug: editSlug.trim() || editingPage.slug,
          description: editDescription.trim(),
          layout: editLayout,
          config: pageConfig,
        })
        .eq("id", editingPage.id)
        .eq("user_id", currentUserId);

      if (error) throw error;

      const updated: CreatorPage = {
        ...editingPage,
        title: editTitle.trim() || "Untitled",
        slug: editSlug.trim() || editingPage.slug,
        description: editDescription.trim(),
        layout: editLayout,
        config: pageConfig,
        updated_at: new Date().toISOString(),
      };
      setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingPage(updated);
      toast.success("Page saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  // Toggle publish
  const handleTogglePublish = async (page: CreatorPage) => {
    if (!currentUserId) return;
    try {
      const supabase = createClient();
      const newPublished = !page.is_published;
      const { error } = await supabase
        .from("creator_pages")
        .update({ is_published: newPublished })
        .eq("id", page.id)
        .eq("user_id", currentUserId);

      if (error) throw error;

      setPages((prev) =>
        prev.map((p) =>
          p.id === page.id ? { ...p, is_published: newPublished } : p,
        ),
      );
      if (editingPage?.id === page.id) {
        setEditingPage({ ...editingPage, is_published: newPublished });
      }
      toast.success(newPublished ? "Page published!" : "Page unpublished");
    } catch (error: any) {
      toast.error(error.message || "Failed to update publish status");
    }
  };

  // Delete page
  const handleDeletePage = async (pageId: string) => {
    if (!currentUserId) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("creator_pages")
        .delete()
        .eq("id", pageId)
        .eq("user_id", currentUserId);

      if (error) throw error;
      setPages((prev) => prev.filter((p) => p.id !== pageId));
      setSections((prev) => prev.filter((s) => s.page_id !== pageId));
      if (editingPage?.id === pageId) setEditingPage(null);
      toast.success("Page deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete page");
    }
  };

  // Add section
  const handleAddSection = async () => {
    if (!editingPage) return;
    try {
      const supabase = createClient();
      const pageSections = sections.filter((s) => s.page_id === editingPage.id);
      const nextPosition = pageSections.length;

      const { data, error } = await supabase
        .from("creator_page_sections")
        .insert({
          page_id: editingPage.id,
          kind: newSectionKind,
          title: newSectionTitle.trim() || sectionKindLabels[newSectionKind],
          position: nextPosition,
        })
        .select("*")
        .single();

      if (error) throw error;
      setSections((prev) => [...prev, data as PageSection]);
      setAddSectionOpen(false);
      setNewSectionTitle("");
      toast.success("Section added");
    } catch (error: any) {
      toast.error(error.message || "Failed to add section");
    }
  };

  // Edit section state
  const [editingSection, setEditingSection] = useState<PageSection | null>(
    null,
  );
  const [sectionTitleEdit, setSectionTitleEdit] = useState("");
  const [sectionConfigEdit, setSectionConfigEdit] = useState<
    Record<string, string>
  >({});

  // Available forms for form sections
  const [availableForms, setAvailableForms] = useState<
    Array<{ id: string; form_title: string; shareable_link: string }>
  >([]);
  const [editingFormId, setEditingFormId] = useState<string>("");

  const loadAvailableForms = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("request_forms")
        .select("id, title, shareable_link")
        .eq("user_id", currentUserId)
        .order("title");
      if (data)
        setAvailableForms(
          data.map((f: any) => ({
            id: f.id,
            form_title: f.title,
            shareable_link: f.shareable_link || "",
          })),
        );
    } catch (error) {
      console.error("Failed to load forms:", error);
    }
  };

  // Drag & drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: any, idx: number) => {
    e.dataTransfer.setData("text/plain", String(idx));
    (e.currentTarget as HTMLDivElement).classList.add("opacity-60");
  };

  const handleDragEnd = (e: any) => {
    (e.currentTarget as HTMLDivElement).classList.remove("opacity-60");
    setDraggedIdx(null);
  };

  const handleDragOver = (e: any, idx: number) => {
    e.preventDefault();
    e.currentTarget.style.borderTop = "2px solid var(--primary)";
  };

  const handleDragLeave = (e: any) => {
    e.currentTarget.style.borderTop = "";
  };

  const handleDrop = async (e: any, dropIdx: number) => {
    e.preventDefault();
    e.currentTarget.style.borderTop = "";
    const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(fromIdx) || fromIdx === dropIdx || !editingPage) return;
    try {
      const supabase = createClient();
      const pageSections = editingPageSections;
      const moved = [...pageSections];
      const [dragged] = moved.splice(fromIdx, 1);
      moved.splice(dropIdx, 0, dragged);
      const updated = moved.map((s, i) => ({ ...s, position: i }));
      setSections((prev) => {
        const rest = prev.filter((s) => s.page_id !== editingPage.id);
        return [...rest, ...updated];
      });
      const updates = updated.map((s) =>
        supabase
          .from("creator_page_sections")
          .update({ position: s.position })
          .eq("id", s.id),
      );
      await Promise.all(updates);
    } catch (error: any) {
      toast.error(error.message || "Failed to reorder sections");
    }
  };

  const openSectionEditor = (section: PageSection) => {
    setEditingSection(section);
    setSectionTitleEdit(section.title);
    if (section.kind === "form") {
      loadAvailableForms();
      const savedFormId = (section.config as any)?.formId || "";
      setEditingFormId(savedFormId);
    }
    const config: Record<string, string> = {};
    if (section.kind === "banner") {
      config.subtitle = (section.config as any)?.subtitle || "";
      config.background = (section.config as any)?.background || "#7c3aed";
      config.background2 = (section.config as any)?.background2 || "#4c1d95";
      config.backgroundType =
        (section.config as any)?.backgroundType || "gradient";
      config.alignment = (section.config as any)?.alignment || "center";
    } else if (section.kind === "text_block") {
      config.body = (section.config as any)?.body || "";
    } else if (
      section.kind === "bot_showcase" ||
      section.kind === "bot_group"
    ) {
      config.description = (section.config as any)?.description || "";
      config.columns = String((section.config as any)?.columns || "3");
    } else if (section.kind === "world_showcase") {
      config.description = (section.config as any)?.description || "";
    } else if (section.kind === "lorebook_gallery") {
      config.description = (section.config as any)?.description || "";
    } else if (section.kind === "sticker") {
      config.imageUrl = (section.config as any)?.imageUrl || "";
      config.alt = (section.config as any)?.alt || "";
      config.size = (section.config as any)?.size || "medium";
      config.alignment = (section.config as any)?.alignment || "center";
      config.rounded = (section.config as any)?.rounded || "md";
      config.positionMode = (section.config as any)?.positionMode || "static";
      config.posX = (section.config as any)?.posX || "0px";
      config.posY = (section.config as any)?.posY || "0px";
      config.rotation = (section.config as any)?.rotation || "0";
      config.opacity = (section.config as any)?.opacity || "100";
      config.zIndex = (section.config as any)?.zIndex || "10";
    } else if (section.kind === "divider") {
      config.style = (section.config as any)?.style || "line";
      config.height = (section.config as any)?.height || "1";
    } else if (section.kind === "social_links") {
      const links = (section.config as any)?.links;
      config.links = Array.isArray(links) ? JSON.stringify(links) : "[]";
    } else if (section.kind === "spacer") {
      config.height = (section.config as any)?.height || "3rem";
    }
    setSectionConfigEdit(config);
  };

  const handleSaveSection = async () => {
    if (!editingSection) return;
    try {
      const supabase = createClient();
      const config: Record<string, unknown> = {};
      Object.entries(sectionConfigEdit).forEach(([k, v]) => {
        if (v.trim()) config[k] = v.trim();
      });
      if (editingSection.kind === "form" && editingFormId) {
        config.formId = editingFormId;
        const selected = availableForms.find((f) => f.id === editingFormId);
        if (selected) config.shareableLink = selected.shareable_link;
      }

      const { error } = await supabase
        .from("creator_page_sections")
        .update({
          title: sectionTitleEdit.trim() || editingSection.title,
          config,
        })
        .eq("id", editingSection.id);

      if (error) throw error;

      setSections((prev) =>
        prev.map((s) =>
          s.id === editingSection.id
            ? { ...s, title: sectionTitleEdit.trim() || s.title, config }
            : s,
        ),
      );
      setEditingSection(null);
      toast.success("Section updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update section");
    }
  };

  // Delete section
  const handleDeleteSection = async (sectionId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("creator_page_sections")
        .delete()
        .eq("id", sectionId);

      if (error) throw error;
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      toast.success("Section removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove section");
    }
  };

  // Reorder sections (move up / move down)
  const handleReorderSection = async (
    sectionId: string,
    direction: "up" | "down",
  ) => {
    if (!editingPage) return;
    const pageSections = editingPageSections;
    const idx = pageSections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= pageSections.length) return;

    const moved = [...pageSections];
    [moved[idx], moved[targetIdx]] = [moved[targetIdx], moved[idx]];

    // Update positions locally
    const updated = moved.map((s, i) => ({ ...s, position: i }));
    setSections((prev) => {
      const rest = prev.filter((s) => s.page_id !== editingPage.id);
      return [...rest, ...updated];
    });

    // Persist to database
    try {
      const supabase = createClient();
      const updates = updated.map((s) =>
        supabase
          .from("creator_page_sections")
          .update({ position: s.position })
          .eq("id", s.id),
      );
      await Promise.all(updates);
    } catch (error: any) {
      toast.error(error.message || "Failed to reorder sections");
    }
  };

  // Get sections for current editing page
  const editingPageSections = editingPage
    ? sections
        .filter((s) => s.page_id === editingPage.id)
        .sort((a, b) => a.position - b.position)
    : [];

  // -------------------------------------------------------------------------
  // RENDER: Loading
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 lg:p-10">
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading Creator Pages...
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: Page Editor
  // -------------------------------------------------------------------------

  if (editingPage) {
    return (
      <div className="p-4 sm:p-6 md:p-8 lg:p-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer"
              onClick={() => setEditingPage(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {editingPage.title || "Untitled Page"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure your creator page and add sections.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => handleTogglePublish(editingPage)}
            >
              {editingPage.is_published ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" /> Unpublish
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" /> Publish
                </>
              )}
            </Button>
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={handleSavePage}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 overflow-hidden">
          {/* Settings */}
          <Card className="border-border/70 min-w-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Page Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 min-w-0">
              <div className="space-y-2">
                <Label>Page Title</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="My Creator Page"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  URL Slug
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    (public URL)
                  </span>
                </Label>
                <div className="flex items-center gap-0 min-w-0 overflow-hidden">
                  <span className="flex h-10 shrink-0 items-center rounded-l-md border border-r-0 bg-muted px-3 text-xs text-muted-foreground">
                    /
                  </span>
                  <Input
                    value={editSlug}
                    onChange={(e) =>
                      setEditSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "-")
                          .replace(/-+/g, "-"),
                      )
                    }
                    className="rounded-l-none min-w-0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Describe your creator page..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select
                  value={editLayout}
                  onValueChange={(v) =>
                    setEditLayout(v as CreatorPage["layout"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(layoutLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editAccentColor}
                    onChange={(e) => setEditAccentColor(e.target.value)}
                    className="h-10 w-10 rounded cursor-pointer border"
                  />
                  <Input
                    value={editAccentColor}
                    onChange={(e) => setEditAccentColor(e.target.value)}
                    placeholder="#7c3aed"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Background Style</Label>
                <Select
                  value={editBgStyle}
                  onValueChange={(v) => setEditBgStyle(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="ambient">Ambient</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Font Style</Label>
                <Select
                  value={editFontStyle}
                  onValueChange={(v) => setEditFontStyle(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="serif">Serif</SelectItem>
                    <SelectItem value="mono">Monospace</SelectItem>
                    <SelectItem value="display">Display</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Header Style</Label>
                <Select
                  value={editHeaderStyle}
                  onValueChange={(v) => setEditHeaderStyle(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="split">Split (side by side)</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="stacked">
                      Stacked (center, no back)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Avatar Size</Label>
                <Select
                  value={editAvatarSize}
                  onValueChange={(v) => setEditAvatarSize(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Header Options</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id="showBackButton"
                      checked={editShowBackButton}
                      onCheckedChange={(checked) =>
                        setEditShowBackButton(checked === true)
                      }
                    />
                    <Label htmlFor="showBackButton" className="cursor-pointer">
                      Show Back Button
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id="showBadges"
                      checked={editShowBadges}
                      onCheckedChange={(checked) =>
                        setEditShowBadges(checked === true)
                      }
                    />
                    <Label htmlFor="showBadges" className="cursor-pointer">
                      Show Badges (Joined / Bots count)
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Badge
                  variant={editingPage.is_published ? "default" : "secondary"}
                >
                  {editingPage.is_published ? "Published" : "Draft"}
                </Badge>
                {editingPage.is_published && (
                  <span className="text-xs text-muted-foreground truncate">
                    /{editingPage.slug}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <Card className="border-border/70 min-w-0 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Sections</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setAddSectionOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Section
                </Button>
              </div>
              <CardDescription>
                Add content blocks to your page. They will appear in the order
                listed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingPageSections.length > 0 ? (
                <div className="space-y-2">
                  {editingPageSections.map((section, idx) => {
                    const Icon = sectionKindIcons[section.kind] || Layout;
                    return (
                      <div
                        key={section.id}
                        draggable
                        onDragStart={(e: any) => handleDragStart(e, idx)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e: any) => handleDragOver(e, idx)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e: any) => handleDrop(e, idx)}
                        className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-3 cursor-pointer hover:border-primary/40 transition-colors"
                        onClick={() => openSectionEditor(section)}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {section.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {sectionKindLabels[section.kind]}
                            {section.config &&
                              Object.keys(section.config).length > 0 &&
                              " · Configured"}
                          </p>
                        </div>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSection(section.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                  No sections yet. Add content blocks to build your page.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Section Dialog */}
        <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
          <DialogContent className="w-[calc(100%-1rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Section</DialogTitle>
              <DialogDescription>
                Choose a section type to add to your page.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Section Type</Label>
                <Select
                  value={newSectionKind}
                  onValueChange={(v) => setNewSectionKind(v as SectionKind)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sectionKindLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section Title</Label>
                <Input
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder={sectionKindLabels[newSectionKind]}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddSectionOpen(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button onClick={handleAddSection} className="cursor-pointer">
                Add Section
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Section Editor Dialog */}
        <Dialog
          open={!!editingSection}
          onOpenChange={(open) => !open && setEditingSection(null)}
        >
          <DialogContent className="w-[calc(100%-1rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingSection && (
                  <>
                    {(() => {
                      const Icon =
                        sectionKindIcons[editingSection.kind] || Layout;
                      return <Icon className="h-5 w-5 text-primary" />;
                    })()}
                  </>
                )}
                Edit Section
              </DialogTitle>
              <DialogDescription>
                Configure the content and appearance of this section.
              </DialogDescription>
            </DialogHeader>

            {editingSection && (
              <div className="space-y-4">
                {/* Title - common to all */}
                <div className="space-y-2">
                  <Label>Section Title</Label>
                  <Input
                    value={sectionTitleEdit}
                    onChange={(e) => setSectionTitleEdit(e.target.value)}
                    placeholder={sectionKindLabels[editingSection.kind]}
                  />
                </div>

                {/* Banner fields */}
                {editingSection.kind === "banner" && (
                  <>
                    <div className="space-y-2">
                      <Label>Subtitle</Label>
                      <Input
                        value={sectionConfigEdit.subtitle || ""}
                        onChange={(e) =>
                          setSectionConfigEdit((prev) => ({
                            ...prev,
                            subtitle: e.target.value,
                          }))
                        }
                        placeholder="A tagline for your banner"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Background Type</Label>
                      <Select
                        value={sectionConfigEdit.backgroundType || "gradient"}
                        onValueChange={(v) =>
                          setSectionConfigEdit((prev) => ({
                            ...prev,
                            backgroundType: v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Solid Color</SelectItem>
                          <SelectItem value="gradient">Gradient</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Background Color
                        {sectionConfigEdit.backgroundType === "gradient"
                          ? " 1"
                          : ""}
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={sectionConfigEdit.background || "#7c3aed"}
                          onChange={(e) =>
                            setSectionConfigEdit((prev) => ({
                              ...prev,
                              background: e.target.value,
                            }))
                          }
                          className="h-10 w-10 rounded cursor-pointer border"
                        />
                        <Input
                          value={sectionConfigEdit.background || "#7c3aed"}
                          onChange={(e) =>
                            setSectionConfigEdit((prev) => ({
                              ...prev,
                              background: e.target.value,
                            }))
                          }
                          placeholder="#7c3aed"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    {sectionConfigEdit.backgroundType === "gradient" && (
                      <div className="space-y-2">
                        <Label>Background Color 2</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={sectionConfigEdit.background2 || "#4c1d95"}
                            onChange={(e) =>
                              setSectionConfigEdit((prev) => ({
                                ...prev,
                                background2: e.target.value,
                              }))
                            }
                            className="h-10 w-10 rounded cursor-pointer border"
                          />
                          <Input
                            value={sectionConfigEdit.background2 || "#4c1d95"}
                            onChange={(e) =>
                              setSectionConfigEdit((prev) => ({
                                ...prev,
                                background2: e.target.value,
                              }))
                            }
                            placeholder="#4c1d95"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Text Alignment</Label>
                      <Select
                        value={sectionConfigEdit.alignment || "center"}
                        onValueChange={(v) =>
                          setSectionConfigEdit((prev) => ({
                            ...prev,
                            alignment: v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Text Block fields */}
                {editingSection.kind === "text_block" && (
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={sectionConfigEdit.body || ""}
                      onChange={(e) =>
                        setSectionConfigEdit((prev) => ({
                          ...prev,
                          body: e.target.value,
                        }))
                      }
                      placeholder="Write your content here. Supports plain text."
                      rows={8}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {(sectionConfigEdit.body || "").length} characters
                    </p>
                  </div>
                )}

                {/* Bot Showcase / Bot Group fields */}
                {(editingSection.kind === "bot_showcase" ||
                  editingSection.kind === "bot_group") && (
                  <>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={sectionConfigEdit.description || ""}
                        onChange={(e) =>
                          setSectionConfigEdit((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Describe this collection of bots..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Columns</Label>
                      <Select
                        value={sectionConfigEdit.columns || "3"}
                        onValueChange={(v) =>
                          setSectionConfigEdit((prev) => ({
                            ...prev,
                            columns: v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 columns</SelectItem>
                          <SelectItem value="3">3 columns</SelectItem>
                          <SelectItem value="4">4 columns</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* World Showcase fields */}
                {editingSection.kind === "world_showcase" && (
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={sectionConfigEdit.description || ""}
                      onChange={(e) =>
                        setSectionConfigEdit((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Describe the worlds you want to showcase..."
                      rows={3}
                    />
                  </div>
                )}

                {/* Lorebook Gallery fields */}
                {editingSection.kind === "lorebook_gallery" && (
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={sectionConfigEdit.description || ""}
                      onChange={(e) =>
                        setSectionConfigEdit((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Describe your lorebook collection..."
                      rows={3}
                    />
                  </div>
                )}

                {editingSection.kind === "form" && (
                  <>
                    <div className="space-y-2">
                      <Label>Select a Request Form</Label>
                      {availableForms.length > 0 ? (
                        <Select
                          value={editingFormId || ""}
                          onValueChange={(v) => setEditingFormId(v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a form..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableForms.map((form) => (
                              <SelectItem key={form.id} value={form.id}>
                                {form.form_title || form.id.slice(0, 8)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No forms available. Create a form first in the
                          Requests tab.
                        </p>
                      )}
                    </div>
                    {editingFormId && (
                      <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm">
                        <p className="text-muted-foreground">
                          The selected form will be rendered on your creator
                          page. Visitors can submit requests directly through
                          it.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Sticker/Image fields */}
                {editingSection.kind === "sticker" && (
                  <>
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <Input
                        value={sectionConfigEdit.imageUrl || ""}
                        onChange={(e) =>
                          setSectionConfigEdit((prev) => ({
                            ...prev,
                            imageUrl: e.target.value,
                          }))
                        }
                        placeholder="https://example.com/image.png"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Alt Text</Label>
                      <Input
                        value={sectionConfigEdit.alt || ""}
                        onChange={(e) =>
                          setSectionConfigEdit((prev) => ({
                            ...prev,
                            alt: e.target.value,
                          }))
                        }
                        placeholder="Image description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Select
                        value={sectionConfigEdit.size || "medium"}
                        onValueChange={(v) =>
                          setSectionConfigEdit((prev) => ({
                            ...prev,
                            size: v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small (w-32)</SelectItem>
                          <SelectItem value="medium">Medium (w-64)</SelectItem>
                          <SelectItem value="large">Large (w-96)</SelectItem>
                          <SelectItem value="full">Full Width</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Alignment</Label>
                      <Select
                        value={sectionConfigEdit.alignment || "center"}
                        onValueChange={(v) =>
                          setSectionConfigEdit((prev) => ({
                            ...prev,
                            alignment: v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Border Radius</Label>
                      <Select
                        value={sectionConfigEdit.rounded || "md"}
                        onValueChange={(v) =>
                          setSectionConfigEdit((prev) => ({
                            ...prev,
                            rounded: v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="sm">Small</SelectItem>
                          <SelectItem value="md">Medium</SelectItem>
                          <SelectItem value="lg">Large</SelectItem>
                          <SelectItem value="full">Full (Circle)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Position Mode</Label>
                      <Select
                        value={sectionConfigEdit.positionMode || "static"}
                        onValueChange={(v) =>
                          setSectionConfigEdit((prev) => ({
                            ...prev,
                            positionMode: v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="static">
                            Static (in flow)
                          </SelectItem>
                          <SelectItem value="absolute">
                            Absolute (free position)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {sectionConfigEdit.positionMode === "absolute" && (
                      <>
                        <div className="space-y-2">
                          <Label>
                            Position X{" "}
                            <span className="text-muted-foreground text-[10px]">
                              (e.g. 100px, 50%, -20px)
                            </span>
                          </Label>
                          <Input
                            value={sectionConfigEdit.posX || "0px"}
                            onChange={(e) =>
                              setSectionConfigEdit((prev) => ({
                                ...prev,
                                posX: e.target.value,
                              }))
                            }
                            placeholder="0px"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            Position Y{" "}
                            <span className="text-muted-foreground text-[10px]">
                              (e.g. 200px, 50%, -30px)
                            </span>
                          </Label>
                          <Input
                            value={sectionConfigEdit.posY || "0px"}
                            onChange={(e) =>
                              setSectionConfigEdit((prev) => ({
                                ...prev,
                                posY: e.target.value,
                              }))
                            }
                            placeholder="0px"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rotation (degrees)</Label>
                          <Input
                            type="number"
                            value={sectionConfigEdit.rotation || "0"}
                            onChange={(e) =>
                              setSectionConfigEdit((prev) => ({
                                ...prev,
                                rotation: e.target.value,
                              }))
                            }
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Opacity (%)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={sectionConfigEdit.opacity || "100"}
                            onChange={(e) =>
                              setSectionConfigEdit((prev) => ({
                                ...prev,
                                opacity: e.target.value,
                              }))
                            }
                            placeholder="100"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Z-Index</Label>
                          <Input
                            type="number"
                            value={sectionConfigEdit.zIndex || "10"}
                            onChange={(e) =>
                              setSectionConfigEdit((prev) => ({
                                ...prev,
                                zIndex: e.target.value,
                              }))
                            }
                            placeholder="10"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Divider fields */}
                {editingSection.kind === "divider" && (
                  <>
                    <div className="space-y-2">
                      <Label>Style</Label>
                      <Select
                        value={sectionConfigEdit.style || "line"}
                        onValueChange={(v) =>
                          setSectionConfigEdit((prev) => ({
                            ...prev,
                            style: v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="line">Line</SelectItem>
                          <SelectItem value="dots">Dots</SelectItem>
                          <SelectItem value="gradient">Gradient</SelectItem>
                          <SelectItem value="space">Space</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Height</Label>
                      <Input
                        value={sectionConfigEdit.height || "1"}
                        onChange={(e) =>
                          setSectionConfigEdit((prev) => ({
                            ...prev,
                            height: e.target.value,
                          }))
                        }
                        placeholder="1 (1-8)"
                      />
                    </div>
                  </>
                )}

                {/* Social Links fields */}
                {editingSection.kind === "social_links" && (
                  <div className="space-y-2">
                    <Label>Social Links (JSON array)</Label>
                    <Textarea
                      value={sectionConfigEdit.links || "[]"}
                      onChange={(e) =>
                        setSectionConfigEdit((prev) => ({
                          ...prev,
                          links: e.target.value,
                        }))
                      }
                      placeholder='[{"platform": "Twitter", "url": "https://twitter.com/user", "label": "Twitter"}]'
                      rows={6}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Format: [{"{"}platform, url, label{"}"}]
                    </p>
                  </div>
                )}

                {/* Spacer fields */}
                {editingSection.kind === "spacer" && (
                  <div className="space-y-2">
                    <Label>Height</Label>
                    <Input
                      value={sectionConfigEdit.height || "3rem"}
                      onChange={(e) =>
                        setSectionConfigEdit((prev) => ({
                          ...prev,
                          height: e.target.value,
                        }))
                      }
                      placeholder="3rem"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      e.g. 2rem, 4rem, 100px
                    </p>
                  </div>
                )}

                {/* Preview hint */}
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                  Changes will be visible on the public page after saving.
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingSection(null)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveSection} className="cursor-pointer">
                <Save className="h-4 w-4 mr-1" />
                Save Section
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: Page List
  // -------------------------------------------------------------------------

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Layout className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Creator Pages</h1>
            <p className="text-sm text-muted-foreground">
              Build and customize your public creator page.
            </p>
          </div>
        </div>
        <Button
          onClick={handleCreatePage}
          disabled={saving}
          className="cursor-pointer"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          New Page
        </Button>
      </div>

      {/* Pages */}
      {pages.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card
              key={page.id}
              className="group cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
              onClick={() => openEditor(page)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">
                      {page.title || "Untitled Page"}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {page.description || "No description"}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={page.is_published ? "default" : "secondary"}
                    className="shrink-0 ml-2"
                  >
                    {page.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {layoutLabels[page.layout]}
                    </Badge>
                    <span>
                      {sections.filter((s) => s.page_id === page.id).length}{" "}
                      sections
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>/{page.slug}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {page.is_published && (
                    <a
                      href={`/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePublish(page);
                    }}
                  >
                    {page.is_published ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5 mr-1" /> Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Publish
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePage(page.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Layout className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No creator pages yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Create a public page to showcase your bots, organize them into
              worlds, and share your creative identity.
            </p>
            <Button
              className="mt-4 cursor-pointer"
              onClick={handleCreatePage}
              disabled={saving}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Page
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
