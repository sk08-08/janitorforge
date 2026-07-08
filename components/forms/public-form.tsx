"use client";

import React, { useState, useEffect } from "react";
import { submitPublicFormRequest } from "@/app/actions/safety";
import { MarkdownRenderer } from "./markdown-renderer";

// Lightweight inline markdown for labels (single-line, no block elements)
function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdown(md?: string | null) {
  if (!md) return "";
  const text = String(md);
  // Escape HTML first
  let out = escapeHtml(text);
  // Helper: escape attribute values
  const escapeAttr = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  // Helper: allow only safe URL schemes (http, https, mailto, relative)
  const sanitizeUrl = (u: string) => {
    try {
      const url = String(u).trim();
      if (/^\s*(javascript:|data:)/i.test(url)) return "";
      if (
        /^(https?:)?\/\//i.test(url) ||
        /^mailto:/i.test(url) ||
        /^\//.test(url)
      )
        return url;
      return "";
    } catch {
      return "";
    }
  };

  // Links [text](url) - sanitize URL and escape attributes/text
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, txt, href) => {
    const safe = sanitizeUrl(href);
    if (!safe) return escapeHtml(txt);
    return `<a href="${escapeAttr(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
      txt,
    )}</a>`;
  });
  // Bold **text** or __text__
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__(.+?)__/g, "<strong>$1</strong>");
  // Italic *text* or _text_
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  out = out.replace(/_(.+?)_/g, "<em>$1</em>");
  // Simple unordered lists: lines starting with - or *
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

function renderMarkdownInline(md?: string | null) {
  if (!md) return "";
  const text = String(md);
  let out = escapeHtml(text);
  const escapeAttr = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const sanitizeUrl = (u: string) => {
    try {
      const url = String(u).trim();
      if (/^\s*(javascript:|data:)/i.test(url)) return "";
      if (
        /^(https?:)?\/\//i.test(url) ||
        /^mailto:/i.test(url) ||
        /^\//.test(url)
      )
        return url;
      return "";
    } catch {
      return "";
    }
  };
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, txt, href) => {
    const safe = sanitizeUrl(href);
    if (!safe) return escapeHtml(txt);
    return `<a href="${escapeAttr(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
      txt,
    )}</a>`;
  });
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__(.+?)__/g, "<strong>$1</strong>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  out = out.replace(/_(.+?)_/g, "<em>$1</em>");
  return out;
}

