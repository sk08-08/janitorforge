// ============================================================================
// JanitorForge - Form Manager View
// Interface for managing request forms
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
  Clock,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FormBuilder, ShareableLinkDisplay } from "./form-builder";
import { useStore as useAppStore } from "@/lib/store";
import {
  createFormAction,
  updateFormAction,
  deleteFormAction,
} from "@/app/actions/forms";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RequestForm, FormTemplate, FormSection } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";

// Uses String.fromCharCode to avoid formatter mangling HTML entities
const _amp = String.fromCharCode(38);
function escapeHtml(str: string) {
  return String(str).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return _amp + "amp;";
      case "<":
        return _amp + "lt;";
      case ">":
        return _amp + "gt;";
      case '"':
        return _amp + "quot;";
      case "'":
        return _amp + "#39;";
      default:
        return c;
    }
  });
}

function sanitizeUrl(input: string): string {
  const url = String(input || "").trim();
  if (!url) return "";
  // Only allow safe schemes
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    // Has explicit scheme — only allow http, https, mailto
    if (/^https?:$/i.test(url) || /^mailto:$/i.test(url)) {
      return url;
    }
    // Block javascript:, data:, vbscript:, file:, etc.
    return "";
  }
  // Relative URL (no scheme) — allow
  return url;
}

function renderMarkdown(md?: string | null) {
  if (!md) return "";
  let out = escapeHtml(String(md));
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, txt, href) => {
    const sanitized = sanitizeUrl(String(href).trim());
    if (!sanitized) return escapeHtml(txt);
    return `<a href="${escapeHtml(sanitized)}" target="_blank" rel="noopener noreferrer">${escapeHtml(txt)}</a>`;
  });
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__(.+?)__/g, "<strong>$1</strong>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  out = out.replace(/_(.+?)_/g, "<em>$1</em>");
  const lines = out.split(/\r?\n/);
  let result = "";
  let inList = false;
  let listType: "ul" | "ol" | null = null;
  for (const line of lines) {
    const mUn = line.match(/^\s*[-*]\s+(.+)/);
    const mOl = line.match(/^\s*(\d+)\.\s+(.+)/);
    if (mUn || mOl) {
      const thisType = mUn ? "ul" : "ol";
      const content = mUn ? mUn[1] : mOl![2];
      if (!inList || listType !== thisType) {
        if (inList) {
          result += listType === "ul" ? "</ul>" : "</ol>";
        }
        inList = true;
        listType = thisType;
        result += thisType === "ul" ? "<ul>" : "<ol>";
      }
      result += `<li>${content}</li>`;
    } else {
      if (inList) {
        result += listType === "ul" ? "</ul>" : "</ol>";
        inList = false;
        listType = null;
      }
      if (line.trim() === "") {
        result += "<br/>";
      } else {
        result += `<p>${line}</p>`;
      }
    }
  }
  if (inList) result += listType === "ul" ? "</ul>" : "</ol>";
  return result;
}

// ----------------------------------------------------------------------------

interface FormCardProps {
  form: RequestForm;
  requestCount: number;
  ownerLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onEditDeactivation: () => void;
  onCopyLink: () => void;
}

