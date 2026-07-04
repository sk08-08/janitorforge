"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Pencil,
  Plus,
  Pin,
  Trash2,
  Logs,
  PenLineIcon,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MarkdownContent } from "./markdown-content";

type HubLogPostRow = {
  id: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  label: string | null;
  source_name: string | null;
  source_url: string | null;
  sort_order: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type HubLogPostFormState = {
  title: string;
  excerpt: string;
  body: string;
  label: string;
  sourceName: string;
  sourceUrl: string;
  isPublished: boolean;
};

const LOG_SELECTED_STORAGE_KEY = "janitorforge-logs-post";

const emptyLogForm: HubLogPostFormState = {
  title: "",
  excerpt: "",
  body: "",
  label: "",
  sourceName: "",
  sourceUrl: "",
  isPublished: true,
};

export function LogsHub() {
  const [posts, setPosts] = useState<HubLogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postDetailOpen, setPostDetailOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postForm, setPostForm] = useState<HubLogPostFormState>(emptyLogForm);
  const [saving, setSaving] = useState(false);
  const [deletePostTarget, setDeletePostTarget] =
    useState<HubLogPostRow | null>(null);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const access = await getCurrentUserAccess(supabase);
      setIsAdmin(access.isAdmin);

      let query = supabase
        .from("hub_log_posts")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (!access.isAdmin) {
        query = query.eq("is_published", true);
      }

      const { data, error } = await query;
      if (error) throw error;

      setPosts((data || []) as HubLogPostRow[]);
    } catch (error: any) {
      console.error("Failed to load logs hub:", error);
      setPosts([]);
      toast.error(error.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (selectedPostId) {
      localStorage.setItem(LOG_SELECTED_STORAGE_KEY, selectedPostId);
    } else {
      localStorage.removeItem(LOG_SELECTED_STORAGE_KEY);
    }
  }, [selectedPostId]);

  useEffect(() => {
    if (loading || hydrated) return;
    if (posts.length === 0) {
      setSelectedPostId(null);
      setHydrated(true);
      return;
    }

    const savedPostId = localStorage.getItem(LOG_SELECTED_STORAGE_KEY);
    const resolvedPost =
      posts.find((post) => post.id === savedPostId) ?? posts[0];

    setSelectedPostId(resolvedPost.id);
    setHydrated(true);
  }, [loading, hydrated, posts]);

  useEffect(() => {
    if (!selectedPostId || posts.length === 0) return;
    const exists = posts.some((post) => post.id === selectedPostId);
    if (!exists) {
      setSelectedPostId(posts[0]?.id ?? null);
    }
  }, [selectedPostId, posts]);

  const openPostDetail = (post: HubLogPostRow) => {
    setSelectedPostId(post.id);
    setPostDetailOpen(true);
  };

  const openPostDialog = (post?: HubLogPostRow) => {
    if (post) {
      setEditingPostId(post.id);
      setPostForm({
        title: post.title,
        excerpt: post.excerpt || "",
        body: post.body || "",
        label: post.label || "",
        sourceName: post.source_name || "",
        sourceUrl: post.source_url || "",
        isPublished: post.is_published,
      });
    } else {
      setEditingPostId(null);
      setPostForm(emptyLogForm);
    }
    setPostDialogOpen(true);
  };

  const savePost = async () => {
    if (!postForm.title.trim()) {
      toast.error("Enter a post title");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        title: postForm.title.trim(),
        excerpt: postForm.excerpt.trim() || null,
        body: postForm.body.trim() || null,
        label: postForm.label.trim() || null,
        source_name: postForm.sourceName.trim() || null,
        source_url: postForm.sourceUrl.trim() || null,
        is_published: postForm.isPublished,
        published_at: postForm.isPublished ? new Date().toISOString() : null,
      };

      if (editingPostId) {
        const { error } = await supabase
          .from("hub_log_posts")
          .update(payload)
          .eq("id", editingPostId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hub_log_posts").insert({
          ...payload,
          sort_order: posts.length,
        });
        if (error) throw error;
      }

      setPostDialogOpen(false);
      setEditingPostId(null);
      setPostForm(emptyLogForm);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("hub_log_posts")
        .delete()
        .eq("id", postId);
      if (error) throw error;
      if (selectedPostId === postId) {
        setSelectedPostId(null);
      }
      await loadData();
      toast.success("Post deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete post");
    }
  };

  const reorderPosts = async (postId: string, direction: "up" | "down") => {
    const index = posts.findIndex((post) => post.id === postId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= posts.length) return;

    const nextPosts = [...posts];
    [nextPosts[index], nextPosts[targetIndex]] = [
      nextPosts[targetIndex],
      nextPosts[index],
    ];

    try {
      const supabase = createClient();
      await Promise.all(
        nextPosts.map((post, sort_order) =>
          supabase
            .from("hub_log_posts")
            .update({ sort_order })
            .eq("id", post.id),
        ),
      );
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reorder posts");
    }
  };

  const togglePublish = async (post: HubLogPostRow) => {
    try {
      const supabase = createClient();
      const nextPublished = !post.is_published;
      const { error } = await supabase
        .from("hub_log_posts")
        .update({
          is_published: nextPublished,
          published_at: nextPublished ? new Date().toISOString() : null,
        })
        .eq("id", post.id);
      if (error) throw error;
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update post");
    }
  };

  return (
    <div className="min-h-full p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="border-border/70 bg-card/95 shadow-xl">
          <CardContent className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Logs className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Janitor AI Logs
                  </h1>
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                  A masonry feed about the platform's errors, lack of
                  communication, and other issues.
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button
                onClick={() => openPostDialog()}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" /> New post
              </Button>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <Card className="border-border/70 bg-card/95">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Loading logs...
            </CardContent>
          </Card>
        ) : posts.length === 0 ? (
          <Card className="border-border/70 bg-card/95">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No posts yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 2xl:columns-4">
              {posts.map((post, index) => {
                const active = post.id === selectedPostId;
                return (
                  <Card
                    key={post.id}
                    className={cn(
                      "mb-4 inline-block w-full break-inside-avoid border-border/70 bg-card/95 transition-all",
                      active
                        ? "border-primary shadow-sm"
                        : "hover:border-primary/40",
                    )}
                  >
                    <CardContent className="space-y-4 p-5">
                      <div
                        onClick={() => openPostDetail(post)}
                        role="button"
                        tabIndex={0}
                        className="block w-full cursor-pointer text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  post.is_published ? "default" : "secondary"
                                }
                              >
                                {post.is_published ? "Published" : "Draft"}
                              </Badge>
                              {post.label && (
                                <Badge variant="outline">{post.label}</Badge>
                              )}
                            </div>
                            <h2 className="text-base font-semibold">
                              {post.title}
                            </h2>
                            <p className="line-clamp-3 text-sm text-muted-foreground">
                              {post.excerpt || "No excerpt yet."}
                            </p>
                            {post.body && (
                              <div className="mt-3 max-h-40 overflow-hidden rounded-xl border border-border/70 bg-muted/20 p-3 text-sm text-foreground/90">
                                <MarkdownContent
                                  content={post.body}
                                  className="prose-sm max-w-none"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        <Pin className="h-4 w-4 text-primary" />
                        {post.source_name && <span>{post.source_name}</span>}
                        {post.published_at && (
                          <span>
                            • {new Date(post.published_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {isAdmin && (
                        <Collapsible defaultOpen={false}>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 cursor-pointer px-3 text-xs text-muted-foreground"
                            >
                              Manage post
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 cursor-pointer"
                                disabled={index === 0}
                                onClick={() => reorderPosts(post.id, "up")}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 cursor-pointer"
                                disabled={index === posts.length - 1}
                                onClick={() => reorderPosts(post.id, "down")}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => openPostDialog(post)}
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => togglePublish(post)}
                              >
                                {post.is_published ? "Unpublish" : "Publish"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletePostTarget(post)}
                                className="text-destructive cursor-pointer hover:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </Button>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPostId ? "Edit post" : "New post"}
            </DialogTitle>
            <DialogDescription>Create or update a log entry.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={postForm.title}
                onChange={(event) =>
                  setPostForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Excerpt</label>
              <Textarea
                value={postForm.excerpt}
                onChange={(event) =>
                  setPostForm((prev) => ({
                    ...prev,
                    excerpt: event.target.value,
                  }))
                }
                rows={3}
                className="max-h-32 resize-none overflow-y-auto"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Body</label>
              <p className="text-xs text-muted-foreground">
                Markdown and image syntax are supported.
              </p>
              <Textarea
                value={postForm.body}
                onChange={(event) =>
                  setPostForm((prev) => ({ ...prev, body: event.target.value }))
                }
                rows={6}
                placeholder="Use markdown, lists, links, and image syntax like ![alt](https://...)"
                className="max-h-56 resize-none overflow-y-auto"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Label</label>
                <Input
                  value={postForm.label}
                  onChange={(event) =>
                    setPostForm((prev) => ({
                      ...prev,
                      label: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Source name</label>
                <Input
                  value={postForm.sourceName}
                  onChange={(event) =>
                    setPostForm((prev) => ({
                      ...prev,
                      sourceName: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source URL</label>
              <Input
                value={postForm.sourceUrl}
                onChange={(event) =>
                  setPostForm((prev) => ({
                    ...prev,
                    sourceUrl: event.target.value,
                  }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Published</p>
                <p className="text-xs text-muted-foreground">
                  Visible to everyone when enabled.
                </p>
              </div>
              <Switch
                checked={postForm.isPublished}
                onCheckedChange={(checked) =>
                  setPostForm((prev) => ({ ...prev, isPublished: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setPostDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={savePost}
              className="cursor-pointer"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletePostTarget}
        onOpenChange={(open) => {
          if (!open) setDeletePostTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              {deletePostTarget?.title || "this post"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deletePostTarget) return;
                const targetId = deletePostTarget.id;
                setDeletePostTarget(null);
                await deletePost(targetId);
              }}
              className="bg-destructive cursor-pointer text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={postDetailOpen && !!selectedPost}
        onOpenChange={setPostDetailOpen}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-7xl">
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl">
              {selectedPost?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedPost && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={selectedPost.is_published ? "default" : "secondary"}
                >
                  {selectedPost.is_published ? "Published" : "Draft"}
                </Badge>
                {selectedPost.label && (
                  <Badge variant="outline">{selectedPost.label}</Badge>
                )}
                {selectedPost.source_name && (
                  <Badge variant="outline">{selectedPost.source_name}</Badge>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <ScrollArea className="h-[60vh] rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <div className="space-y-4 pr-2">
                    {selectedPost.excerpt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Excerpt
                        </p>
                        <p className="mt-2 text-sm leading-6 text-foreground/90">
                          {selectedPost.excerpt}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Body
                      </p>
                      <div className="prose prose-sm mt-3 max-w-none dark:prose-invert">
                        {selectedPost.body ? (
                          <MarkdownContent content={selectedPost.body} />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No body yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="space-y-4 rounded-2xl border border-border/70 bg-background p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Source</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPost.source_name || "No source name"}
                    </p>
                    {selectedPost.source_url && (
                      <a
                        href={selectedPost.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                      >
                        Open source <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Metadata</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        Created{" "}
                        {new Date(selectedPost.created_at).toLocaleDateString()}
                        <PenLineIcon className="ml-2 h-4 w-4" />
                      </Badge>
                      {selectedPost.published_at && (
                        <Badge variant="outline">
                          Published{" "}
                          {new Date(
                            selectedPost.published_at,
                          ).toLocaleDateString()}
                          <Upload className="ml-2 h-4 w-4" />
                        </Badge>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => {
                          setPostDetailOpen(false);
                          openPostDialog(selectedPost);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="cursor-pointer"
                        onClick={() => togglePublish(selectedPost)}
                      >
                        {selectedPost.is_published ? "Unpublish" : "Publish"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
