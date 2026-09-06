"use client";

import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreatorNumberControl } from "@/features/creator-pages/components/shared/creator-number-control";
import { MarkdownField } from "@/features/markdown/components/markdown-field";
import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";
import { cn } from "@/lib/utils";

import type {
  CreatorFormInspectorItem,
  CreatorInspectorBaseProps,
} from "@/features/creator-pages/types/creator-page-types";

interface FormInspectorProps extends CreatorInspectorBaseProps {
  availableForms: CreatorFormInspectorItem[];
  editingFormId: string;
  setEditingFormId: Dispatch<SetStateAction<string>>;
}

export function FormInspector({
  blockInspectorTab,
  setBlockInspectorTab,
  sectionConfigEdit,
  setSectionConfigEdit,
  availableForms,
  editingFormId,
  setEditingFormId,
}: FormInspectorProps) {
  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1 sm:grid-cols-4">
        {(["content", "layout", "style", "motion"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 cursor-pointer rounded-lg px-1.5 text-[11px] capitalize",
              blockInspectorTab === value && "bg-background shadow-sm",
            )}
            onClick={() => setBlockInspectorTab(value)}
          >
            {value}
          </Button>
        ))}
      </div>

      {blockInspectorTab === "content" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Content
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Heading</Label>
            <Input
              value={sectionConfigEdit.formHeading || ""}
              onChange={(event) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  formHeading: event.target.value,
                }))
              }
              placeholder="Open for submissions"
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Description</Label>
            <MarkdownField
              value={sectionConfigEdit.description || ""}
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  description: value,
                }))
              }
              placeholder="Explain what this form is for..."
              minEditorHeightRem={6}
              className="min-h-[7rem]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Form</Label>

            {availableForms.length > 0 ? (
              <Select
                value={editingFormId || ""}
                onValueChange={(value) => setEditingFormId(value)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Choose a form..." />
                </SelectTrigger>

                <SelectContent>
                  {availableForms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">
                          {stripMarkdownToText(form.form_title) ||
                            "Untitled form"}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                            form.is_active
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {form.is_active ? "Open" : "Inactive"}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 p-4 text-xs leading-relaxed text-muted-foreground">
                No forms available. Create a form first.
              </div>
            )}

            {editingFormId &&
              (() => {
                const selectedForm = availableForms.find(
                  (form) => form.id === editingFormId,
                );

                if (!selectedForm) return null;

                return (
                  <div
                    className={cn(
                      "rounded-xl border p-3 text-[10px] leading-relaxed",
                      selectedForm.is_active
                        ? "border-emerald-500/20 bg-emerald-500/[0.05] text-muted-foreground"
                        : "border-border/60 bg-muted/25 text-muted-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          selectedForm.is_active
                            ? "bg-emerald-500"
                            : "bg-muted-foreground/50",
                        )}
                      />
                      <span className="font-medium text-foreground">
                        {selectedForm.is_active
                          ? "Form is open"
                          : "Form is inactive"}
                      </span>
                    </div>

                    <MarkdownRenderer
                      content={
                        selectedForm.is_active
                          ? "Visitors can open and submit this form."
                          : selectedForm.deactivated_message ||
                            "The form cannot currently accept submissions."
                      }
                      className="mt-1.5 [&>*:last-child]:mb-0"
                    />

                    {!selectedForm.is_active &&
                      selectedForm.deactivated_redirect_url && (
                        <p className="mt-1.5">
                          A deactivation redirect is configured and will be
                          shown on the Creator Page.
                        </p>
                      )}
                  </div>
                );
              })()}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Button label</Label>
            <Input
              value={sectionConfigEdit.ctaText || ""}
              onChange={(event) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  ctaText: event.target.value,
                }))
              }
              placeholder="Open form"
              className="h-9"
            />
          </div>
        </div>
      )}

      {blockInspectorTab === "layout" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Layout
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Presentation</Label>
            <Select
              value={sectionConfigEdit.formLayout || "card"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  formLayout: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="banner">Banner</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Alignment</Label>

              {["banner", "compact"].includes(
                sectionConfigEdit.formLayout || "card",
              ) && (
                <span className="text-[10px] text-muted-foreground">
                  Fixed by this layout
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.formAlignment || "left"}
              disabled={["banner", "compact"].includes(
                sectionConfigEdit.formLayout || "card",
              )}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  formAlignment: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
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
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Content width</Label>

              {sectionConfigEdit.formLayout === "banner" && (
                <span className="text-[10px] text-muted-foreground">
                  Banner fills the section
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.formContentWidth || "wide"}
              disabled={sectionConfigEdit.formLayout === "banner"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  formContentWidth: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="narrow">Narrow</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="wide">Wide</SelectItem>
                <SelectItem value="full">Full width</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {blockInspectorTab === "style" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Style
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Surface</Label>

              {sectionConfigEdit.formLayout === "minimal" && (
                <span className="text-[10px] text-muted-foreground">
                  Fixed by Minimal
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.formSurface || "card"}
              disabled={sectionConfigEdit.formLayout === "minimal"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  formSurface: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="soft">Soft</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="accent">Accent tint</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Corner radius</Label>

              {sectionConfigEdit.formLayout === "minimal" && (
                <span className="text-[10px] text-muted-foreground">
                  Not used by Minimal
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.formRadius || "large"}
              disabled={sectionConfigEdit.formLayout === "minimal"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  formRadius: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Accent detail</Label>

              {sectionConfigEdit.formLayout === "compact" && (
                <span className="text-[10px] text-muted-foreground">
                  Compact uses icon
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.formAccentStyle || "icon"}
              disabled={sectionConfigEdit.formLayout === "compact"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  formAccentStyle: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="icon">Icon</SelectItem>
                <SelectItem value="bar">Accent bar</SelectItem>
                <SelectItem value="glow">Accent glow</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-3 text-xs">
            <Checkbox
              checked={sectionConfigEdit.formShowStatus !== "false"}
              onCheckedChange={(checked) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  formShowStatus: checked ? "true" : "false",
                }))
              }
            />
            Show form status
          </label>
        </div>
      )}

      {blockInspectorTab === "motion" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Motion
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Hover motion</Label>

              {sectionConfigEdit.formLayout === "minimal" && (
                <span className="text-[10px] text-muted-foreground">
                  Minimal stays still
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.formHoverMotion || "lift"}
              disabled={sectionConfigEdit.formLayout === "minimal"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  formHoverMotion: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="lift">Lift</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
                <SelectItem value="glow">Glow</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Entrance animation</Label>

            <Select
              value={sectionConfigEdit.formEntranceAnimation || "none"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  formEntranceAnimation: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fade">Fade</SelectItem>
                <SelectItem value="fade-up">Fade up</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sectionConfigEdit.formEntranceAnimation !== "none" && (
            <div className="grid gap-4">
              <CreatorNumberControl
                label="Duration"
                value={sectionConfigEdit.formMotionDuration || "500"}
                min={150}
                max={2500}
                step={50}
                fallback={500}
                suffix="ms"
                presets={[300, 500, 800, 1200]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    formMotionDuration: value,
                  }))
                }
              />

              <CreatorNumberControl
                label="Delay"
                value={sectionConfigEdit.formMotionDelay || "0"}
                min={0}
                max={2500}
                step={50}
                fallback={0}
                suffix="ms"
                presets={[0, 100, 250, 500]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    formMotionDelay: value,
                  }))
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