function FormCard({
  form,
  requestCount,
  ownerLabel,
  onEdit,
  onDelete,
  onToggleActive,
  onEditDeactivation,
  onCopyLink,
}: FormCardProps) {
  const fieldCount = form.sections.reduce((sum, s) => sum + s.fields.length, 0);

  return (
    <Card
      className={cn(
        "transition-all hover:border-primary/30",
        !form.isActive && "opacity-60",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4 text-primary" />
                Edit Form
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopyLink}>
                <Copy className="mr-2 h-4 w-4 text-primary" />
                Copy Link
              </DropdownMenuItem>
              {!form.isActive && (
                <DropdownMenuItem onClick={onEditDeactivation}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Deactivation Page
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onToggleActive}>
                {form.isActive ? (
                  <>
                    <ToggleLeft className="mr-2 h-4 w-4 text-warning" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleRight className="mr-2 h-4 w-4 text-success" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive hover:text-white"
              >
                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardTitle
          className="mt-3 text-lg rendered-markdown"
          dangerouslySetInnerHTML={{
            __html: form.title ? renderMarkdown(form.title) : "Untitled Form",
          }}
        />
        <CardDescription
          className="line-clamp-2 rendered-markdown"
          dangerouslySetInnerHTML={{
            __html: form.description
              ? renderMarkdown(form.description)
              : "No description",
          }}
        />
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={form.isActive ? "default" : "secondary"}>
            {form.isActive ? "Active" : "Inactive"}
          </Badge>
          {ownerLabel && <Badge variant="outline">{ownerLabel}</Badge>}
          <Badge variant="outline">
            {form.sections.length} section
            {form.sections.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline">
            {fieldCount} field{fieldCount !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline">
            {requestCount} response{requestCount !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Updated {form.updatedAt.toLocaleDateString()}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs cursor-pointer"
            onClick={() => window.open(`/form/${form.shareableLink}`, "_blank")}
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Empty State
// ----------------------------------------------------------------------------

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <FileText className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mt-6 text-xl font-semibold">No forms yet</h3>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Create your first form to start collecting submissions from your
        community.
      </p>
      <Button className="mt-6 cursor-pointer" onClick={onCreateNew}>
        <Plus className="mr-2 h-4 w-4" />
        Create Your First Form
      </Button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Form Manager Component
// ----------------------------------------------------------------------------

export function FormManager() {
  const {
    forms,
    addForm,
    updateForm,
    deleteForm,
    getRequestsByFormId,
    upsertForm,
  } = useAppStore();

  // UI State
  const [isCreating, setIsCreating] = useState(false);
  const [editingForm, setEditingForm] = useState<RequestForm | null>(null);
  const [deleteConfirmForm, setDeleteConfirmForm] =
    useState<RequestForm | null>(null);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(
    null,
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accessLoaded, setAccessLoaded] = useState(false);

  // Deactivation dialog state
  const [deactivateForm, setDeactivateForm] = useState<RequestForm | null>(
    null,
  );
  const [deactivateMessage, setDeactivateMessage] = useState("");
  const [deactivateRedirectUrl, setDeactivateRedirectUrl] = useState("");
  const [deactivateRedirectLabel, setDeactivateRedirectLabel] = useState("");
  const [deactivateAccentColor, setDeactivateAccentColor] = useState("#7c3aed");

  // Fetch templates when template picker opens
  useEffect(() => {
    if (!showTemplatePicker) return;
    const supabase = createClient();
    supabase
      .from("form_templates")
      .select("*")
      .order("is_builtin", { ascending: false })
      .order("usage_count", { ascending: false })
      .then(({ data }) => {
        if (data) setTemplates(data as FormTemplate[]);
      });
  }, [showTemplatePicker]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const supabase = createClient();
        const { user } = await getCurrentUserAccess(supabase);
        if (!mounted) return;
        setCurrentUserId(user?.id ?? null);
      } catch {
        if (!mounted) return;
        setCurrentUserId(null);
      } finally {
        if (mounted) setAccessLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleNewFormClick = () => {
    setShowTemplatePicker(true);
  };

  const handleSelectTemplate = (template: FormTemplate | null) => {
    setShowTemplatePicker(false);
    setSelectedTemplate(template);
    setIsCreating(true);
  };

  const ownedForms = currentUserId
    ? forms.filter((form) => !form.ownerId || form.ownerId === currentUserId)
    : forms;
  const otherForms = currentUserId
    ? forms.filter((form) => form.ownerId && form.ownerId !== currentUserId)
    : [];

  // Handlers
  const handleCreateForm = (
    formData: Omit<
      RequestForm,
      "id" | "shareableLink" | "createdAt" | "updatedAt"
    >,
  ) => {
    (async () => {
      // Try to persist on server first
      const res = await createFormAction(formData as any);
      if (!res.success) {
        console.error("createFormAction error:", (res as any).raw ?? res);
        toast.error(res.error || "Failed to create form");
        return;
      }
      const r = res.form;
      upsertForm({
        id: r.id,
        ownerId: r.user_id || undefined,
        title: r.title,
        description: r.description || "",
        sections: r.sections || [],
        shareableLink: r.shareable_link || "",
        isActive: !!r.is_active,
        createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
        appearance: r.appearance || undefined,
      });
      setIsCreating(false);
      toast.success("Form created successfully!");
    })();
  };

  const handleUpdateForm = (
    formData: Omit<
      RequestForm,
      "id" | "shareableLink" | "createdAt" | "updatedAt"
    >,
  ) => {
    if (editingForm) {
      (async () => {
        const res = await updateFormAction(editingForm.id, formData as any);
        if (!res.success) {
          console.error("updateFormAction error:", (res as any).raw ?? res);
          toast.error(res.error || "Failed to update form");
          return;
        }
        const r = res.form;
        upsertForm({
          id: r.id,
          ownerId: r.user_id || undefined,
          title: r.title,
          description: r.description || "",
          sections: r.sections || [],
          shareableLink: r.shareable_link || "",
          isActive: !!r.is_active,
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
          updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
          appearance: r.appearance || undefined,
        });
        setEditingForm(null);
        toast.success("Form updated successfully!");
      })();
    }
  };

  const handleDeleteForm = () => {
    if (deleteConfirmForm) {
      (async () => {
        const res = await deleteFormAction(deleteConfirmForm.id);
        if (!res.success) {
          console.error("deleteFormAction error:", (res as any).raw ?? res);
          toast.error(res.error || "Failed to delete form");
          return;
        }
        deleteForm(deleteConfirmForm.id);
        setDeleteConfirmForm(null);
        toast.success("Form deleted successfully");
      })();
    }
  };

  const handleToggleActive = (form: RequestForm) => {
    if (form.isActive) {
      // Deactivating — show dialog to set custom message
      setDeactivateForm(form);
      setDeactivateMessage(form.deactivatedMessage || "");
      setDeactivateRedirectUrl(form.deactivatedRedirectUrl || "");
      setDeactivateRedirectLabel(form.deactivatedRedirectLabel || "");
      setDeactivateAccentColor(form.deactivatedAccentColor || "#7c3aed");
    } else {
      // Activating — do it directly
      doToggleActive(form, true, "");
    }
  };

  const doToggleActive = async (
    form: RequestForm,
    isActive: boolean,
    deactivatedMessage: string,
  ) => {
    const res = await updateFormAction(form.id, {
      isActive,
      deactivatedMessage: deactivatedMessage || "",
      deactivatedRedirectUrl: deactivateRedirectUrl || "",
      deactivatedRedirectLabel: deactivateRedirectLabel || "",
      deactivatedAccentColor: deactivateAccentColor || "#7c3aed",
    } as Partial<RequestForm>);
    if (!res.success) {
      console.error(
        "updateFormAction (toggle) error:",
        (res as any).raw ?? res,
      );
      toast.error(res.error || "Failed to update form");
      return;
    }
    const r = res.form;
    upsertForm({
      id: r.id,
      ownerId: r.user_id || undefined,
      title: r.title,
      description: r.description || "",
      sections: r.sections || [],
      shareableLink: r.shareable_link || "",
      isActive: !!r.is_active,
      deactivatedMessage: r.deactivated_message || "",
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
      updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
      appearance: r.appearance || undefined,
    });
    toast.success(isActive ? "Form activated" : "Form deactivated");
  };

  const handleCopyLink = async (form: RequestForm) => {
    const fullUrl = `${window.location.origin}/form/${form.shareableLink}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleEditDeactivation = (form: RequestForm) => {
    setDeactivateForm(form);
    setDeactivateMessage(form.deactivatedMessage || "");
    setDeactivateRedirectUrl(form.deactivatedRedirectUrl || "");
    setDeactivateRedirectLabel(form.deactivatedRedirectLabel || "");
    setDeactivateAccentColor(form.deactivatedAccentColor || "#7c3aed");
  };

  const handleSaveDeactivation = async () => {
    if (!deactivateForm) return;
    const res = await updateFormAction(deactivateForm.id, {
      deactivatedMessage: deactivateMessage || "",
      deactivatedRedirectUrl: deactivateRedirectUrl || "",
      deactivatedRedirectLabel: deactivateRedirectLabel || "",
      deactivatedAccentColor: deactivateAccentColor || "#7c3aed",
    } as Partial<RequestForm>);
    if (!res.success) {
      toast.error(res.error || "Failed to update deactivation settings");
      return;
    }
    const r = res.form;
    upsertForm({
      id: r.id,
      ownerId: r.user_id || undefined,
      title: r.title,
      description: r.description || "",
      sections: r.sections || [],
      shareableLink: r.shareable_link || "",
      isActive: !!r.is_active,
      deactivatedMessage: r.deactivated_message || "",
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
      updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
      appearance: r.appearance || undefined,
    });
    setDeactivateForm(null);
    setDeactivateMessage("");
    toast.success("Deactivation page updated");
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Request Forms
          </h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
            Design custom forms to collect submissions from your community
          </p>
        </div>
        <Button
          onClick={handleNewFormClick}
          className="cursor-pointer w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Form
        </Button>
      </div>

      {/* Form List */}
      {!accessLoaded ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            Loading form access...
          </CardContent>
        </Card>
      ) : forms.length > 0 ? (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">My forms</h2>
                <p className="text-sm text-muted-foreground">
                  Forms owned by your account.
                </p>
              </div>
              <Badge variant="outline">{ownedForms.length}</Badge>
            </div>
            {ownedForms.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {ownedForms.map((form) => (
                  <FormCard
                    key={form.id}
                    form={form}
                    requestCount={getRequestsByFormId(form.id).length}
                    ownerLabel="Mine"
                    onEdit={() => setEditingForm(form)}
                    onDelete={() => setDeleteConfirmForm(form)}
                    onToggleActive={() => handleToggleActive(form)}
                    onEditDeactivation={() => handleEditDeactivation(form)}
                    onCopyLink={() => handleCopyLink(form)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  No forms in this section.
                </CardContent>
              </Card>
            )}
          </section>

          {otherForms.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Other accounts</h2>
                  <p className="text-sm text-muted-foreground">
                    Forms that belong to other users.
                  </p>
                </div>
                <Badge variant="outline">{otherForms.length}</Badge>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {otherForms.map((form) => (
                  <FormCard
                    key={form.id}
                    form={form}
                    requestCount={getRequestsByFormId(form.id).length}
                    ownerLabel="Other account"
                    onEdit={() => setEditingForm(form)}
                    onDelete={() => setDeleteConfirmForm(form)}
                    onToggleActive={() => handleToggleActive(form)}
                    onEditDeactivation={() => handleEditDeactivation(form)}
                    onCopyLink={() => handleCopyLink(form)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <Card>
          <EmptyState onCreateNew={handleNewFormClick} />
        </Card>
      )}

      {/* Create/Edit Sheet */}
      <Sheet
        open={isCreating || !!editingForm}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setEditingForm(null);
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="p-4 lg:p-6">
            <SheetTitle>
              {editingForm ? "Edit Form" : "Create New Form"}
            </SheetTitle>
            <SheetDescription>
              {editingForm
                ? "Update your form structure and settings (supports markdown in section titles and form description)"
                : "Design a custom form to collect submissions (supports markdown in section titles and form description)"}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {editingForm && (
              <div className="mb-6">
                <ShareableLinkDisplay
                  formId={editingForm.id}
                  shareableLink={editingForm.shareableLink}
                  isActive={editingForm.isActive}
                />
              </div>
            )}
            <FormBuilder
              initialForm={
                editingForm ||
                (selectedTemplate
                  ? {
                      id: "",
                      title: selectedTemplate.name,
                      description: selectedTemplate.description || "",
                      sections: (selectedTemplate.sections ||
                        []) as FormSection[],
                      shareableLink: "",
                      isActive: true,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      appearance: selectedTemplate.appearance || undefined,
                    }
                  : undefined)
              }
              onSave={editingForm ? handleUpdateForm : handleCreateForm}
              onCancel={() => {
                setIsCreating(false);
                setEditingForm(null);
                setSelectedTemplate(null);
              }}
              isEditing={!!editingForm}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Template Picker Dialog */}
      <Dialog open={showTemplatePicker} onOpenChange={setShowTemplatePicker}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-lg sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Start with a pre-built template or create a blank form.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3 grid-cols-1 sm:grid-cols-2">
            {/* Blank form option */}
            <button
              className="flex flex-col items-start gap-2 rounded-lg border border-dashed p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 cursor-pointer"
              onClick={() => handleSelectTemplate(null)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Blank Form</p>
                <p className="text-xs text-muted-foreground">
                  Start from scratch with an empty form.
                </p>
              </div>
            </button>
            {/* Template options */}
            {templates.map((template) => {
              const iconMap: Record<string, typeof FileText> = {
                Bot: FileText,
                Bug: FileText,
                Lightbulb: FileText,
                Paintbrush: FileText,
                FileText,
              };
              const Icon = iconMap[template.icon || "FileText"] || FileText;
              const fieldCount = Array.isArray(template.sections)
                ? (template.sections as FormSection[]).reduce(
                    (sum: number, s: FormSection) => sum + s.fields.length,
                    0,
                  )
                : 0;
              return (
                <button
                  key={template.id}
                  className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 cursor-pointer"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fieldCount} fields · {template.category}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivation Dialog */}
      <Dialog
        open={!!deactivateForm}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateForm(null);
            setDeactivateMessage("");
          }
        }}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {deactivateForm?.isActive
                ? "Deactivate Form"
                : "Edit Deactivation Page"}
            </DialogTitle>
            <DialogDescription>
              {deactivateForm?.isActive
                ? "Users who visit this form will see a custom message. Leave blank to show the default message."
                : "Customize what visitors see when they access this deactivated form."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-sm">Custom Message (optional)</Label>
              <Textarea
                value={deactivateMessage}
                onChange={(e) => setDeactivateMessage(e.target.value)}
                placeholder="e.g. Commissions are currently closed. Follow me on Twitter for updates!"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Redirect Link (optional)</Label>
              <Input
                value={deactivateRedirectUrl}
                onChange={(e) => setDeactivateRedirectUrl(e.target.value)}
                placeholder="https://twitter.com/yourhandle"
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Add a link for visitors to follow (e.g. your social media,
                profile, etc.)
              </p>
            </div>
            {deactivateRedirectUrl && (
              <div className="space-y-2">
                <Label className="text-sm">Button Label</Label>
                <Input
                  value={deactivateRedirectLabel}
                  onChange={(e) => setDeactivateRedirectLabel(e.target.value)}
                  placeholder="Follow me on Twitter"
                  className="h-9"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm">Accent Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={deactivateAccentColor}
                  onChange={(e) => setDeactivateAccentColor(e.target.value)}
                  className="h-9 w-9 rounded cursor-pointer border"
                />
                <Input
                  value={deactivateAccentColor}
                  onChange={(e) => setDeactivateAccentColor(e.target.value)}
                  placeholder="#7c3aed"
                  className="flex-1 h-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeactivateForm(null);
                setDeactivateMessage("");
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant={deactivateForm?.isActive ? "destructive" : "default"}
              onClick={() => {
                if (deactivateForm) {
                  if (deactivateForm.isActive) {
                    doToggleActive(deactivateForm, false, deactivateMessage);
                    setDeactivateForm(null);
                    setDeactivateMessage("");
                  } else {
                    handleSaveDeactivation();
                  }
                }
              }}
              className="cursor-pointer"
            >
              {deactivateForm?.isActive ? "Deactivate Form" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmForm}
        onOpenChange={(open) => !open && setDeleteConfirmForm(null)}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Form
            </DialogTitle>
            <DialogDescription>
              You are about to delete{" "}
              <span className="font-semibold text-foreground">
                "{deleteConfirmForm?.title}"
              </span>
              . This is a soft delete — the form and its submissions will be
              hidden but preserved in the database.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-destructive">What happens:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                The form will be deactivated and hidden from your dashboard
              </li>
              <li>
                The public form link will no longer accept new submissions
              </li>
              <li>
                Existing submissions are preserved but will be hidden from your
                submissions view
              </li>
              <li>
                If this form is linked on your creator page, it will no longer
                be visible to visitors
              </li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmForm(null)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteForm}
              className="cursor-pointer"
            >
              Delete Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
