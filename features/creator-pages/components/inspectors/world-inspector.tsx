"use client";

import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

import type {
  CreatorInspectorBaseProps,
  CreatorWorldInspectorItem,
} from "@/features/creator-pages/types/creator-page-types";

interface WorldInspectorProps extends CreatorInspectorBaseProps {
  availableWorlds: CreatorWorldInspectorItem[];
  editingSelectedWorldIds: string[];
  setEditingSelectedWorldIds: Dispatch<SetStateAction<string[]>>;
}

export function WorldInspector({
  blockInspectorTab,
  setBlockInspectorTab,
  sectionConfigEdit,
  setSectionConfigEdit,
  availableWorlds,
  editingSelectedWorldIds,
  setEditingSelectedWorldIds,
}: WorldInspectorProps) {
  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1 sm:grid-cols-4">
        {(
          ["content", "layout", "style", "motion"] as const
        ).map((value) => (
          <Button
            key={value}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 cursor-pointer rounded-lg px-1.5 text-[11px] capitalize",
              blockInspectorTab === value &&
                "bg-background shadow-sm",
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
            <Label className="text-xs">Description</Label>
            <MarkdownField
              value={sectionConfigEdit.description || ""}
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  description: value,
                }))
              }
              placeholder="Describe these worlds..."
              minEditorHeightRem={6}
              className="min-h-[7rem]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs">Worlds</Label>
              <span className="text-[10px] text-muted-foreground">
                {editingSelectedWorldIds.length > 0
                  ? `${editingSelectedWorldIds.length} selected`
                  : "All worlds"}
              </span>
            </div>

            <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-2">
              {availableWorlds.length > 0 ? (
                availableWorlds.map((world) => {
                  const checked =
                    editingSelectedWorldIds.includes(
                      world.id,
                    );

                  return (
                    <label
                      key={world.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors",
                        checked
                          ? "bg-primary/10"
                          : "hover:bg-muted",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          if (value) {
                            setEditingSelectedWorldIds(
                              (current) =>
                                current.includes(world.id)
                                  ? current
                                  : [...current, world.id],
                            );
                          } else {
                            setEditingSelectedWorldIds(
                              (current) =>
                                current.filter(
                                  (id) => id !== world.id,
                                ),
                            );
                          }
                        }}
                      />

                      <span className="truncate">
                        {world.title}
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  No worlds found.
                </p>
              )}
            </div>

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Leave everything unchecked to show every
              available world.
            </p>
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
              value={sectionConfigEdit.worldLayout || "grid"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  worldLayout: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="carousel">
                  Horizontal carousel
                </SelectItem>
                <SelectItem value="compact">
                  Compact list
                </SelectItem>
                <SelectItem value="editorial">
                  Editorial
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Columns</Label>

              {sectionConfigEdit.worldLayout !== "grid" && (
                <span className="text-[10px] text-muted-foreground">
                  Only used by Grid
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.worldColumns || "3"}
              disabled={
                sectionConfigEdit.worldLayout !== "grid"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  worldColumns: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 columns</SelectItem>
                <SelectItem value="3">3 columns</SelectItem>
                <SelectItem value="4">4 columns</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Gap</Label>
            <Select
              value={sectionConfigEdit.worldGap || "normal"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  worldGap: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tight">Tight</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="relaxed">
                  Relaxed
                </SelectItem>
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
              <Label className="text-xs">Card style</Label>

              {["compact", "editorial"].includes(
                sectionConfigEdit.worldLayout || "grid",
              ) && (
                <span className="text-[10px] text-muted-foreground">
                  Fixed by this layout
                </span>
              )}
            </div>

            <Select
              value={
                sectionConfigEdit.worldCardStyle || "card"
              }
              disabled={["compact", "editorial"].includes(
                sectionConfigEdit.worldLayout || "grid",
              )}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  worldCardStyle: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="soft">Soft</SelectItem>
                <SelectItem value="outline">
                  Outline
                </SelectItem>
                <SelectItem value="minimal">
                  Minimal
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Corner radius</Label>

              {["compact", "editorial"].includes(
                sectionConfigEdit.worldLayout || "grid",
              ) && (
                <span className="text-[10px] text-muted-foreground">
                  Fixed by this layout
                </span>
              )}
            </div>

            <Select
              value={
                sectionConfigEdit.worldCardRadius || "large"
              }
              disabled={["compact", "editorial"].includes(
                sectionConfigEdit.worldLayout || "grid",
              )}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  worldCardRadius: value,
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
              <Label className="text-xs">
                Text alignment
              </Label>

              {["compact", "editorial"].includes(
                sectionConfigEdit.worldLayout || "grid",
              ) && (
                <span className="text-[10px] text-muted-foreground">
                  Fixed by this layout
                </span>
              )}
            </div>

            <Select
              value={
                sectionConfigEdit.worldTextAlign || "left"
              }
              disabled={["compact", "editorial"].includes(
                sectionConfigEdit.worldLayout || "grid",
              )}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  worldTextAlign: value,
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

          <div className="grid gap-2">
            {[
              ["showWorldDescription", "Show description"],
              ["showWorldType", "Show world type"],
              ["showWorldBotCount", "Show bot count"],
            ].map(([key, label]) => {
              const fixedLayout = [
                "compact",
                "editorial",
              ].includes(
                sectionConfigEdit.worldLayout || "grid",
              );

              const disabled =
                fixedLayout && key !== "showWorldDescription";

              return (
                <label
                  key={key}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-3 text-xs",
                    disabled &&
                      "cursor-not-allowed opacity-60",
                  )}
                >
                  <Checkbox
                    checked={
                      sectionConfigEdit[key] !== "false"
                    }
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      setSectionConfigEdit((current) => ({
                        ...current,
                        [key]: checked ? "true" : "false",
                      }))
                    }
                  />

                  <span className="min-w-0 flex-1">
                    {label}
                  </span>

                  {disabled && (
                    <span className="text-[10px] text-muted-foreground">
                      Fixed
                    </span>
                  )}
                </label>
              );
            })}
          </div>
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

              {["compact", "editorial"].includes(
                sectionConfigEdit.worldLayout || "grid",
              ) && (
                <span className="text-[10px] text-muted-foreground">
                  Fixed by this layout
                </span>
              )}
            </div>

            <Select
              value={
                sectionConfigEdit.worldHoverMotion || "lift"
              }
              disabled={["compact", "editorial"].includes(
                sectionConfigEdit.worldLayout || "grid",
              )}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  worldHoverMotion: value,
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
            <Label className="text-xs">
              Entrance animation
            </Label>

            <Select
              value={
                sectionConfigEdit.worldEntranceAnimation ||
                "none"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  worldEntranceAnimation: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fade">Fade</SelectItem>
                <SelectItem value="fade-up">
                  Fade up
                </SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sectionConfigEdit.worldEntranceAnimation !==
            "none" && (
            <div className="grid gap-4">
              <CreatorNumberControl
                label="Duration"
                value={
                  sectionConfigEdit.worldMotionDuration ||
                  "500"
                }
                min={150}
                max={2500}
                step={50}
                fallback={500}
                suffix="ms"
                presets={[300, 500, 800, 1200]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    worldMotionDuration: value,
                  }))
                }
              />

              <CreatorNumberControl
                label="Delay"
                value={
                  sectionConfigEdit.worldMotionDelay || "0"
                }
                min={0}
                max={2500}
                step={50}
                fallback={0}
                suffix="ms"
                presets={[0, 100, 250, 500]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    worldMotionDelay: value,
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