import {
  Send,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import type { FormAppearance, FormField, FormSection } from "@/lib/types";
import {
  getFormAppearanceClasses,
  getFormFieldFocusClasses,
} from "@/lib/form-appearance";
import { FeedbackActions } from "@/components/feedback/feedback-actions";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PublicFormProps {
  form: {
    id: string;
    title: string;
    description?: string | null;
    isActive: boolean;
    sections: FormSection[];
    appearance?: FormAppearance | null;
    userId?: string | null;
  };
  feedbackContext?: {
    sourcePage?: string;
    sourceLabel?: string;
    sourcePath?: string;
    relatedId?: string;
    metadata?: Record<string, unknown>;
  };
}

function FieldRenderer({ field, value, onChange, error, appearance }: any) {
  const resolvedAppearance = appearance ?? getFormAppearanceClasses(null);
  const fieldFocus = getFormFieldFocusClasses(
    resolvedAppearance.resolved.accent,
  );
  const [tagInput, setTagInput] = useState("");
  const [otherActive, setOtherActive] = useState(false);
  const [otherValue, setOtherValue] = useState("");

  useEffect(() => {
    const current = typeof value === "string" ? (value as string) : "";
    const isOther = !!(
      (field as any).allowOther &&
      current &&
      (field as any).options &&
      !((field as any).options as string[]).includes(current)
    );
    if (isOther) {
      setOtherActive(true);
      setOtherValue(current);
    }
  }, [value, field]);

  const addTag = () => {
    if (tagInput.trim() && Array.isArray(value)) {
      onChange([...value, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (Array.isArray(value)) {
      onChange(value.filter((t: string) => t !== tagToRemove));
    }
  };

  switch (field.type) {
    case "text":
      return (
        <Input
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={cn(error && "border-destructive", fieldFocus)}
        />
      );
    case "textarea":
      return (
        <Textarea
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={cn(error && "border-destructive", fieldFocus)}
        />
      );
    case "select": {
      // determine if current value is a freeform 'other' value
      const current = typeof value === "string" ? (value as string) : "";
      const isOther = !!(
        field.allowOther &&
        current &&
        field.options &&
        !field.options.includes(current)
      );
      if (isOther && !otherActive) {
        setOtherActive(true);
        setOtherValue(current);
      }

      return (
        <>
          <Select
            value={typeof value === "string" ? (value as string) : ""}
            onValueChange={(v) => {
              if (v === "__other__") {
                setOtherActive(true);
                setOtherValue("");
                onChange("");
              } else {
                onChange(v);
              }
            }}
          >
            <SelectTrigger
              className={cn(error && "border-destructive", fieldFocus)}
            >
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
              {field.allowOther && (
                <SelectItem key="__other__" value="__other__">
                  Other...
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {field.allowOther && otherActive && (
            <div className="mt-2">
              <Input
                placeholder="Please specify"
                value={otherValue}
                onChange={(e) => {
                  setOtherValue(e.target.value);
                  onChange(e.target.value);
                }}
              />
            </div>
          )}
        </>
      );
    }
    case "radio": {
      const current = typeof value === "string" ? (value as string) : "";
      const isOther = !!(
        field.allowOther &&
        current &&
        field.options &&
        !field.options.includes(current)
      );
      if (isOther && !otherActive) {
        setOtherActive(true);
        setOtherValue(current);
      }
      return (
        <div className="min-w-0">
          <RadioGroup
            value={
              otherActive
                ? "__other__"
                : typeof value === "string"
                  ? (value as string)
                  : ""
            }
            onValueChange={(v) => {
              if (v === "__other__") {
                setOtherActive(true);
                setOtherValue("");
                onChange("");
              } else {
                setOtherActive(false);
                onChange(v);
              }
            }}
          >
            {field.options?.map((option: string) => (
              <div key={option} className="flex items-start gap-2">
                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                <Label
                  htmlFor={`${field.id}-${option}`}
                  className="cursor-pointer wrap-break-word"
                >
                  {option}
                </Label>
              </div>
            ))}
            {field.allowOther && (
              <div className="flex items-start gap-2">
                <RadioGroupItem value="__other__" id={`${field.id}-other`} />
                <Label
                  htmlFor={`${field.id}-other`}
                  className="cursor-pointer wrap-break-word"
                >
                  Other
                </Label>
              </div>
            )}
          </RadioGroup>
          {field.allowOther && otherActive && (
            <div className="mt-2">
              <Input
                placeholder="Please specify"
                value={otherValue}
                onChange={(e) => {
                  setOtherValue(e.target.value);
                  onChange(e.target.value);
                }}
              />
            </div>
          )}
        </div>
      );
    }
    case "checkbox":
      return (
        <div className="space-y-2">
          {field.options?.map((option: string) => (
            <div key={option} className="flex items-start gap-2">
              <Checkbox
                id={`${field.id}-${option}`}
                checked={Array.isArray(value) && value.includes(option)}
                onCheckedChange={(checked) => {
                  const currentValues = Array.isArray(value) ? value : [];
                  if (checked) {
                    onChange([...currentValues, option]);
                  } else {
                    onChange(currentValues.filter((v: string) => v !== option));
                  }
                }}
              />
              <Label
                htmlFor={`${field.id}-${option}`}
                className="cursor-pointer wrap-break-word"
              >
                {option}
              </Label>
            </div>
          ))}
        </div>
      );
    case "rating-type":
      return (
        <RadioGroup
          value={value as string}
          onValueChange={onChange}
          className="flex flex-wrap gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="SFW" id={`${field.id}-sfw`} />
            <Label
              htmlFor={`${field.id}-sfw`}
              className="cursor-pointer wrap-break-word"
            >
              <Badge variant="secondary">SFW</Badge>
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="NSFW" id={`${field.id}-nsfw`} />
            <Label
              htmlFor={`${field.id}-nsfw`}
              className="cursor-pointer wrap-break-word"
            >
              <Badge variant="destructive">NSFW</Badge>
            </Label>
          </div>
        </RadioGroup>
      );
    case "tags":
      return (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder={field.placeholder}
              className="min-w-0 flex-1"
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), addTag())
              }
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addTag}
              className="w-full cursor-pointer sm:w-auto"
            >
              Add
            </Button>
          </div>
          {Array.isArray(value) && value.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {value.map((tag: string) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="max-w-full cursor-pointer whitespace-normal wrap-break-word hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

function SectionRenderer({
  section,
  values,
  errors,
  onChange,
  appearance,
}: any) {
  const alignClass =
    section?.custom?.headerAlignment === "center"
      ? "text-center"
      : section?.custom?.headerAlignment === "right"
        ? "text-right"
        : "text-left";
  const hasRequiredFields = section.fields.some((f: any) => f.required);

  if (section?.custom?.collapsible) {
    return (
      <Card className={appearance.sectionCard}>
        <details className="group">
          <summary className={`cursor-pointer p-4 ${alignClass}`}>
            <span
              className="rendered-markdown"
              dangerouslySetInnerHTML={{
                __html:
                  renderMarkdownInline(section.title) +
                  (hasRequiredFields
                    ? ' <span class="text-destructive">*</span>'
                    : ""),
              }}
            />
            {section.description && (
              <div
                className="mt-1 text-xs text-muted-foreground rendered-markdown wrap-break-word"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(section.description),
                }}
              />
            )}
          </summary>
          <CardContent className={appearance.density.sectionContent}>
            {section.fields.map((field: any) => (
              <div key={field.id} className={appearance.density.fieldGroup}>
                <Label className="flex items-center gap-1 flex-nowrap">
                  <span
                    className="inline min-w-0 whitespace-normal wrap-break-word rendered-markdown"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownInline(field.label),
                    }}
                  />
                </Label>
                {field.description && (
                  <div
                    className="text-left text-xs text-muted-foreground rendered-markdown wrap-break-word"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(field.description),
                    }}
                  />
                )}
                <FieldRenderer
                  field={field}
                  value={
                    values[field.id] ||
                    (field.type === "tags" || field.type === "checkbox"
                      ? []
                      : "")
                  }
                  onChange={(value: any) =>
                    onChange(field.id, field.label, value)
                  }
                  error={errors[field.id]}
                  appearance={appearance}
                />
                {errors[field.id] && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors[field.id]}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </details>
      </Card>
    );
  }

  return (
    <Card className={appearance.sectionCard}>
      <CardHeader>
        <CardTitle className={`${alignClass} wrap-break-word`}>
          <span
            className="block wrap-break-word"
            dangerouslySetInnerHTML={{
              __html:
                renderMarkdownInline(section.title) +
                (hasRequiredFields
                  ? ' <span class="text-destructive">*</span>'
                  : ""),
            }}
          />
        </CardTitle>
        {section.description && (
          <div
            className="text-left text-xs text-muted-foreground wrap-break-word"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(section.description),
            }}
          />
        )}
      </CardHeader>
      <CardContent className={appearance.density.sectionContent}>
        {section.fields.map((field: any) => (
          <div key={field.id} className={appearance.density.fieldGroup}>
            <Label className="flex items-center gap-1 flex-nowrap">
              <span
                className="inline min-w-0 whitespace-normal wrap-break-word"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdownInline(field.label),
                }}
              />
            </Label>
            {field.description && (
              <div
                className="text-left text-xs text-muted-foreground wrap-break-word"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(field.description),
                }}
              />
            )}
            <FieldRenderer
              field={field}
              value={
                values[field.id] ||
                (field.type === "tags" || field.type === "checkbox" ? [] : "")
              }
              onChange={(value: any) => onChange(field.id, field.label, value)}
              error={errors[field.id]}
              appearance={appearance}
            />
            {errors[field.id] && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors[field.id]}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function PublicForm({ form, feedbackContext }: PublicFormProps) {
  const appearance = getFormAppearanceClasses(form.appearance || null);
  const isEditorial = appearance.resolved.preset === "editorial";
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    fieldId: string,
    label: string,
    value: string | string[],
  ) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[fieldId];
        return n;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    form.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.required) {
          const value = values[field.id];
          if (!value || (Array.isArray(value) && value.length === 0)) {
            newErrors[field.id] = "This field is required";
          }
        }
      });
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      // Build a stable field-id to label map directly from form.sections
      const labelMap: Record<string, string> = {};
      let sections = form.sections;

      // Handle case where sections might be a JSON string
      if (typeof sections === "string") {
        try {
          sections = JSON.parse(sections);
        } catch (e) {
          console.error("Failed to parse sections:", e);
          sections = [];
        }
      }

      if (Array.isArray(sections)) {
        sections.forEach((section: any) => {
          if (Array.isArray(section.fields)) {
            section.fields.forEach((field: any) => {
              // Use field label if available, otherwise use section title, otherwise use field ID
              const label = field.label || section.title || field.id;
              labelMap[field.id] = label;
            });
          }
        });
      }

      // Keep responses keyed by field id so repeated/blank labels never collide
      const responsesByFieldId: Record<string, string | string[]> = {};
      Object.entries(values).forEach(([fieldId, value]) => {
        responsesByFieldId[fieldId] = value;
      });

      const submitterNameFieldId = Object.keys(labelMap).find(
        (fieldId) =>
          String(labelMap[fieldId]).toLowerCase().trim() === "name" ||
          String(labelMap[fieldId]).toLowerCase().trim() === "submitter name",
      );

      const result = await submitPublicFormRequest(
        form.id,
        form.title,
        form.userId ?? "",
        responsesByFieldId,
        labelMap,
        submitterNameFieldId && typeof values[submitterNameFieldId] === "string"
          ? values[submitterNameFieldId]
          : typeof values["name"] === "string"
            ? values["name"]
            : null,
      );

      if (!result.success) {
        if (result.riskLevel === "dangerous") {
          toast.error(
            result.reason ||
              "Your submission was rejected due to safety concerns. Please review your content and try again.",
          );
        } else {
          toast.error(
            result.error || "Failed to submit submission. Please try again.",
          );
        }
        setIsSubmitting(false);
        return;
      }

      if (result.isFlagged && result.riskLevel === "warning") {
        toast.info(
          "Your submission has been received and will be reviewed before being processed.",
        );
      }

      console.log("Submission saved:", result.requestId);
      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit submission. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!form || !form.isActive) {
    return (
      <div className="min-h-screen bg-background flex items-start justify-center pt-12">
        <div className="container max-w-2xl py-8">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/20">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="mt-6 text-2xl font-bold">Form Not Found</h2>
            <p className="mt-2 max-w-sm text-muted-foreground">
              This form doesn't exist or is no longer accepting responses.
            </p>
            <Link href="/">
              <Button variant="outline" className="mt-6 cursor-pointer">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to JanitorForge
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container max-w-2xl py-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/20">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h2 className="mt-6 text-2xl font-bold">Submission Submitted!</h2>
            <p className="mt-2 max-w-sm text-muted-foreground">
              Thank you for your submission! The creator will review your
              submission soon.
            </p>
            <Link href="/">
              <Button variant="outline" className="mt-6 cursor-pointer">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to JanitorForge
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-screen w-full">
      <div className={appearance.wrapper} style={appearance.wrapperStyle}>
        <div className={cn("container px-4 sm:px-6", appearance.preset.layout)}>
          {isEditorial ? (
            <aside
              className={cn("order-1 md:order-0", appearance.preset.sidebar)}
            >
              <div
                className={cn("space-y-5", appearance.density.headerSpacing)}
              >
                <div className="flex justify-start">
                  <div className={appearance.heroIcon}>
                    <Sparkles
                      className={cn("h-6 w-6", appearance.accent.text)}
                    />
                  </div>
                </div>
                <h1 className={cn("font-bold", appearance.title)}>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(form.title),
                    }}
                  />
                </h1>
                {form.description && (
                  <div
                    className="text-sm sm:text-base text-muted-foreground text-left leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(form.description),
                    }}
                  />
                )}
              </div>
            </aside>
          ) : (
            <div className={cn("mx-auto w-full", appearance.preset.layout)}>
              <div
                className={cn("text-center", appearance.density.headerSpacing)}
              >
                <div className="mb-4 flex justify-center">
                  <div className={appearance.heroIcon}>
                    <Sparkles
                      className={cn("h-6 w-6", appearance.accent.text)}
                    />
                  </div>
                </div>
                <h1 className={cn("font-bold", appearance.title)}>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(form.title),
                    }}
                  />
                </h1>
                {form.description && (
                  <div
                    className="mt-2 text-sm sm:text-base text-muted-foreground text-left"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(form.description),
                    }}
                  />
                )}
              </div>
            </div>
          )}

          <Card className={appearance.surface}>
            <CardContent className="p-4 sm:p-6 md:p-8">
              <form
                onSubmit={handleSubmit}
                className={appearance.density.formGap}
              >
                {form.sections.map((section) => (
                  <SectionRenderer
                    key={section.id}
                    section={section}
                    values={values}
                    errors={errors}
                    appearance={appearance}
                    onChange={(id: string, label: string, v: any) =>
                      handleChange(id, label, v)
                    }
                  />
                ))}

                <Button
                  type="submit"
                  className={cn(
                    "w-full cursor-pointer",
                    appearance.submitButton,
                  )}
                  style={appearance.submitButtonStyle}
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>Submitting...</>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 sm:mt-8 flex w-full">
            <Card className="w-full border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-3 space-y-1">
                  <p className="text-sm font-medium">
                    Need to tell us something?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Send a suggestion or report a bug without interrupting the
                    form above.
                  </p>
                </div>
                <FeedbackActions
                  compact
                  context={
                    feedbackContext ?? {
                      sourcePage: form.title,
                      sourceLabel: "Public form",
                      relatedId: form.id,
                    }
                  }
                />
              </CardContent>
            </Card>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Powered by JanitorForge
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
