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
import { MarkdownField } from "@/features/markdown/components/markdown-field";
import { cn } from "@/lib/utils";

import type {
  CreatorBotInspectorItem,
  CreatorInspectorBaseProps,
} from "@/features/creator-pages/types/creator-page-types";


interface BotInspectorProps extends CreatorInspectorBaseProps {
  availableBots: CreatorBotInspectorItem[];
  editingSelectedBotIds: string[];
  setEditingSelectedBotIds: Dispatch<SetStateAction<string[]>>;
}

export function BotInspector({
  blockInspectorTab,
  setBlockInspectorTab,
  sectionConfigEdit,
  setSectionConfigEdit,
  availableBots,
  editingSelectedBotIds,
  setEditingSelectedBotIds,
}: BotInspectorProps) {
  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1 sm:grid-cols-4">
        {(
          [
            ["content", "Content"],
            ["layout", "Layout"],
            ["style", "Style"],
            ["motion", "Motion"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 cursor-pointer rounded-lg px-1.5 text-[11px]",
              blockInspectorTab === value && "bg-background shadow-sm",
            )}
            onClick={() => setBlockInspectorTab(value)}
          >
            {label}
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
              placeholder="Describe this bot collection..."
              minEditorHeightRem={6}
              className="min-h-[7rem]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Bots</Label>
              <span className="text-[10px] text-muted-foreground">
                {editingSelectedBotIds.length || "All"}
              </span>
            </div>

            <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-2">
              {availableBots.map((bot) => {
                const checked = editingSelectedBotIds.includes(bot.id);

                return (
                  <label
                    key={bot.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors",
                      checked ? "bg-primary/10" : "hover:bg-muted",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        if (value) {
                          setEditingSelectedBotIds((current) =>
                            current.includes(bot.id)
                              ? current
                              : [...current, bot.id],
                          );
                        } else {
                          setEditingSelectedBotIds((current) =>
                            current.filter((id) => id !== bot.id),
                          );
                        }
                      }}
                    />

                    <span className="truncate">{bot.name}</span>
                  </label>
                );
              })}
            </div>

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Leave every bot unchecked to display all available bots.
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
              value={sectionConfigEdit.botLayout || "grid"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  botLayout: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="carousel">Horizontal carousel</SelectItem>
                <SelectItem value="posters">Posters</SelectItem>
                <SelectItem value="compact">Compact list</SelectItem>
                <SelectItem value="editorial">Editorial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(sectionConfigEdit.botLayout === "grid" ||
            sectionConfigEdit.botLayout === "posters") && (
            <div className="space-y-2">
              <Label className="text-xs">Columns</Label>
              <Select
                value={sectionConfigEdit.columns || "3"}
                onValueChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    columns: value,
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
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Image ratio</Label>
              {["compact", "editorial"].includes(
                sectionConfigEdit.botLayout || "grid",
              ) && (
                <span className="text-[10px] text-muted-foreground">
                  Fixed by this layout
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.botImageRatio || "landscape"}
              disabled={["compact", "editorial"].includes(
                sectionConfigEdit.botLayout || "grid",
              )}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  botImageRatio: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square">1:1</SelectItem>
                <SelectItem value="portrait">3:4</SelectItem>
                <SelectItem value="landscape">16:10</SelectItem>
                <SelectItem value="wide">16:9</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Gap</Label>
            <Select
              value={sectionConfigEdit.botGap || "normal"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  botGap: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tight">Tight</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="relaxed">Relaxed</SelectItem>
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
                sectionConfigEdit.botLayout || "grid",
              ) && (
                <span className="text-[10px] text-muted-foreground">
                  Fixed by this layout
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.botCardStyle || "glass"}
              disabled={["compact", "editorial"].includes(
                sectionConfigEdit.botLayout || "grid",
              )}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  botCardStyle: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="glass">Glass</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Corner radius</Label>
              {["compact", "editorial"].includes(
                sectionConfigEdit.botLayout || "grid",
              ) && (
                <span className="text-[10px] text-muted-foreground">
                  Fixed by this layout
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.botCardRadius || "large"}
              disabled={["compact", "editorial"].includes(
                sectionConfigEdit.botLayout || "grid",
              )}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  botCardRadius: value,
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

          <div className="grid gap-2">
            {[
              ["showBotImage", "Show image"],
              ["showBotDescription", "Show description"],
              ["showBotTags", "Show tags"],
              ["showBotRating", "Show rating"],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-3 text-xs"
              >
                <Checkbox
                  checked={sectionConfigEdit[key] !== "false"}
                  disabled={
                    key === "showBotRating" &&
                    ["compact", "editorial"].includes(
                      sectionConfigEdit.botLayout || "grid",
                    )
                  }
                  onCheckedChange={(checked) =>
                    setSectionConfigEdit((current) => ({
                      ...current,
                      [key]: checked ? "true" : "false",
                    }))
                  }
                />
                <span className="min-w-0 flex-1">{label}</span>
                {key === "showBotRating" &&
                  ["compact", "editorial"].includes(
                    sectionConfigEdit.botLayout || "grid",
                  ) && (
                    <span className="text-[10px] text-muted-foreground">
                      Not shown here
                    </span>
                  )}
              </label>
            ))}
          </div>
        </div>
      )}

      {blockInspectorTab === "motion" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Motion
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Card hover motion</Label>
            <Select
              value={sectionConfigEdit.botHoverMotion || "lift"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  botHoverMotion: value,
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

          <p className="rounded-xl border border-border/60 bg-muted/[0.12] p-3 text-[10px] leading-relaxed text-muted-foreground">
            Hover effects use lightweight transform/shadow transitions and are
            reduced on touch-sized screens.
          </p>
        </div>
      )}
    </div>
  );
}
