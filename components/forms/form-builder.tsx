// ============================================================================
// JanitorForge - Form Builder Component
// Visual form designer for creating custom request forms
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

// Lightweight markdown renderer for live preview in the builder
function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdownPreview(md?: string | null) {
  if (!md) return "";
  let out = escapeHtml(String(md));
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, txt, href) => {
    const safe = String(href).trim();
    if (/^\s*(javascript:|data:)/i.test(safe)) return escapeHtml(txt);
    return `<a href=\"${escapeHtml(safe)}\" target=\"_blank\" rel=\"noopener noreferrer\">${escapeHtml(txt)}</a>`;
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
  // Force inline styles on list containers to avoid global resets hiding markers
  result = result.replace(
    /<ul>/g,
    '<ul style="list-style-type: disc; margin-left:1rem; padding-left:1.25rem">',
  );
  result = result.replace(
    /<ol>/g,
    '<ol style="list-style-type: decimal; margin-left:1rem; padding-left:1.25rem">',
  );
  return result;
}

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
            dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(value) }}
          />
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
  openLinkModal?: (cb: (url: string) => void) => void;
}

function FieldEditor({ field, onUpdate, onDelete }: FieldEditorProps) {
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
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag handle placeholder */}
          <div className="mt-2 cursor-grab text-muted-foreground">
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="flex-1 space-y-3">
            {/* Field header */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                <Icon className="h-4 w-4" />
              </div>
              <Badge variant="outline" className="text-xs">
                {fieldConfig?.label || field.type}
              </Badge>
              {field.required && (
                <Badge variant="secondary" className="text-xs">
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
                <div className="flex gap-2">
                  <Input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    placeholder="Add an option..."
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addOption())
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addOption}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {field.options && field.options.length > 0 && (
                  <div className="space-y-2">
                    {field.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          className="flex-1"
                        />
                        <div className="flex gap-1">
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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div>
              <Input
                id={`section-title-${section.id}`}
                value={section.title || ""}
                onChange={(e) =>
                  onUpdate({ ...section, title: e.target.value })
                }
                placeholder="Section Title"
                className="text-lg font-semibold border-none px-0 focus-visible:ring-0 bg-transparent"
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
            {/* Section customization */}
            <div className="flex items-center gap-3 mt-2">
              <Label className="text-xs">Header alignment</Label>
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
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
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
                <Label className="cursor-pointer">Collapsible</Label>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive cursor-pointer"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Fields */}
        {section.fields.map((field) => (
          <FieldEditor
            key={field.id}
            field={field}
            onUpdate={(updated) => updateField(field.id, updated)}
            onDelete={() => deleteField(field.id)}
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
    <div className="space-y-6 p-4 lg:p-6">
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
      {/* Form Details */}
      <Card className={appearanceClasses.preset.shell}>
        <CardHeader>
          <CardTitle>Form Details</CardTitle>
          <CardDescription>
            Basic information about your request form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-title">Form Title *</Label>
            <div>
              <Input
                id="form-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Bot Request Form"
                className="text-lg font-semibold border-none px-0 focus-visible:ring-0 bg-transparent"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="form-description">Description</Label>
            <div>
              <Textarea
                id="form-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this form is for..."
                rows={4}
                className="text-lg font-semibold border-none px-0 focus-visible:ring-0 bg-transparent w-full"
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Preset</Label>
              <Select
                value={appearance.preset}
                onValueChange={(value) =>
                  setAppearance((prev) => ({ ...prev, preset: value as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a preset" />
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

            <div className="space-y-2">
              <Label>Accent</Label>
              <Select
                value={appearance.accent}
                onValueChange={(value) =>
                  setAppearance((prev) => ({ ...prev, accent: value as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an accent" />
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

            <div className="space-y-2">
              <Label>Density</Label>
              <Select
                value={appearance.density}
                onValueChange={(value) =>
                  setAppearance((prev) => ({ ...prev, density: value as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose density" />
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

          <div
            className={cn(
              "rounded-lg border p-4",
              appearanceClasses.preset.shell,
            )}
          >
            <div className="flex items-center gap-3">
              <div className={appearanceClasses.heroIcon}>
                <Sparkles
                  className={cn("h-5 w-5", appearanceClasses.accent.text)}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {appearanceClasses.resolved.preset} preset
                </p>
                <p className="text-xs text-muted-foreground">
                  {appearanceClasses.resolved.accent} accent ·{" "}
                  {appearanceClasses.resolved.density} density
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Form Sections</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={addSection}
            className="cursor-pointer"
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
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Shareable Link</p>
            <code className="text-sm truncate block bg-muted px-2 py-1 rounded">
              {fullUrl}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
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
