"use client";

import React, { useState, useEffect } from "react";
import {
  validateFormSubmission,
  recordFlaggedRequest,
} from "@/app/actions/safety";
// Lightweight markdown renderer for basic formatting (bold, italic, links, lists)
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

function renderMarkdownForDescription(md?: string | null) {
  if (!md) return "";
  const text = String(md);
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
  let out = text;
  // Process markdown first, then escape content
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, txt, href) => {
    const safe = sanitizeUrl(href);
    if (!safe) return escapeHtml(txt);
    return `<a href="${escapeAttr(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
      txt,
    )}</a>`;
  });
  out = out.replace(
    /\*\*(.+?)\*\*(?!\*)/g,
    (_, content) => `<strong>${escapeHtml(content)}</strong>`,
  );
  out = out.replace(
    /__(.+?)__/g,
    (_, content) => `<strong>${escapeHtml(content)}</strong>`,
  );
  out = out.replace(
    /(?<!\*)\*([^*]+?)\*(?!\*)/g,
    (_, content) => `<em>${escapeHtml(content)}</em>`,
  );
  out = out.replace(
    /_([^_]+?)_/g,
    (_, content) => `<em>${escapeHtml(content)}</em>`,
  );
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
      if (line.trim() !== "") {
        result += line + "<br/>";
      }
    }
  }
  if (inList) result += listType === "ul" ? "</ul>" : "</ol>";
  return result.trim();
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
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { FormField, FormSection } from "@/lib/types";

interface PublicFormProps {
  form: {
    id: string;
    title: string;
    description?: string | null;
    isActive: boolean;
    sections: FormSection[];
    userId?: string | null;
  };
}

function FieldRenderer({ field, value, onChange, error }: any) {
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
          className={cn(error && "border-destructive")}
        />
      );
    case "textarea":
      return (
        <Textarea
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={cn(error && "border-destructive")}
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
            <SelectTrigger className={cn(error && "border-destructive")}>
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
        <div>
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
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                <Label
                  htmlFor={`${field.id}-${option}`}
                  className="cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
            {field.allowOther && (
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="__other__" id={`${field.id}-other`} />
                <Label htmlFor={`${field.id}-other`} className="cursor-pointer">
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
            <div key={option} className="flex items-center space-x-2">
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
                className="cursor-pointer"
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
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="SFW" id={`${field.id}-sfw`} />
            <Label htmlFor={`${field.id}-sfw`} className="cursor-pointer">
              <Badge variant="secondary">SFW</Badge>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="NSFW" id={`${field.id}-nsfw`} />
            <Label htmlFor={`${field.id}-nsfw`} className="cursor-pointer">
              <Badge variant="destructive">NSFW</Badge>
            </Label>
          </div>
        </RadioGroup>
      );
    case "tags":
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder={field.placeholder}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), addTag())
              }
            />
            <Button type="button" variant="secondary" onClick={addTag}>
              Add
            </Button>
          </div>
          {Array.isArray(value) && value.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {value.map((tag: string) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
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

function SectionRenderer({ section, values, errors, onChange }: any) {
  const alignClass =
    section?.custom?.headerAlignment === "center"
      ? "text-center"
      : section?.custom?.headerAlignment === "right"
        ? "text-right"
        : "text-left";
  const hasRequiredFields = section.fields.some((f: any) => f.required);

  if (section?.custom?.collapsible) {
    return (
      <Card>
        <details className="group">
          <summary className={`cursor-pointer p-4 ${alignClass}`}>
            <span
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
                className="text-xs text-muted-foreground mt-1"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(section.description),
                }}
              />
            )}
          </summary>
          <CardContent className="space-y-6">
            {section.fields.map((field: any) => (
              <div key={field.id} className="space-y-2">
                <Label className="flex items-center gap-1 flex-nowrap">
                  <span
                    className="inline whitespace-nowrap"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownInline(field.label),
                    }}
                  />
                </Label>
                {field.description && (
                  <div
                    className="text-xs text-muted-foreground text-left"
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
    <Card>
      <CardHeader>
        <CardTitle className={alignClass}>
          <span
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
            className="text-xs text-muted-foreground text-left"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(section.description),
            }}
          />
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {section.fields.map((field: any) => (
          <div key={field.id} className="space-y-2">
            <Label className="flex items-center gap-1 flex-nowrap">
              <span
                className="inline whitespace-nowrap"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdownInline(field.label),
                }}
              />
            </Label>
            {field.description && (
              <div
                className="text-xs text-muted-foreground text-left"
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

export default function PublicForm({ form }: PublicFormProps) {
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
      const supabase = createClient();

      // Build label mapping directly from form.sections
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

      // Transform responses to use labels as keys instead of IDs
      const responsesByLabel: Record<string, string | string[]> = {};
      Object.entries(values).forEach(([fieldId, value]) => {
        const label = labelMap[fieldId] || fieldId;
        responsesByLabel[label] = value;
      });

      // ===== SECURITY CHECK: Validate content =====
      const securityCheck = await validateFormSubmission(
        form.id,
        responsesByLabel,
      );

      if (!securityCheck.isValid) {
        // Dangerous content - reject submission
        if (securityCheck.riskLevel === "dangerous") {
          toast.error(
            "Your submission was rejected due to safety concerns. Please review your content and try again.",
          );
          setIsSubmitting(false);
          return;
        }

        // Rate limit exceeded
        if (securityCheck.reason?.includes("Rate limit")) {
          toast.error(securityCheck.reason);
          setIsSubmitting(false);
          return;
        }
      }

      // ===== INSERT REQUEST INTO DATABASE =====
      const payload: any = {
        form_id: form.id,
        user_id: form.userId ?? null,
        form_title: form.title,
        responses: responsesByLabel,
        submitter_name:
          typeof values["name"] === "string" ? values["name"] : null,
      };

      const { data, error } = await supabase
        .from("requests")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Failed to save request:", error);
        toast.error("Failed to submit request. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // ===== FLAG REQUEST IF NEEDED =====
      if (securityCheck.isFlagged && data) {
        const flagResult = await recordFlaggedRequest(
          form.id,
          data.id,
          securityCheck.riskLevel as "warning" | "dangerous",
          securityCheck.flaggedFields || {},
          securityCheck.reason,
        );

        if (!flagResult.success) {
          console.warn("Failed to record flagged request:", flagResult.error);
        }

        // Show warning but still confirm submission
        if (securityCheck.riskLevel === "warning") {
          toast.info(
            "Your submission has been received and will be reviewed before being processed.",
          );
        }
      }

      console.log("Request saved:", data);
      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit request. Please try again.");
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
            <h2 className="mt-6 text-2xl font-bold">Request Submitted!</h2>
            <p className="mt-2 max-w-sm text-muted-foreground">
              Thank you for your submission! The creator will review your
              request soon.
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
    <div className="min-h-screen bg-background flex items-start justify-center pt-12">
      <div className="container max-w-2xl py-8">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 neon-glow-sm">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(form.title) }}
            />
          </h1>
          {form.description && (
            <div
              className="mt-2 text-muted-foreground text-left"
              dangerouslySetInnerHTML={{
                __html: renderMarkdownForDescription(String(form.description)),
              }}
            />
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {form.sections.map((section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              values={values}
              errors={errors}
              onChange={(id: string, label: string, v: any) =>
                handleChange(id, label, v)
              }
            />
          ))}

          <Button
            type="submit"
            className="w-full cursor-pointer"
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

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Powered by JanitorForge
        </p>
      </div>
    </div>
  );
}
