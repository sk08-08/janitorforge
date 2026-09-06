"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomColorPicker } from "@/components/ui/custom-color-picker";
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
import { cn } from "@/lib/utils";

import type { CreatorInspectorBaseProps } from "@/features/creator-pages/types/creator-page-types";

export function TextInspector({
  blockInspectorTab,
  setBlockInspectorTab,
  sectionConfigEdit,
  setSectionConfigEdit,
}: CreatorInspectorBaseProps) {
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
          <MarkdownField
            value={sectionConfigEdit.body || ""}
            onChange={(value) =>
              setSectionConfigEdit((current) => ({
                ...current,
                body: value,
              }))
            }
            placeholder="Write your content..."
            minEditorHeightRem={10}
            className="min-h-[11rem]"
          />
        </div>
      )}

      {blockInspectorTab === "layout" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Layout
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Alignment</Label>
            <Select
              value={sectionConfigEdit.textAlignment || "left"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  textAlignment: value,
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
            <Label className="text-xs">Text size</Label>
            <Select
              value={sectionConfigEdit.fontSize || "normal"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  fontSize: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="xl">Extra large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Content width</Label>
            <Select
              value={sectionConfigEdit.maxWidth || "wide"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  maxWidth: value,
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

          <div className="space-y-2">
            <Label className="text-xs">Padding</Label>
            <Select
              value={sectionConfigEdit.padding || "normal"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  padding: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
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
            <Label className="text-xs">Surface</Label>
            <Select
              value={sectionConfigEdit.textSurface || "card"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  textSurface: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transparent">Transparent</SelectItem>
                <SelectItem value="soft">Soft</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CustomColorPicker
            label="Text color"
            value={sectionConfigEdit.textColor || ""}
            allowEmpty
            emptyLabel="Theme default"
            onChange={(value) =>
              setSectionConfigEdit((current) => ({
                ...current,
                textColor: value,
              }))
            }
          />

          {sectionConfigEdit.textSurface !== "transparent" && (
            <CustomColorPicker
              label="Background color"
              value={sectionConfigEdit.backgroundColor || ""}
              allowEmpty
              emptyLabel="Surface default"
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  backgroundColor: value,
                }))
              }
            />
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Corner radius</Label>
              {sectionConfigEdit.textSurface === "transparent" && (
                <span className="text-[10px] text-muted-foreground">
                  Not used on Transparent
                </span>
              )}
            </div>
            <Select
              value={sectionConfigEdit.textRadius || "large"}
              disabled={sectionConfigEdit.textSurface === "transparent"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  textRadius: value,
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
              <Label className="text-xs">Shadow</Label>
              {sectionConfigEdit.textSurface === "transparent" && (
                <span className="text-[10px] text-muted-foreground">
                  Not used on Transparent
                </span>
              )}
            </div>
            <Select
              value={sectionConfigEdit.textShadow || "none"}
              disabled={sectionConfigEdit.textSurface === "transparent"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  textShadow: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="soft">Soft</SelectItem>
                <SelectItem value="strong">Strong</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {blockInspectorTab === "motion" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Motion
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Entrance animation</Label>
            <Select
              value={sectionConfigEdit.textEntranceAnimation || "none"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  textEntranceAnimation: value,
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

          {sectionConfigEdit.textEntranceAnimation !== "none" && (
            <div className="grid gap-4">
              <CreatorNumberControl
                label="Duration"
                value={sectionConfigEdit.textMotionDuration || "500"}
                min={150}
                max={2500}
                step={50}
                fallback={500}
                suffix="ms"
                presets={[300, 500, 800, 1200]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    textMotionDuration: value,
                  }))
                }
              />
              <CreatorNumberControl
                label="Delay"
                value={sectionConfigEdit.textMotionDelay || "0"}
                min={0}
                max={2500}
                step={50}
                fallback={0}
                suffix="ms"
                presets={[0, 100, 250, 500]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    textMotionDelay: value,
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
