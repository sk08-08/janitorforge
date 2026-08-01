// ============================================================================
// JanitorForge - Form Builder Component
// Visual form designer for creating custom forms
// ============================================================================

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import type { IGif } from "@giphy/js-types";
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
  Upload,
  Italic,
  Link as LinkIcon,
  ArrowUp,
  Search,
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
import { MarkdownField } from "@/components/ui/markdown-field";
import Image from "next/image";
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
  removeFormBannerAction,
  updateFormAction,
  uploadFormBannerAction,
  uploadFormSectionImageAction,
} from "@/app/actions/forms";
import {
  getFormAssetPublicUrl,
  getFormBannerPublicUrl,
} from "@/lib/form-assets";
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

const giphyFetch = new GiphyFetch(
  process.env.NEXT_PUBLIC_GIPHY_API_KEY || "7o0fqYvUWtgy7wRLtEVpQOhsYsVX0J8y",
);

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
  onDragStart?: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
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
  onDragStart,
  onDragEnd,
  isDragging = false,
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
    <Card
      className={cn(
        "border-border/50 overflow-hidden transition-opacity",
        isDragging && "opacity-60",
      )}
    >
      <CardContent className="p-4 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* Drag handle placeholder */}
          <div
            className="cursor-grab self-start text-muted-foreground sm:mt-2"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            title="Drag to reorder field"
          >
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

            <div className="space-y-1.5">
              <Label className="text-xs">Text alignment</Label>
              <Select
                value={field.textAlignment || "left"}
                onValueChange={(value) =>
                  onUpdate({
                    ...field,
                    textAlignment: value as "left" | "center" | "right",
                  })
                }
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Applies to field label and description in the public form.
              </p>
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
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart?: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
  openLinkModal?: (cb: (url: string) => void) => void;
}

