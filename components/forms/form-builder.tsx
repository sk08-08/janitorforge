// ============================================================================
// JanitorForge - Form Builder Component
// Visual form designer for creating custom forms
// ============================================================================

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  GripVertical,
  Type,
  AlignLeft,
  ListChecks,
  CircleDot,
  CheckSquare,
  Tags,
  Save,
  X,
  Copy,
  ExternalLink,
  Bold,
  Italic,
  Link as LinkIcon,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Info,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import type {
  FormField,
  FormSection,
  FormFieldType,
  RequestForm,
} from "@/lib/types";
import {
  defaultFormAppearance,
  formAppearanceAccents,
  formAppearanceDensityOptions,
  formAppearancePresets,
  getFormAppearanceClasses,
  resolveFormAppearance,
} from "@/lib/form-appearance";
import { toast } from "sonner";
import { MarkdownRenderer } from "./markdown-renderer";
import type { FieldCondition, ConditionOperator } from "@/lib/types";
import {
  removeFormSectionImageAction,
  uploadFormSectionImageAction,
} from "@/app/actions/forms";
import { getFormAssetPublicUrl } from "@/lib/form-assets";
import { CustomColorPicker } from "@/components/ui/custom-color-picker";

function sanitizeUrl(input: string) {
  const url = String(input || "").trim();
  try {
    const parsed = new URL(url, "http://example.com");
    // Allow http/https and mailto
    if (/^https?:$/i.test(parsed.protocol) || /^mailto:$/i.test(url)) {
      return url;
    }
  } catch {}
  return "";
}

function toggleListMarkersForText(text: string, type: "ul" | "ol") {
  const lines = String(text || "").split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim() !== "");
  if (nonEmpty.length === 0) {
    return text;
  }
  const isAllMarked = nonEmpty.every((l, i) => {
    if (type === "ul") return /^\s*[-*]\s+/.test(l);
    return /^\s*\d+\.\s+/.test(l);
  });
  if (isAllMarked) {
    // remove markers
    return lines.map((l) => l.replace(/^\s*([-*]|\d+\.)\s+/, "")).join("\n");
  }
  // add markers
  if (type === "ul") {
    return lines.map((l) => (l.trim() === "" ? l : `- ${l}`)).join("\n");
  }
  // ol
  let counter = 1;
  return lines
    .map((l) => (l.trim() === "" ? l : `${counter++}. ${l}`))
    .join("\n");
}

