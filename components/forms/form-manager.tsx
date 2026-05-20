// ============================================================================
// JanitorForge - Form Manager View
// Interface for managing request forms
// ============================================================================

"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { RequestForm } from "@/lib/types";

// ----------------------------------------------------------------------------

interface FormCardProps {
  form: RequestForm;
  requestCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onCopyLink: () => void;
}

function FormCard({
  form,
  requestCount,
  onEdit,
  onDelete,
  onToggleActive,
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
                <Pencil className="mr-2 h-4 w-4" />
                Edit Form
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopyLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleActive}>
                {form.isActive ? (
                  <>
                    <ToggleLeft className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleRight className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardTitle className="mt-3 text-lg">{form.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {form.description || "No description"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={form.isActive ? "default" : "secondary"}>
            {form.isActive ? "Active" : "Inactive"}
          </Badge>
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
            disabled={!form.isActive}
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
        Create your first request form to start collecting bot ideas from your
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
        toast.error(res.error || "Failed to create form");
        return;
      }
      const r = res.form;
      upsertForm({
        id: r.id,
        title: r.title,
        description: r.description || "",
        sections: r.sections || [],
        shareableLink: r.shareable_link || "",
        isActive: !!r.is_active,
        createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
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
          toast.error(res.error || "Failed to update form");
          return;
        }
        const r = res.form;
        upsertForm({
          id: r.id,
          title: r.title,
          description: r.description || "",
          sections: r.sections || [],
          shareableLink: r.shareable_link || "",
          isActive: !!r.is_active,
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
          updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
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
    (async () => {
      const res = await updateFormAction(form.id, {
        isActive: !form.isActive,
      } as Partial<RequestForm>);
      if (!res.success) {
        toast.error(res.error || "Failed to update form");
        return;
      }
      const r = res.form;
      upsertForm({
        id: r.id,
        title: r.title,
        description: r.description || "",
        sections: r.sections || [],
        shareableLink: r.shareable_link || "",
        isActive: !!r.is_active,
        createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
      });
      toast.success(form.isActive ? "Form deactivated" : "Form activated");
    })();
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

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Request Forms</h1>
          <p className="mt-1 text-muted-foreground">
            Design custom forms to collect bot requests from your community
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          New Form
        </Button>
      </div>

      {/* Form List */}
      {forms.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              requestCount={getRequestsByFormId(form.id).length}
              onEdit={() => setEditingForm(form)}
              onDelete={() => setDeleteConfirmForm(form)}
              onToggleActive={() => handleToggleActive(form)}
              onCopyLink={() => handleCopyLink(form)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState onCreateNew={() => setIsCreating(true)} />
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
                ? "Update your form structure and settings"
                : "Design a custom form to collect bot requests"}
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
              initialForm={editingForm || undefined}
              onSave={editingForm ? handleUpdateForm : handleCreateForm}
              onCancel={() => {
                setIsCreating(false);
                setEditingForm(null);
              }}
              isEditing={!!editingForm}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmForm}
        onOpenChange={(open) => !open && setDeleteConfirmForm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Form</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirmForm?.title}
              &quot;? This will also delete all associated requests. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
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
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