function SectionEditor({
  section,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  isDragging = false,
  disableMoveUp = false,
  disableMoveDown = false,
  openLinkModal,
}: SectionEditorProps) {
  const descRef = useRef<any>(null);
  const sectionImageInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [gifDialogOpen, setGifDialogOpen] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [debouncedGifSearch, setDebouncedGifSearch] = useState("");
  const [gifItems, setGifItems] = useState<IGif[]>([]);
  const [gifOffset, setGifOffset] = useState(0);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifLoadingMore, setGifLoadingMore] = useState(false);
  const [gifHasMore, setGifHasMore] = useState(true);
  const [gifError, setGifError] = useState("");
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [fieldDropIndex, setFieldDropIndex] = useState<number | null>(null);
  const gifRequestSeqRef = useRef(0);
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

  const moveFieldToIndex = (fieldId: string, dropIndex: number) => {
    const sourceIndex = section.fields.findIndex((f) => f.id === fieldId);
    if (sourceIndex < 0 || dropIndex < 0 || dropIndex > section.fields.length) {
      return;
    }

    let targetIndex = dropIndex;
    const next = [...section.fields];
    const [moved] = next.splice(sourceIndex, 1);
    if (sourceIndex < targetIndex) {
      targetIndex -= 1;
    }
    if (targetIndex === sourceIndex) {
      return;
    }
    next.splice(targetIndex, 0, moved);
    onUpdate({
      ...section,
      fields: next,
    });
  };

  const handleFieldDragStart =
    (fieldId: string) => (event: React.DragEvent<HTMLElement>) => {
      setDraggingFieldId(fieldId);
      setFieldDropIndex(section.fields.findIndex((f) => f.id === fieldId));
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", fieldId);
    };

  const handleFieldDragOver = (
    event: React.DragEvent<HTMLElement>,
    dropIndex: number,
  ) => {
    if (!draggingFieldId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (fieldDropIndex !== dropIndex) {
      setFieldDropIndex(dropIndex);
    }
  };

  const handleFieldDrop = (
    event: React.DragEvent<HTMLElement>,
    dropIndex: number,
  ) => {
    event.preventDefault();
    if (!draggingFieldId) return;
    moveFieldToIndex(draggingFieldId, dropIndex);
    setDraggingFieldId(null);
    setFieldDropIndex(null);
  };

  const handleFieldDragEnd = () => {
    setDraggingFieldId(null);
    setFieldDropIndex(null);
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

  const loadGifs = useCallback(
    async ({
      reset,
      query,
      offset,
    }: {
      reset: boolean;
      query: string;
      offset: number;
    }) => {
      const pageSize = 24;
      const requestSeq = ++gifRequestSeqRef.current;

      if (reset) {
        setGifLoading(true);
        setGifError("");
      } else {
        setGifLoadingMore(true);
      }

      try {
        const res = query
          ? await giphyFetch.search(query, {
              offset,
              limit: pageSize,
              rating: "r",
              lang: "es, en",
            })
          : await giphyFetch.trending({
              offset,
              limit: pageSize,
              rating: "r",
            });

        if (requestSeq !== gifRequestSeqRef.current) return;

        const items = Array.isArray(res.data) ? (res.data as IGif[]) : [];
        setGifItems((prev) => {
          if (reset) return items;
          const seen = new Set(prev.map((g) => g.id));
          const merged = [...prev];
          for (const gif of items) {
            if (!seen.has(gif.id)) merged.push(gif);
          }
          return merged;
        });

        const advanced = offset + items.length;
        setGifOffset(advanced);
        setGifHasMore(items.length === pageSize);
      } catch (error) {
        if (requestSeq !== gifRequestSeqRef.current) return;
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load GIFs. Check GIPHY API key and network.";
        setGifError(message || "Failed to load GIFs");
        if (reset) setGifItems([]);
      } finally {
        if (requestSeq === gifRequestSeqRef.current) {
          if (reset) setGifLoading(false);
          else setGifLoadingMore(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!gifDialogOpen) return;
    const t = setTimeout(() => {
      setDebouncedGifSearch(gifSearch.trim());
    }, 500);
    return () => clearTimeout(t);
  }, [gifDialogOpen, gifSearch]);

  useEffect(() => {
    if (!gifDialogOpen) return;
    setGifOffset(0);
    setGifHasMore(true);
    void loadGifs({
      reset: true,
      query: debouncedGifSearch,
      offset: 0,
    });
  }, [debouncedGifSearch, gifDialogOpen, loadGifs]);

  useEffect(() => {
    if (!gifDialogOpen) {
      gifRequestSeqRef.current += 1;
    }
  }, [gifDialogOpen]);

  const handleGifSelect = useCallback(
    (gif: IGif, e: React.SyntheticEvent<HTMLElement, Event>) => {
      e.preventDefault();
      const gifUrl = gif.images.original.url;
      onUpdate({
        ...section,
        custom: {
          ...(section.custom || {}),
          gifUrl,
        },
      });
      setGifDialogOpen(false);
      toast.success("GIF selected");
    },
    [onUpdate, section],
  );

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
    <Card className={cn("transition-opacity", isDragging && "opacity-60")}>
      <CardHeader className="relative pb-3 overflow-hidden">
        <div className="min-w-0 space-y-2">
          <div className="sm:pr-44">
            <Input
              id={`section-title-${section.id}`}
              value={section.title || ""}
              onChange={(e) => onUpdate({ ...section, title: e.target.value })}
              placeholder="Section Title"
              className="w-full min-w-0 text-lg font-semibold border-none px-0 focus-visible:ring-0 bg-transparent"
            />
          </div>
          <div className="sm:pr-44">
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

          {/* Styling & Media */}
          <div className="rounded-lg border bg-muted/20 divide-y">
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Styling &amp; Media
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
              {(section.custom?.imageAssetPath || section.custom?.imageUrl) && (
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
            <div className="p-3 space-y-2">
              <Label className="text-xs font-medium">GIF</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer font-medium"
                  onClick={() => setGifDialogOpen(true)}
                >
                  <Sparkles className="mr-2 h-3.5 w-3.5 text-primary animate-pulse" />
                  <span>
                    {section.custom?.gifUrl ? "Replace GIF" : "Pick GIF"}
                  </span>
                  <span className="mx-1 text-muted-foreground">·</span>
                  <span className="text-muted-foreground text-xs">
                    Powered by{" "}
                    <span className="font-black tracking-wider bg-gradient-to-r from-[#00FF99] via-[#00CCFF] via-[#9933FF] to-[#FF3366] bg-clip-text text-transparent">
                      GIPHY
                    </span>
                  </span>
                </Button>
                {section.custom?.gifUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer text-destructive"
                    onClick={() =>
                      onUpdate({
                        ...section,
                        custom: {
                          ...(section.custom || {}),
                          gifUrl: "",
                        },
                      })
                    }
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>
              {section.custom?.gifUrl && (
                <div className="rounded-md border overflow-hidden">
                  <img
                    src={section.custom.gifUrl}
                    alt="Selected gif"
                    className="max-h-44 w-full object-contain"
                  />
                </div>
              )}

              <Dialog open={gifDialogOpen} onOpenChange={setGifDialogOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Select a GIF</DialogTitle>
                    <DialogDescription>
                      Trending GIFs with search.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 transition-colors duration-200 peer-focus:text-[#ea00ff] pointer-events-none" />

                    <Input
                      value={gifSearch}
                      onChange={(e) => setGifSearch(e.target.value)}
                      placeholder="Search GIPHY"
                      className="peer w-full pl-10 pr-12 bg-[#121212] border-neutral-800 text-white placeholder:text-neutral-500 transition-all duration-200 focus-visible:ring-1 focus-visible:ring-[#ea00ff] focus-visible:border-[#00CCFF] focus-visible:drop-shadow-[0_0_6px_rgba(0,204,255,0.15)]"
                    />

                    {/* Sello de Marca Isotipo de GIPHY a la derecha */}
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-4 flex-col gap-0.5 pointer-events-none opacity-80 peer-focus:opacity-100 transition-opacity"
                      aria-hidden="true"
                    >
                      <div className="h-1 w-full bg-[#00FF99]" />
                      <div className="h-1 w-full bg-[#00CCFF]" />
                      <div className="h-1 w-full bg-[#9933FF]" />
                      <div className="h-1 w-full bg-[#FF3366]" />
                    </div>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    Powered by{" "}
                    <span className="font-black tracking-wider hover:animate-pulse bg-gradient-to-r from-[#00FF99] via-[#00CCFF] via-[#9933FF] to-[#FF3366] bg-clip-text text-transparent">
                      <a
                        href="https://giphy.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        GIPHY
                      </a>
                    </span>
                  </span>

                  <div className="min-h-0 flex-1 overflow-y-auto rounded-md border p-2">
                    {gifLoading ? (
                      <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading GIFs...
                      </div>
                    ) : gifError ? (
                      <div className="space-y-2 py-8 text-center">
                        <p className="text-sm text-destructive">{gifError}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() =>
                            void loadGifs({
                              reset: true,
                              query: debouncedGifSearch,
                              offset: 0,
                            })
                          }
                        >
                          Retry
                        </Button>
                      </div>
                    ) : gifItems.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No GIFs found.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {gifItems.map((gif) => {
                            const preview =
                              gif.images.fixed_width_downsampled?.url ||
                              gif.images.fixed_width?.url ||
                              gif.images.original?.url;
                            if (!preview) return null;
                            return (
                              <button
                                key={gif.id}
                                type="button"
                                className="overflow-hidden rounded-md border border-border/60 transition hover:scale-[1.01] hover:border-primary/60"
                                onClick={(e) => handleGifSelect(gif, e)}
                              >
                                <img
                                  src={preview}
                                  alt={gif.title || "GIF"}
                                  className="h-32 w-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                            );
                          })}
                        </div>
                        {gifHasMore && (
                          <div className="pt-3 text-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              disabled={gifLoadingMore}
                              onClick={() =>
                                void loadGifs({
                                  reset: false,
                                  query: debouncedGifSearch,
                                  offset: gifOffset,
                                })
                              }
                            >
                              {gifLoadingMore ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                "Load more"
                              )}
                            </Button>
                            <Image
                              src="/giphy-logo.png"
                              alt="Giphy Logo"
                              width={84}
                              height={84}
                              loading="lazy"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        <div className="absolute right-4 top-3 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground cursor-pointer"
            title="Move section up"
            onClick={onMoveUp}
            disabled={disableMoveUp}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground cursor-pointer"
            title="Move section down"
            onClick={onMoveDown}
            disabled={disableMoveDown}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground cursor-grab"
            title="Reorder section"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive cursor-pointer"
            onClick={onDelete}
            title="Delete section"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 overflow-hidden">
        {/* Fields */}
        {section.fields.map((field, index) => (
          <React.Fragment key={field.id}>
            <div
              className={cn(
                "h-2 rounded-md border border-transparent transition-colors",
                draggingFieldId && fieldDropIndex === index
                  ? "border-primary/60 bg-primary/20"
                  : "bg-transparent",
              )}
              onDragOver={(event) => handleFieldDragOver(event, index)}
              onDrop={(event) => handleFieldDrop(event, index)}
            />
            <FieldEditor
              field={field}
              onUpdate={(updated) => updateField(field.id, updated)}
              onDelete={() => deleteField(field.id)}
              onDragStart={handleFieldDragStart(field.id)}
              onDragEnd={handleFieldDragEnd}
              isDragging={draggingFieldId === field.id}
              allFields={section.fields}
              openLinkModal={openLinkModal}
            />
          </React.Fragment>
        ))}
        <div
          className={cn(
            "h-2 rounded-md border border-transparent transition-colors",
            draggingFieldId && fieldDropIndex === section.fields.length
              ? "border-primary/60 bg-primary/20"
              : "bg-transparent",
          )}
          onDragOver={(event) =>
            handleFieldDragOver(event, section.fields.length)
          }
          onDrop={(event) => handleFieldDrop(event, section.fields.length)}
        />

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
  const [bannerAssetPath, setBannerAssetPath] = useState(
    initialForm?.bannerAssetPath || "",
  );
  const [bannerUrl, setBannerUrl] = useState(initialForm?.bannerUrl || "");
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const formBannerInputRef = useRef<HTMLInputElement | null>(null);
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
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(
    null,
  );
  const [sectionDropIndex, setSectionDropIndex] = useState<number | null>(null);

  useEffect(() => {
    setTitle(initialForm?.title || "");
    setDescription(initialForm?.description || "");
    setBannerAssetPath(initialForm?.bannerAssetPath || "");
    setBannerUrl(initialForm?.bannerUrl || "");
    setAppearance(
      resolveFormAppearance(initialForm?.appearance || defaultFormAppearance),
    );
    setSections(
      initialForm?.sections || [
        {
          id: uuidv4(),
          title: "Basic Information",
          fields: [],
        },
      ],
    );
    setIsActive(initialForm?.isActive ?? true);
  }, [initialForm]);

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

  const moveSection = (sectionId: string, direction: "up" | "down") => {
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === sectionId);
      if (index === -1) return prev;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const moveSectionToIndex = (sectionId: string, dropIndex: number) => {
    setSections((prev) => {
      const sourceIndex = prev.findIndex((s) => s.id === sectionId);
      if (sourceIndex < 0 || dropIndex < 0 || dropIndex > prev.length) {
        return prev;
      }

      let targetIndex = dropIndex;
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      if (sourceIndex < targetIndex) {
        targetIndex -= 1;
      }
      if (targetIndex === sourceIndex) {
        return prev;
      }
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleSectionDragStart =
    (sectionId: string) => (event: React.DragEvent<HTMLElement>) => {
      setDraggingSectionId(sectionId);
      setSectionDropIndex(sections.findIndex((s) => s.id === sectionId));
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", sectionId);
    };

  const handleSectionDragOver = (
    event: React.DragEvent<HTMLElement>,
    dropIndex: number,
  ) => {
    if (!draggingSectionId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (sectionDropIndex !== dropIndex) {
      setSectionDropIndex(dropIndex);
    }
  };

  const handleSectionDrop = (
    event: React.DragEvent<HTMLElement>,
    dropIndex: number,
  ) => {
    event.preventDefault();
    if (!draggingSectionId) return;
    moveSectionToIndex(draggingSectionId, dropIndex);
    setDraggingSectionId(null);
    setSectionDropIndex(null);
  };

  const handleSectionDragEnd = () => {
    setDraggingSectionId(null);
    setSectionDropIndex(null);
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
      bannerAssetPath: bannerAssetPath || undefined,
      bannerUrl: bannerUrl || undefined,
      sections,
      appearance,
      isActive,
    });
  };

  const handleFormBannerUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (bannerAssetPath) {
        formData.append("existingPath", bannerAssetPath);
      }

      const result = await uploadFormBannerAction(formData);
      if (!result.success || !result.path) {
        toast.error(result.error || "Failed to upload banner");
        return;
      }

      setBannerAssetPath(result.path);
      if (result.publicUrl) {
        setBannerUrl(result.publicUrl);
      }

      if (isEditing && initialForm?.id) {
        const persist = await updateFormAction(initialForm.id, {
          bannerAssetPath: result.path,
          bannerUrl: result.publicUrl || bannerUrl,
        });
        if (!persist.success) {
          toast.error(persist.error || "Failed to persist banner");
          return;
        }
      }

      toast.success("Form banner uploaded");
    } finally {
      setIsUploadingBanner(false);
      if (formBannerInputRef.current) {
        formBannerInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFormBanner = async () => {
    if (!bannerAssetPath) {
      setBannerUrl("");
      return;
    }

    const result = await removeFormBannerAction(bannerAssetPath);
    if (!result.success) {
      toast.error(result.error || "Failed to remove banner");
      return;
    }

    if (isEditing && initialForm?.id) {
      const persist = await updateFormAction(initialForm.id, {
        bannerAssetPath: "",
        bannerUrl: "",
      });
      if (!persist.success) {
        toast.error(persist.error || "Failed to persist banner removal");
        return;
      }
    }

    setBannerAssetPath("");
    setBannerUrl("");
    toast.success("Form banner removed");
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
            <p className="text-muted-foreground">
              Use the toolbar or shortcuts to format quickly:{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                Ctrl/Cmd+B
              </code>
              ,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                Ctrl/Cmd+I
              </code>
              ,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                Ctrl/Cmd+K
              </code>
              , and{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                Ctrl/Cmd+Z
              </code>
              .
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
              <li>
                Switch between Edit and Preview to confirm final formatting.
              </li>
              <li>
                Color only part of a text using <code>[text]{`{#ff4d4f}`}</code>
                , for example <code>[A]{`{#ff0000}`}</code>.
              </li>
              <li>
                Long titles and descriptions wrap to avoid layout overflow.
              </li>
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
      {/* Form Details */}
      <Card
        className={appearanceClasses.preset.shell}
        style={appearanceClasses.surfaceStyle}
      >
        <CardHeader>
          <CardTitle>Form Details</CardTitle>
          <CardDescription>
            Basic information about your request form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Form Banner</Label>
            <input
              ref={formBannerInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
              className="hidden"
              onChange={handleFormBannerUpload}
            />

            {(bannerAssetPath || bannerUrl.trim()) && (
              <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20">
                <img
                  src={
                    bannerAssetPath
                      ? getFormBannerPublicUrl(bannerAssetPath)
                      : bannerUrl.trim()
                  }
                  alt="Form banner preview"
                  className="h-36 w-full object-cover sm:h-44"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={isUploadingBanner}
                onClick={() => formBannerInputRef.current?.click()}
              >
                {isUploadingBanner ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-3.5 w-3.5" />
                )}
                {bannerAssetPath ? "Replace banner" : "Upload banner"}
              </Button>

              {(bannerAssetPath || bannerUrl.trim()) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-destructive"
                  onClick={handleRemoveFormBanner}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Or paste an external banner URL
              </Label>
              <Input
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://example.com/form-banner.jpg"
              />
              <p className="text-[11px] text-muted-foreground">
                Uploaded banner takes priority if both are set.
              </p>
            </div>
          </div>

          <Separator />

          {/* Identity */}
          <div className="space-y-2">
            <Label htmlFor="form-title">
              Form Title <span className="text-red-400">*</span>
            </Label>
            <MarkdownField
              id="form-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Contact Form, Commission Request"
              rows={2}
              minEditorHeightRem={8}
              previewMaxHeightRem={18}
              className="text-lg font-semibold"
            />
            <p className="text-[11px] text-muted-foreground">
              Tip: use the toolbar to format your title with bold, italic,
              links, and lists.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="form-description">Description</Label>
            <MarkdownField
              id="form-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this form is for…"
              rows={3}
              className="min-h-[8rem] border-none px-0 bg-transparent w-full text-sm"
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
              style={{
                ...appearanceClasses.surfaceStyle,
                ...appearanceClasses.sectionCardStyle,
              }}
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

        {sections.map((section, index) => (
          <React.Fragment key={section.id}>
            <div
              className={cn(
                "h-2 rounded-md border border-transparent transition-colors",
                draggingSectionId && sectionDropIndex === index
                  ? "border-primary/60 bg-primary/20"
                  : "bg-transparent",
              )}
              onDragOver={(event) => handleSectionDragOver(event, index)}
              onDrop={(event) => handleSectionDrop(event, index)}
            />
            <SectionEditor
              section={section}
              onUpdate={(updated) => updateSection(section.id, updated)}
              onDelete={() => deleteSection(section.id)}
              onMoveUp={() => moveSection(section.id, "up")}
              onMoveDown={() => moveSection(section.id, "down")}
              onDragStart={handleSectionDragStart(section.id)}
              onDragEnd={handleSectionDragEnd}
              isDragging={draggingSectionId === section.id}
              disableMoveUp={index === 0}
              disableMoveDown={index === sections.length - 1}
              openLinkModal={openLinkModal}
            />
          </React.Fragment>
        ))}
        <div
          className={cn(
            "h-2 rounded-md border border-transparent transition-colors",
            draggingSectionId && sectionDropIndex === sections.length
              ? "border-primary/60 bg-primary/20"
              : "bg-transparent",
          )}
          onDragOver={(event) => handleSectionDragOver(event, sections.length)}
          onDrop={(event) => handleSectionDrop(event, sections.length)}
        />
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
