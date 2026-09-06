"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ExternalLink,
  Eye,
  EyeOff,
  Layout,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cachedBrowserRequest } from "@/lib/browser-request-cache";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import type { CreatorPage } from "@/features/creator-pages/types/creator-page-types";


interface CreatorPageSectionRow {
  id: string;
  page_id: string;
}

export function CreatorPages() {
  const router = useRouter();

  const [pages, setPages] = useState<CreatorPage[]>([]);
  const [sections, setSections] = useState<CreatorPageSectionRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const result = await cachedBrowserRequest(
        "creator-pages:list",
        15_000,
        async () => {
          const supabase = createClient();
          const access = await getCurrentUserAccess(supabase);

          if (!access.user) {
            return {
              pages: [] as CreatorPage[],
              sections: [] as CreatorPageSectionRow[],
              userId: null as string | null,
            };
          }

          const { data: pageData, error: pageError } = await supabase
            .from("active_creator_pages")
            .select(
              "id, user_id, slug, title, description, config, is_published, created_at, updated_at",
            )
            .eq("user_id", access.user.id)
            .order("updated_at", { ascending: false });

          if (pageError) throw pageError;

          const pageIds = (pageData || []).map((page) => page.id);

          let sectionData: CreatorPageSectionRow[] = [];

          if (pageIds.length > 0) {
            const { data, error: sectionError } = await supabase
              .from("active_creator_page_sections")
              .select("id, page_id")
              .in("page_id", pageIds)
              .order("position", { ascending: true });

            if (sectionError) throw sectionError;
            sectionData = (data || []) as CreatorPageSectionRow[];
          }

          return {
            pages: (pageData || []) as CreatorPage[],
            sections: sectionData,
            userId: access.user.id,
          };
        },
      );

      setCurrentUserId(result.userId);
      setPages(result.pages);
      setSections(result.sections);
    } catch (error) {
      console.error("Failed to load Creator Pages:", error);
      toast.error("Could not load Creator Pages");
      setCurrentUserId(null);
      setPages([]);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openBuilder = (pageId: string) => {
    router.push(`/creator-pages/${pageId}/builder`);
  };

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
          config: {
            accentColor: "#7c3aed",
            bgStyle: "default",
            fontStyle: "default",
            canvasWidth: "standard",
            sectionGap: "normal",
            pagePadding: "normal",
          },
        })
        .select("id")
        .single();

      if (error) throw error;

      toast.success("Page created");
      openBuilder(data.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create page",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (page: CreatorPage) => {
    if (!currentUserId) return;

    try {
      const supabase = createClient();
      const nextPublished = !page.is_published;

      const { error } = await supabase
        .from("creator_pages")
        .update({ is_published: nextPublished })
        .eq("id", page.id)
        .eq("user_id", currentUserId);

      if (error) throw error;

      setPages((current) =>
        current.map((item) =>
          item.id === page.id ? { ...item, is_published: nextPublished } : item,
        ),
      );

      toast.success(nextPublished ? "Page published!" : "Page unpublished");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update page",
      );
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!currentUserId) return;
    if (!confirm("Delete this creator page?")) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("creator_pages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", pageId)
        .eq("user_id", currentUserId);

      if (error) throw error;

      setPages((current) => current.filter((page) => page.id !== pageId));
      setSections((current) =>
        current.filter((section) => section.page_id !== pageId),
      );
      toast.success("Page deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete page",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Loading Creator Pages…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Creator Pages
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Build standalone pages for your work, worlds, bots, stories, and
            projects.
          </p>
        </div>

        <Button
          onClick={handleCreatePage}
          disabled={saving}
          className="cursor-pointer"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          New Page
        </Button>
      </div>

      {pages.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card
              key={page.id}
              className="group cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
              onClick={() => openBuilder(page.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">
                      {page.title || "Untitled Page"}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {page.description || "No description"}
                    </CardDescription>
                  </div>

                  <Badge
                    variant={page.is_published ? "default" : "secondary"}
                    className="shrink-0 rounded-full"
                  >
                    {page.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    {
                      sections.filter((section) => section.page_id === page.id)
                        .length
                    }{" "}
                    blocks
                  </span>
                  <span className="truncate">/page/{page.slug}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {page.is_published && (
                    <a
                      href={`/page/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                      >
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        View
                      </Button>
                    </a>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleTogglePublish(page);
                    }}
                  >
                    {page.is_published ? (
                      <>
                        <EyeOff className="mr-1 h-3.5 w-3.5" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Publish
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer text-destructive hover:text-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDeletePage(page.id);
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
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Layout className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No Creator Pages yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Create a blank page and build it from blocks.
            </p>
            <Button
              className="mt-4 cursor-pointer"
              onClick={handleCreatePage}
              disabled={saving}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Page
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