function toggleListInElementById(
  id: string,
  type: "ul" | "ol",
  currentValue: string,
  applyUpdate: (newValue: string) => void,
) {
  const el = document.getElementById(id) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
  if (
    el &&
    (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
  ) {
    const value = el.value || "";
    const start = (el as any).selectionStart ?? 0;
    const end = (el as any).selectionEnd ?? start;
    // expand selection to full lines
    const lineStart = Math.max(
      0,
      value.lastIndexOf("\n", Math.max(0, start - 1)) + 1,
    );
    let lineEnd = value.indexOf("\n", end);
    if (lineEnd === -1) lineEnd = value.length;
    const segment = value.substring(lineStart, lineEnd);
    const toggled = toggleListMarkersForText(segment, type);
    const newValue =
      value.substring(0, lineStart) + toggled + value.substring(lineEnd);
    applyUpdate(newValue);
    requestAnimationFrame(() => {
      try {
        el.focus();
        (el as any).setSelectionRange(lineStart, lineStart + toggled.length);
      } catch {}
    });
  } else {
    applyUpdate(toggleListMarkersForText(currentValue || "", type));
  }
}

function isWrappedInElementById(
  id: string,
  before: string,
  after = "",
  currentValue?: string,
) {
  const el = document.getElementById(id) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLElement
    | null;
  if (
    el &&
    (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
  ) {
    const value = el.value || "";
    const start = (el as any).selectionStart ?? 0;
    const end = (el as any).selectionEnd ?? start;
    const sel = value.substring(start, end);
    const target = sel || value;
    return target.startsWith(before) && target.endsWith(after);
  }
  const val = currentValue || "";
  return val.startsWith(before) && val.endsWith(after);
}

function applyToggleWrap(
  value: string,
  start: number,
  end: number,
  before: string,
  after = "",
) {
  const val = value || "";
  const sel = val.substring(start, end);
  // If selection is wrapped, remove markers
  if (sel.startsWith(before) && sel.endsWith(after)) {
    const inner = sel.substring(before.length, sel.length - after.length);
    const newValue = val.substring(0, start) + inner + val.substring(end);
    return {
      newValue,
      newStart: start,
      newEnd: start + inner.length,
    };
  }
  if (start === end) {
    const openIndex = val.lastIndexOf(
      before,
      Math.max(0, start - before.length),
    );
    const closeIndex = val.indexOf(after || before, start);
    if (
      openIndex !== -1 &&
      closeIndex !== -1 &&
      openIndex < start &&
      start <= closeIndex
    ) {
      const inner = val.substring(openIndex + before.length, closeIndex);
      const newValue =
        val.substring(0, openIndex) +
        inner +
        val.substring(closeIndex + after.length);
      return {
        newValue,
        newStart: openIndex,
        newEnd: openIndex + inner.length,
      };
    }
  }
  // No selection: toggle entire value
  if (start === end) {
    if (val.startsWith(before) && val.endsWith(after)) {
      const inner = val.substring(before.length, val.length - after.length);
      return { newValue: inner, newStart: 0, newEnd: inner.length };
    }
    const newValue = before + val + after;
    return { newValue, newStart: before.length, newEnd: before.length };
  }
  // Otherwise wrap selection
  const wrapped =
    val.substring(0, start) + before + sel + after + val.substring(end);
  return {
    newValue: wrapped,
    newStart: start + before.length,
    newEnd: start + before.length + sel.length,
  };
}

// Inline editor that shows rendered markdown and allows in-place editing.
const InlineMarkdownEditor = React.forwardRef(
  (
    {
      id,
      value,
      onChange,
      placeholder,
      rows = 1,
      className = "",
    }: {
      id: string;
      value?: string | null;
      onChange: (v: string) => void;
      placeholder?: string;
      rows?: number;
      className?: string;
    },
    ref,
  ) => {
    const [editing, setEditing] = useState(false);
    const taRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
      if (editing && taRef.current) {
        taRef.current.focus();
        const len = taRef.current.value.length;
        taRef.current.setSelectionRange(len, len);
      }
    }, [editing]);

    React.useImperativeHandle(ref, () => ({
      enterEditing: () => setEditing(true),
      isEditing: () => editing,
    }));

    return (
      <div className={`inline-markdown-editor ${className}`}>
        {!editing ? (
          <div
            id={id}
            className="cursor-text rendered-markdown"
            onClick={() => setEditing(true)}
          >
            {value ? (
              <MarkdownRenderer
                content={value}
                className="[&>*:last-child]:mb-0"
              />
            ) : (
              <span className="text-muted-foreground italic">
                {placeholder}
              </span>
            )}
          </div>
        ) : (
          <textarea
            id={id}
            ref={taRef}
            rows={rows}
            value={value || ""}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            className="w-full resize-y rounded border px-2 py-1 text-sm"
          />
        )}
      </div>
    );
  },
);
InlineMarkdownEditor.displayName = "InlineMarkdownEditor";

// ----------------------------------------------------------------------------
// Field Type Configuration
// ----------------------------------------------------------------------------

const fieldTypes: { type: FormFieldType; label: string; icon: typeof Type }[] =
  [
    { type: "text", label: "Short Text", icon: Type },
    { type: "textarea", label: "Long Text", icon: AlignLeft },
    { type: "select", label: "Dropdown", icon: ListChecks },
    { type: "radio", label: "Single Choice", icon: CircleDot },
    { type: "checkbox", label: "Multiple Choice", icon: CheckSquare },
    { type: "rating-type", label: "SFW/NSFW Rating", icon: Tags },
    { type: "tags", label: "Tag Input", icon: Tags },
  ];

// ----------------------------------------------------------------------------
// Field Editor Component
// ----------------------------------------------------------------------------

interface FieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onDelete: () => void;
  allFields?: FormField[];
  openLinkModal?: (cb: (url: string) => void) => void;
}

const conditionOperators: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "is_not_empty", label: "is not empty" },
  { value: "is_empty", label: "is empty" },
];

