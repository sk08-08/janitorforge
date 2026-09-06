"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomColorPicker } from "@/components/ui/custom-color-picker";
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
import { normalizeCreatorPageHttpUrl } from "@/features/creator-pages/lib/creator-page-links";
import { cn } from "@/lib/utils";

import type { CreatorInspectorBaseProps } from "@/features/creator-pages/types/creator-page-types";

export function ImageInspector({
  blockInspectorTab,
  setBlockInspectorTab,
  sectionConfigEdit,
  setSectionConfigEdit,
}: CreatorInspectorBaseProps) {
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
              blockInspectorTab === value &&
                "bg-background shadow-sm",
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
            <Label className="text-xs">Image URL</Label>
            <Input
              value={sectionConfigEdit.imageUrl || ""}
              onChange={(event) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  imageUrl: event.target.value,
                }))
              }
              onBlur={() => {
                const result = normalizeCreatorPageHttpUrl(
                  sectionConfigEdit.imageUrl || "",
                  { label: "image URL" },
                );

                if (result.valid && result.href !== null) {
                  setSectionConfigEdit((current) => ({
                    ...current,
                    imageUrl: result.href!,
                  }));
                }
              }}
              placeholder="example.com/image.png"
              className={cn(
                "h-9",
                sectionConfigEdit.imageUrl?.trim() &&
                  !normalizeCreatorPageHttpUrl(
                    sectionConfigEdit.imageUrl,
                    { label: "image URL" },
                  ).valid &&
                  "border-destructive/55",
              )}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Alt text</Label>
            <Input
              value={sectionConfigEdit.alt || ""}
              onChange={(event) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  alt: event.target.value,
                }))
              }
              placeholder="Describe the image"
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
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Size</Label>

              {sectionConfigEdit.stickerUseCustomWidth ===
                "true" && (
                <span className="text-[10px] text-muted-foreground">
                  Overridden by custom width
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.size || "medium"}
              disabled={
                sectionConfigEdit.stickerUseCustomWidth ===
                "true"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  size: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="small">
                  Small · 128px
                </SelectItem>
                <SelectItem value="medium">
                  Medium · 256px
                </SelectItem>
                <SelectItem value="large">
                  Large · 384px
                </SelectItem>
                <SelectItem
                  value="full"
                  disabled={
                    sectionConfigEdit.positionMode ===
                    "absolute"
                  }
                >
                  Full width
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-3 text-xs">
            <Checkbox
              checked={
                sectionConfigEdit.stickerUseCustomWidth ===
                "true"
              }
              onCheckedChange={(checked) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  stickerUseCustomWidth: checked
                    ? "true"
                    : "false",
                }))
              }
            />
            Custom width
          </label>

          {sectionConfigEdit.stickerUseCustomWidth ===
            "true" && (
            <CreatorNumberControl
              label="Width"
              value={sectionConfigEdit.stickerWidth || "256"}
              min={48}
              max={1200}
              step={16}
              fallback={256}
              suffix="px"
              presets={[128, 256, 384, 512]}
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  stickerWidth: value,
                }))
              }
            />
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Alignment</Label>
              {sectionConfigEdit.positionMode ===
                "absolute" && (
                <span className="text-[10px] text-muted-foreground">
                  Not used in Free position
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.alignment || "center"}
              disabled={
                sectionConfigEdit.positionMode === "absolute"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  alignment: value,
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
            <Label className="text-xs">Position mode</Label>
            <Select
              value={
                sectionConfigEdit.positionMode || "static"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  positionMode: value,
                  size:
                    value === "absolute" &&
                    current.stickerUseCustomWidth !==
                      "true" &&
                    current.size === "full"
                      ? "medium"
                      : current.size,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static">
                  In page flow
                </SelectItem>
                <SelectItem value="absolute">
                  Free position
                </SelectItem>
              </SelectContent>
            </Select>

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              In page flow behaves like a normal image. Free
              position turns it into a decorative image that
              can overlap nearby blocks.
            </p>
          </div>

          {sectionConfigEdit.positionMode === "absolute" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs">Position X</Label>
                <Input
                  value={sectionConfigEdit.posX || "0px"}
                  onChange={(event) =>
                    setSectionConfigEdit((current) => ({
                      ...current,
                      posX: event.target.value,
                    }))
                  }
                  placeholder="0px / 50%"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Position Y</Label>
                <Input
                  value={sectionConfigEdit.posY || "0px"}
                  onChange={(event) =>
                    setSectionConfigEdit((current) => ({
                      ...current,
                      posY: event.target.value,
                    }))
                  }
                  placeholder="0px / 50%"
                  className="h-9"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {sectionConfigEdit.positionMode === "absolute" && (
        <CreatorNumberControl
          label="Layer"
          value={sectionConfigEdit.zIndex || "10"}
          min={0}
          max={100}
          step={1}
          fallback={10}
          presets={[0, 10, 25, 50]}
          onChange={(value) =>
            setSectionConfigEdit((current) => ({
              ...current,
              zIndex: value,
            }))
          }
        />
      )}
      {blockInspectorTab === "style" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Style
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Corner radius</Label>
            <Select
              value={sectionConfigEdit.rounded || "md"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  rounded: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
                <SelectItem value="full">
                  Circle / pill
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Shadow</Label>
            <Select
              value={
                sectionConfigEdit.stickerShadow || "soft"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  stickerShadow: value,
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

          <div className="space-y-2">
            <Label className="text-xs">Border</Label>
            <Select
              value={
                sectionConfigEdit.stickerBorderStyle || "none"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  stickerBorderStyle: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="subtle">Subtle</SelectItem>
                <SelectItem value="accent">Accent</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sectionConfigEdit.stickerBorderStyle !==
            "none" && (
            <CreatorNumberControl
              label="Border width"
              value={
                sectionConfigEdit.stickerBorderWidth || "1"
              }
              min={1}
              max={12}
              step={1}
              fallback={1}
              suffix="px"
              presets={[1, 2, 4, 8]}
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  stickerBorderWidth: value,
                }))
              }
            />
          )}

          {sectionConfigEdit.stickerBorderStyle ===
            "custom" && (
            <CustomColorPicker
              label="Border color"
              value={
                sectionConfigEdit.stickerBorderColor || ""
              }
              allowEmpty
              emptyLabel="Theme default"
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  stickerBorderColor: value,
                }))
              }
            />
          )}

          <CreatorNumberControl
            label="Opacity"
            value={sectionConfigEdit.opacity || "100"}
            min={0}
            max={100}
            step={5}
            fallback={100}
            suffix="%"
            presets={[25, 50, 75, 100]}
            onChange={(value) =>
              setSectionConfigEdit((current) => ({
                ...current,
                opacity: value,
              }))
            }
          />
        </div>
      )}

      {blockInspectorTab === "motion" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Motion
          </p>

          <CreatorNumberControl
            label="Rotation"
            value={sectionConfigEdit.rotation || "0"}
            min={-180}
            max={180}
            step={5}
            fallback={0}
            suffix="°"
            presets={[-15, 0, 15, 45]}
            onChange={(value) =>
              setSectionConfigEdit((current) => ({
                ...current,
                rotation: value,
              }))
            }
          />

          <div className="space-y-2">
            <Label className="text-xs">
              Entrance animation
            </Label>
            <Select
              value={
                sectionConfigEdit.stickerEntranceAnimation ||
                "none"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  stickerEntranceAnimation: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fade">Fade</SelectItem>
                <SelectItem value="pop">Pop</SelectItem>
                <SelectItem value="slide-up">
                  Slide up
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sectionConfigEdit.stickerEntranceAnimation !==
            "none" && (
            <div className="grid gap-4">
              <CreatorNumberControl
                label="Duration"
                value={
                  sectionConfigEdit.stickerMotionDuration ||
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
                    stickerMotionDuration: value,
                  }))
                }
              />

              <CreatorNumberControl
                label="Delay"
                value={
                  sectionConfigEdit.stickerMotionDelay || "0"
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
                    stickerMotionDelay: value,
                  }))
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Hover motion</Label>
            <Select
              value={
                sectionConfigEdit.stickerHoverMotion || "none"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  stickerHoverMotion: value,
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
                <SelectItem value="wiggle">Wiggle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