function FieldEditor({
  field,
  onUpdate,
  onDelete,
  allFields = [],
}: FieldEditorProps) {
  const [optionInput, setOptionInput] = useState("");
  const labelRef = useRef<any>(null);
  const descRef = useRef<any>(null);
  const fieldConfig = fieldTypes.find((f) => f.type === field.type);
  const Icon = fieldConfig?.icon || Type;

  const addOption = () => {
    if (optionInput.trim() && field.options) {
      onUpdate({
        ...field,
        options: [...field.options, optionInput.trim()],
      });
      setOptionInput("");
    }
  };

  const moveOption = (index: number, dir: number) => {
    if (!field.options) return;
    const newOptions = [...field.options];
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= newOptions.length) return;
    const tmp = newOptions[newIndex];
    newOptions[newIndex] = newOptions[index];
    newOptions[index] = tmp;
    onUpdate({ ...field, options: newOptions });
  };

  const updateOption = (index: number, value: string) => {
    if (!field.options) return;
    const newOptions = [...field.options];
    newOptions[index] = value;
    onUpdate({ ...field, options: newOptions });
  };

  const removeOption = (index: number) => {
    if (field.options) {
      onUpdate({
        ...field,
        options: field.options.filter((_, i) => i !== index),
      });
    }
  };

  const needsOptions = ["select", "radio", "checkbox"].includes(field.type);

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-4 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* Drag handle placeholder */}
          <div className="cursor-grab self-start text-muted-foreground sm:mt-2">
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            {/* Field header */}
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                <Icon className="h-4 w-4" />
              </div>
              <Badge variant="outline" className="max-w-full truncate text-xs">
                {fieldConfig?.label || field.type}
              </Badge>
              {field.required && (
                <Badge
                  variant="secondary"
                  className="max-w-full truncate text-xs"
                >
                  Required
                </Badge>
              )}
            </div>

            {/* Label input */}
            <div className="space-y-1.5">
              <Label className="text-xs">Field Label</Label>
              <InlineMarkdownEditor
                ref={labelRef}
                id={`field-label-${field.id}`}
                value={field.label}
                onChange={(v) => onUpdate({ ...field, label: v })}
                placeholder="Enter field label..."
              />
            </div>

            {/* Placeholder input (for text fields) */}
            {["text", "textarea", "tags"].includes(field.type) && (
              <div className="space-y-1.5">
                <Label className="text-xs">Placeholder</Label>
                <Input
                  value={field.placeholder || ""}
                  onChange={(e) =>
                    onUpdate({ ...field, placeholder: e.target.value })
                  }
                  placeholder="Enter placeholder text..."
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>

              <InlineMarkdownEditor
                ref={descRef}
                id={`field-desc-${field.id}`}
                value={field.description}
                onChange={(v) => onUpdate({ ...field, description: v })}
                placeholder="Help text for this field..."
                rows={2}
              />
            </div>

            {/* Options (for select, radio, checkbox) */}
            {needsOptions && (
              <div className="space-y-2">
                <Label className="text-xs">Options</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    placeholder="Add an option..."
                    className="min-w-0 flex-1"
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addOption())
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addOption}
                    className="cursor-pointer sm:self-auto self-end"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {field.options && field.options.length > 0 && (
                  <div className="space-y-2">
                    {field.options.map((option, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-2 sm:flex-row sm:items-center"
                      >
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          className="min-w-0 flex-1"
                        />
                        <div className="flex items-center gap-1 self-end sm:self-auto">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveOption(index, -1)}
                            title="Move up"
                            className="cursor-pointer"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveOption(index, 1)}
                            title="Move down"
                            className="cursor-pointer"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(index)}
                            title="Remove"
                            className="text-destructive cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Allow 'Other' option for select/radio */}
                {(field.type === "radio" || field.type === "select") && (
                  <div className="flex items-center gap-2 mt-2">
                    <Switch
                      checked={(field as any).allowOther === true}
                      onCheckedChange={(checked) =>
                        onUpdate({ ...(field as any), allowOther: checked })
                      }
                      id={`allow-other-${field.id}`}
                    />
                    <Label
                      htmlFor={`allow-other-${field.id}`}
                      className="cursor-pointer"
                    >
                      Allow "Other" option
                    </Label>
                  </div>
                )}
              </div>
            )}

            {/* Required toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={field.required}
                onCheckedChange={(checked) =>
                  onUpdate({ ...field, required: checked })
                }
                id={`required-${field.id}`}
              />
              <Label
                htmlFor={`required-${field.id}`}
                className="text-sm cursor-pointer"
              >
                Required field
              </Label>
            </div>

            {/* Conditional display */}
            {allFields.length > 1 && (
              <div className="space-y-2 rounded-lg border border-dashed p-3 overflow-hidden">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="text-xs font-medium">
                    Conditional Display
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs cursor-pointer"
                    onClick={() => {
                      const newCondition: FieldCondition = {
                        fieldId: "",
                        operator: "is_not_empty",
                      };
                      onUpdate({
                        ...field,
                        conditions: [...(field.conditions || []), newCondition],
                      });
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Rule
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Show this field only when conditions are met.
                </p>
                {field.conditions && field.conditions.length > 0 && (
                  <div className="space-y-2">
                    {field.conditions.map((cond, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col gap-2 rounded-md border bg-background/50 p-2 text-xs sm:flex-row sm:flex-wrap sm:items-center"
                      >
                        <span className="text-muted-foreground">Show when</span>
                        <Select
                          value={cond.fieldId || ""}
                          onValueChange={(v) => {
                            const newConds = [...field.conditions!];
                            newConds[idx] = { ...cond, fieldId: v };
                            onUpdate({ ...field, conditions: newConds });
                          }}
                        >
                          <SelectTrigger className="h-7 w-full text-xs sm:w-36">
                            <SelectValue placeholder="Select field..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allFields
                              .filter((f) => f.id !== field.id)
                              .map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.label || f.id}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={cond.operator}
                          onValueChange={(v) => {
                            const newConds = [...field.conditions!];
                            newConds[idx] = {
                              ...cond,
                              operator: v as ConditionOperator,
                            };
                            onUpdate({ ...field, conditions: newConds });
                          }}
                        >
                          <SelectTrigger className="h-7 w-full text-xs sm:w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {conditionOperators.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!["is_empty", "is_not_empty"].includes(
                          cond.operator,
                        ) && (
                          <Input
                            value={cond.value || ""}
                            onChange={(e) => {
                              const newConds = [...field.conditions!];
                              newConds[idx] = {
                                ...cond,
                                value: e.target.value,
                              };
                              onUpdate({ ...field, conditions: newConds });
                            }}
                            placeholder="value"
                            className="h-7 w-full text-xs sm:w-28"
                          />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 self-end text-destructive cursor-pointer sm:self-auto"
                          onClick={() => {
                            const newConds = field.conditions!.filter(
                              (_, i) => i !== idx,
                            );
                            onUpdate({ ...field, conditions: newConds });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive cursor-pointer"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Section Editor Component
// ----------------------------------------------------------------------------

interface SectionEditorProps {
  section: FormSection;
  onUpdate: (section: FormSection) => void;
  onDelete: () => void;
  openLinkModal?: (cb: (url: string) => void) => void;
}

function SectionEditor({
  section,
  onUpdate,
  onDelete,
  openLinkModal,
}: SectionEditorProps) {
  const descRef = useRef<any>(null);
  const sectionImageInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const addField = (type: FormFieldType) => {
    const newField: FormField = {
      id: uuidv4(),
      type,
      label: "",
      required: false,
      options: ["select", "radio", "checkbox"].includes(type) ? [] : undefined,
    };
    onUpdate({
      ...section,
      fields: [...section.fields, newField],
    });
  };

  const updateField = (fieldId: string, updatedField: FormField) => {
    onUpdate({
      ...section,
      fields: section.fields.map((f) => (f.id === fieldId ? updatedField : f)),
    });
  };

  const deleteField = (fieldId: string) => {
    onUpdate({
      ...section,
      fields: section.fields.filter((f) => f.id !== fieldId),
    });
  };

  const handleSectionImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (section.custom?.imageAssetPath) {
        formData.append("existingPath", section.custom.imageAssetPath);
      }

      const result = await uploadFormSectionImageAction(formData);
      if (!result.success || !result.path) {
        toast.error(result.error ?? "Failed to upload image");
        return;
      }

      onUpdate({
        ...section,
        custom: {
          ...(section.custom || {}),
          imageAssetPath: result.path,
        },
      });
      toast.success("Section image uploaded");
    } finally {
      setIsUploadingImage(false);
      if (sectionImageInputRef.current) {
        sectionImageInputRef.current.value = "";
      }
    }
  };

  const handleRemoveSectionImage = async () => {
    const imagePath = String(section.custom?.imageAssetPath || "").trim();
    if (!imagePath) return;

    const result = await removeFormSectionImageAction(imagePath);
    if (!result.success) {
      toast.error(result.error ?? "Failed to remove image");
      return;
    }

    onUpdate({
      ...section,
      custom: {
        ...(section.custom || {}),
        imageAssetPath: undefined,
      },
    });
    toast.success("Section image removed");
  };

  // Wrap selection for inputs inside this section by element id
  const wrapSelectionInSection = (
    key: "title" | "description",
    before: string,
    after = "",
  ) => {
    const id =
      key === "title"
        ? `section-title-${section.id}`
        : `section-desc-${section.id}`;
    const el = document.getElementById(id) as HTMLElement | null;
    if (
      el &&
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
    ) {
      const start = (el as any).selectionStart ?? 0;
      const end = (el as any).selectionEnd ?? start;
      const value = el.value || "";
      const result = applyToggleWrap(value, start, end, before, after);
      if (key === "title") onUpdate({ ...section, title: result.newValue });
      else onUpdate({ ...section, description: result.newValue });
      requestAnimationFrame(() => {
        try {
          el.focus();
          (el as any).setSelectionRange(result.newStart, result.newEnd);
        } catch {}
      });
    } else {
      const cur =
        key === "title" ? section.title || "" : section.description || "";
      const res = applyToggleWrap(cur, 0, 0, before, after);
      if (key === "title") onUpdate({ ...section, title: res.newValue });
      else onUpdate({ ...section, description: res.newValue });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <Input
                id={`section-title-${section.id}`}
                value={section.title || ""}
                onChange={(e) =>
                  onUpdate({ ...section, title: e.target.value })
                }
                placeholder="Section Title"
                className="w-full min-w-0 text-lg font-semibold border-none px-0 focus-visible:ring-0 bg-transparent"
              />
            </div>
            <div>
              <InlineMarkdownEditor
                ref={descRef}
                id={`section-desc-${section.id}`}
                value={section.description}
                onChange={(v) => onUpdate({ ...section, description: v })}
                placeholder="Section description (optional)"
                rows={2}
                className="text-sm text-muted-foreground"
              />
            </div>
            {/* Section layout */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2 min-w-0">
                <Label className="text-xs text-muted-foreground shrink-0">
                  Alignment
                </Label>
                <Select
                  value={section.custom?.headerAlignment || "left"}
                  onValueChange={(val) =>
                    onUpdate({
                      ...section,
                      custom: {
                        ...(section.custom || {}),
                        headerAlignment: val as any,
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Switch
                  checked={!!section.custom?.collapsible}
                  onCheckedChange={(checked) =>
                    onUpdate({
                      ...section,
                      custom: {
                        ...(section.custom || {}),
                        collapsible: !!checked,
                      },
                    })
                  }
                />
                <Label className="cursor-pointer text-xs text-muted-foreground">
                  Collapsible
                </Label>
              </div>
            </div>

            {/* Media & Styling */}
            <div className="rounded-lg border bg-muted/20 divide-y">
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Media &amp; Styling
                </p>
              </div>

              {/* Text color */}
              <div className="p-3">
                <CustomColorPicker
                  label="Section text color"
                  value={section.custom?.textColor || "#e5e7eb"}
                  onChange={(nextColor) =>
                    onUpdate({
                      ...section,
                      custom: {
                        ...(section.custom || {}),
                        textColor: nextColor,
                      },
                    })
                  }
                />
              </div>

              {/* Image */}
              <div className="p-3 space-y-3">
                <p className="text-xs font-medium">Image</p>
                <input
                  ref={sectionImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                  onChange={handleSectionImageUpload}
                  className="hidden"
                />

                {/* Preview */}
                {(section.custom?.imageAssetPath ||
                  section.custom?.imageUrl) && (
                  <div className="rounded-md border overflow-hidden">
                    <img
                      src={
                        section.custom?.imageAssetPath
                          ? getFormAssetPublicUrl(section.custom.imageAssetPath)
                          : section.custom?.imageUrl
                      }
                      alt="Section image preview"
                      className="max-h-44 w-full object-contain"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={isUploadingImage}
                    onClick={() => sectionImageInputRef.current?.click()}
                  >
                    {isUploadingImage ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="mr-2 h-3.5 w-3.5" />
                    )}
                    {section.custom?.imageAssetPath
                      ? "Replace uploaded"
                      : "Upload file"}
                  </Button>
                  {section.custom?.imageAssetPath && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer text-destructive"
                      onClick={handleRemoveSectionImage}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Remove
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Or paste an image URL
                  </Label>
                  <Input
                    value={section.custom?.imageUrl || ""}
                    onChange={(e) =>
                      onUpdate({
                        ...section,
                        custom: {
                          ...(section.custom || {}),
                          imageUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="https://example.com/image.jpg"
                    className="text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Uploaded files take priority over URL if both are set.
                  </p>
                </div>
              </div>

              {/* GIF */}
              <div className="p-3 space-y-1.5">
                <Label className="text-xs font-medium">GIF URL</Label>
                <Input
                  value={section.custom?.gifUrl || ""}
                  onChange={(e) =>
                    onUpdate({
                      ...section,
                      custom: {
                        ...(section.custom || {}),
                        gifUrl: e.target.value,
                      },
                    })
                  }
                  placeholder="https://media.giphy.com/media/…/giphy.gif"
                  className="text-sm"
                />
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="self-start text-muted-foreground hover:text-destructive cursor-pointer"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 overflow-hidden">
        {/* Fields */}
        {section.fields.map((field) => (
          <FieldEditor
            key={field.id}
            field={field}
            onUpdate={(updated) => updateField(field.id, updated)}
            onDelete={() => deleteField(field.id)}
            allFields={section.fields}
            openLinkModal={openLinkModal}
          />
        ))}

        {/* Add Field Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-dashed cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            {fieldTypes.map((fieldType) => {
              const Icon = fieldType.icon;
              return (
                <DropdownMenuItem
                  key={fieldType.type}
                  onClick={() => addField(fieldType.type)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {fieldType.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Form Builder Props
// ----------------------------------------------------------------------------

interface FormBuilderProps {
  initialForm?: RequestForm;
  onSave: (
    form: Omit<RequestForm, "id" | "shareableLink" | "createdAt" | "updatedAt">,
  ) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

// ----------------------------------------------------------------------------
// Form Builder Component
// ----------------------------------------------------------------------------

export function FormBuilder({
  initialForm,
  onSave,
  onCancel,
  isEditing = false,
}: FormBuilderProps) {
  const [title, setTitle] = useState(initialForm?.title || "");
  const [description, setDescription] = useState(
    initialForm?.description || "",
  );
  const [appearance, setAppearance] = useState(
    resolveFormAppearance(initialForm?.appearance || defaultFormAppearance),
  );

  const [sections, setSections] = useState<FormSection[]>(
    initialForm?.sections || [
      {
        id: uuidv4(),
        title: "Basic Information",
        fields: [],
      },
    ],
  );
  const [isActive, setIsActive] = useState(initialForm?.isActive ?? true);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const linkCallbackRef = useRef<((url: string) => void) | null>(null);
  const [linkInput, setLinkInput] = useState("");

  const openLinkModal = (cb: (url: string) => void) => {
    linkCallbackRef.current = cb;
    setLinkInput("");
    setLinkModalOpen(true);
  };

  const closeLinkModal = () => {
    setLinkModalOpen(false);
    linkCallbackRef.current = null;
    setLinkInput("");
  };

  const submitLinkModal = () => {
    const safe = sanitizeUrl(linkInput);
    if (!safe) {
      toast.error("Invalid or unsafe URL");
      return;
    }
    try {
      linkCallbackRef.current?.(safe);
    } finally {
      closeLinkModal();
    }
  };

  // Selection-based editing for form title/description
  const wrapSelectionInFormField = (
    field: "title" | "description",
    before: string,
    after = "",
  ) => {
    const id = field === "title" ? "form-title" : "form-description";
    const el = document.getElementById(id) as HTMLElement | null;
    if (
      el &&
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
    ) {
      const start = (el as any).selectionStart ?? 0;
      const end = (el as any).selectionEnd ?? start;
      const value = el.value || "";
      const result = applyToggleWrap(value, start, end, before, after);
      if (field === "title") setTitle(result.newValue);
      else setDescription(result.newValue);
      requestAnimationFrame(() => {
        try {
          el.focus();
          (el as any).setSelectionRange(result.newStart, result.newEnd);
        } catch {}
      });
    } else {
      const cur = field === "title" ? title || "" : description || "";
      const res = applyToggleWrap(cur, 0, 0, before, after);
      if (field === "title") setTitle(res.newValue);
      else setDescription(res.newValue);
    }
  };

  const addSection = () => {
    setSections([
      ...sections,
      {
        id: uuidv4(),
        title: "New Section",
        fields: [],
      },
    ]);
  };

  const updateSection = (sectionId: string, updatedSection: FormSection) => {
    setSections(sections.map((s) => (s.id === sectionId ? updatedSection : s)));
  };

  const deleteSection = (sectionId: string) => {
    if (sections.length > 1) {
      setSections(sections.filter((s) => s.id !== sectionId));
    } else {
      toast.error("Form must have at least one section");
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Form title is required");
      return;
    }

    const totalFields = sections.reduce((sum, s) => sum + s.fields.length, 0);
    if (totalFields === 0) {
      toast.error("Add at least one field to your form");
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      sections,
      appearance,
      isActive,
    });
  };

  const appearanceClasses = getFormAppearanceClasses(appearance);

  return (
    <div className="space-y-6 overflow-x-hidden p-4 lg:p-6">
      <Dialog
        open={linkModalOpen}
        onOpenChange={(open) => setLinkModalOpen(open)}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-lg sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert link</DialogTitle>
            <DialogDescription>
              Enter a safe URL (http(s) or mailto)
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <Input
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={closeLinkModal}
            >
              Cancel
            </Button>
            <Button className="cursor-pointer" onClick={submitLinkModal}>
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 cursor-pointer"
          >
            <span className="flex items-center gap-2 font-medium">
              <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
              Markdown support in forms
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
            <p className="text-muted-foreground">
              Markdown is rendered in form title, form description, section
              titles, section descriptions, field labels, and field
              descriptions.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border bg-background/70 p-3">
                <p className="mb-1 flex items-center gap-2 font-medium">
                  <Bold className="h-4 w-4 text-muted-foreground" />
                  Bold
                </p>
                <code className="block rounded bg-muted px-2 py-1 text-xs">
                  **important**
                </code>
              </div>
              <div className="rounded-md border bg-background/70 p-3">
                <p className="mb-1 flex items-center gap-2 font-medium">
                  <Italic className="h-4 w-4 text-muted-foreground" />
                  Italic
                </p>
                <code className="block rounded bg-muted px-2 py-1 text-xs">
                  *note*
                </code>
              </div>
              <div className="rounded-md border bg-background/70 p-3">
                <p className="mb-1 flex items-center gap-2 font-medium">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  Links
                </p>
                <code className="block rounded bg-muted px-2 py-1 text-xs">
                  [text](https://example.com)
                </code>
              </div>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Use plain text for anything that should stay compact inside
                badges or button labels.
              </li>
              <li>Tables and code blocks are not supported in these fields.</li>
              <li>
                Color only part of a text using <code>[text]{`{#ff4d4f}`}</code>
                , for example <code>[A]{`{#ff0000}`}</code>.
              </li>
              <li>
                Long titles or tags will wrap instead of overflowing off the
                card.
              </li>
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
      {/* Form Details */}
      <Card className={appearanceClasses.preset.shell}>
        <CardHeader>
          <CardTitle>Form Details</CardTitle>
          <CardDescription>
            Basic information about your request form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Identity */}
          <div className="space-y-2">
            <Label htmlFor="form-title">
              Form Title <span className="text-red-400">*</span>
            </Label>
            <Input
              id="form-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Contact Form, Commission Request"
              className="text-lg font-semibold border-none px-0 focus-visible:ring-0 bg-transparent"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="form-description">Description</Label>
            <Textarea
              id="form-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this form is for…"
              rows={3}
              className="resize-none border-none px-0 focus-visible:ring-0 bg-transparent w-full text-sm"
            />
          </div>

          <Separator />

          {/* Appearance */}
          <div className="space-y-4">
            <p className="text-sm font-medium leading-none">Appearance</p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Preset</Label>
                <Select
                  value={appearance.preset}
                  onValueChange={(value) =>
                    setAppearance((prev) => ({ ...prev, preset: value as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {formAppearancePresets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Accent</Label>
                <Select
                  value={appearance.accent}
                  onValueChange={(value) =>
                    setAppearance((prev) => ({ ...prev, accent: value as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Accent" />
                  </SelectTrigger>
                  <SelectContent>
                    {formAppearanceAccents.map((accent) => (
                      <SelectItem key={accent.value} value={accent.value}>
                        {accent.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Density</Label>
                <Select
                  value={appearance.density}
                  onValueChange={(value) =>
                    setAppearance((prev) => ({
                      ...prev,
                      density: value as any,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Density" />
                  </SelectTrigger>
                  <SelectContent>
                    {formAppearanceDensityOptions.map((density) => (
                      <SelectItem key={density.value} value={density.value}>
                        {density.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Text colors */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Text Colors</p>
              <p className="text-xs text-muted-foreground">
                Override the accent color for the form title and description.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                <CustomColorPicker
                  label="Title color"
                  value={appearance.titleColor || "#f8fafc"}
                  onChange={(value) =>
                    setAppearance((prev) => ({ ...prev, titleColor: value }))
                  }
                />
                <CustomColorPicker
                  label="Description color"
                  value={appearance.descriptionColor || "#94a3b8"}
                  onChange={(value) =>
                    setAppearance((prev) => ({
                      ...prev,
                      descriptionColor: value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Preview pill */}
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3",
                appearanceClasses.preset.shell,
              )}
            >
              <div className={appearanceClasses.heroIcon}>
                <Sparkles
                  className={cn("h-4 w-4", appearanceClasses.accent.text)}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {appearanceClasses.resolved.preset} ·{" "}
                  {appearanceClasses.resolved.accent} ·{" "}
                  {appearanceClasses.resolved.density}
                </p>
              </div>
              {appearance.titleColor && (
                <span
                  className="h-4 w-4 rounded-full border shadow-sm"
                  style={{ backgroundColor: appearance.titleColor }}
                  title={`Title: ${appearance.titleColor}`}
                />
              )}
              {appearance.descriptionColor && (
                <span
                  className="h-4 w-4 rounded-full border shadow-sm"
                  style={{ backgroundColor: appearance.descriptionColor }}
                  title={`Description: ${appearance.descriptionColor}`}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">Form Sections</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={addSection}
            className="cursor-pointer w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </div>

        {sections.map((section) => (
          <SectionEditor
            key={section.id}
            section={section}
            onUpdate={(updated) => updateSection(section.id, updated)}
            onDelete={() => deleteSection(section.id)}
            openLinkModal={openLinkModal}
          />
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} className="cursor-pointer">
          Cancel
        </Button>
        <Button onClick={handleSave} className="cursor-pointer">
          <Save className="mr-2 h-4 w-4" />
          {isEditing ? "Save Changes" : "Create Form"}
        </Button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Shareable Link Display Component
// ----------------------------------------------------------------------------

interface ShareableLinkProps {
  formId: string;
  shareableLink: string;
  isActive: boolean;
}

export function ShareableLinkDisplay({
  formId,
  shareableLink,
  isActive,
}: ShareableLinkProps) {
  const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/form/${shareableLink}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Card className={cn(!isActive && "opacity-60")}>
      <CardContent className="space-y-3 p-4 overflow-hidden">
        <div className="flex items-start gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground mb-1">Shareable Link</p>
            <code className="block rounded bg-muted px-2 py-1 text-sm break-all whitespace-normal">
              {fullUrl}
            </code>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyLink}
            className="cursor-pointer"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.open(fullUrl, "_blank")}
            disabled={!isActive}
            className="cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
        {!isActive && (
          <p className="mt-2 text-xs text-warning">
            This form is currently inactive and not accepting responses
          </p>
        )}
      </CardContent>
    </Card>
  );
}
