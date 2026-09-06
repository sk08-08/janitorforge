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
import { cn } from "@/lib/utils";

import type { CreatorInspectorBaseProps } from "@/features/creator-pages/types/creator-page-types";

export function DividerInspector({
  blockInspectorTab,
  setBlockInspectorTab,
  sectionConfigEdit,
  setSectionConfigEdit,
}: CreatorInspectorBaseProps) {
  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1 sm:grid-cols-3">
        {(["layout", "style", "motion"] as const).map(
          (value) => (
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
          ),
        )}
      </div>

      {blockInspectorTab === "layout" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Layout
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Style</Label>
            <Select
              value={
                sectionConfigEdit.dividerStyle || "solid"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  dividerStyle: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
                <SelectItem value="gradient">
                  Gradient
                </SelectItem>
                <SelectItem value="dots">Dots</SelectItem>
                <SelectItem value="ornament">
                  Ornament
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CreatorNumberControl
            label={
              ["dots", "ornament"].includes(
                sectionConfigEdit.dividerStyle || "solid",
              )
                ? "Size"
                : "Thickness"
            }
            value={sectionConfigEdit.dividerThickness || "1"}
            min={1}
            max={
              ["dots", "ornament"].includes(
                sectionConfigEdit.dividerStyle || "solid",
              )
                ? 16
                : 12
            }
            step={1}
            fallback={1}
            suffix="px"
            presets={
              ["dots", "ornament"].includes(
                sectionConfigEdit.dividerStyle || "solid",
              )
                ? [4, 6, 8, 12]
                : [1, 2, 4, 8]
            }
            onChange={(value) =>
              setSectionConfigEdit((current) => ({
                ...current,
                dividerThickness: value,
              }))
            }
          />

          <div className="space-y-2">
            <Label className="text-xs">Width</Label>
            <Select
              value={sectionConfigEdit.dividerWidth || "100"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  dividerWidth: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25%</SelectItem>
                <SelectItem value="50">50%</SelectItem>
                <SelectItem value="75">75%</SelectItem>
                <SelectItem value="100">100%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Alignment</Label>
              {sectionConfigEdit.dividerWidth === "100" && (
                <span className="text-[10px] text-muted-foreground">
                  Full width
                </span>
              )}
            </div>

            <Select
              value={
                sectionConfigEdit.dividerAlignment || "center"
              }
              disabled={
                sectionConfigEdit.dividerWidth === "100"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  dividerAlignment: value,
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
        </div>
      )}

      {blockInspectorTab === "style" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Style
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <Select
              value={
                sectionConfigEdit.dividerColorMode || "accent"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  dividerColorMode: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accent">
                  Page accent
                </SelectItem>
                <SelectItem value="custom">
                  Custom color
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sectionConfigEdit.dividerColorMode ===
            "custom" && (
            <CustomColorPicker
              label="Custom color"
              value={
                sectionConfigEdit.dividerCustomColor || ""
              }
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  dividerCustomColor: value,
                }))
              }
              allowEmpty
              emptyLabel="Use page accent"
            />
          )}

          <CreatorNumberControl
            label="Opacity"
            value={sectionConfigEdit.dividerOpacity || "35"}
            min={5}
            max={100}
            step={5}
            fallback={35}
            suffix="%"
            presets={[20, 35, 60, 100]}
            onChange={(value) =>
              setSectionConfigEdit((current) => ({
                ...current,
                dividerOpacity: value,
              }))
            }
          />

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-3 text-xs">
            <Checkbox
              checked={
                sectionConfigEdit.dividerGlow === "true"
              }
              onCheckedChange={(checked) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  dividerGlow: checked ? "true" : "false",
                }))
              }
            />
            Glow
          </label>
        </div>
      )}

      {blockInspectorTab === "motion" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Motion
          </p>

          <div className="space-y-2">
            <Label className="text-xs">
              Entrance animation
            </Label>
            <Select
              value={
                sectionConfigEdit.dividerEntranceAnimation ||
                "none"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  dividerEntranceAnimation: value,
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

          {sectionConfigEdit.dividerEntranceAnimation !==
            "none" && (
            <div className="grid gap-4">
              <CreatorNumberControl
                label="Duration"
                value={
                  sectionConfigEdit.dividerMotionDuration ||
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
                    dividerMotionDuration: value,
                  }))
                }
              />

              <CreatorNumberControl
                label="Delay"
                value={
                  sectionConfigEdit.dividerMotionDelay || "0"
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
                    dividerMotionDelay: value,
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

type SpacerInspectorProps = Pick<
  CreatorInspectorBaseProps,
  "sectionConfigEdit" | "setSectionConfigEdit"
>;

export function SpacerInspector({
  sectionConfigEdit,
  setSectionConfigEdit,
}: SpacerInspectorProps) {
  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Spacing
      </p>

      <CreatorNumberControl
        label="Desktop height"
        value={sectionConfigEdit.spacerHeight || "48"}
        min={0}
        max={600}
        step={4}
        fallback={48}
        suffix="px"
        presets={[16, 32, 48, 64, 96, 128]}
        onChange={(value) =>
          setSectionConfigEdit((current) => ({
            ...current,
            spacerHeight: value,
          }))
        }
      />

      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-3 text-xs">
        <Checkbox
          checked={
            sectionConfigEdit.spacerResponsive === "true"
          }
          onCheckedChange={(checked) =>
            setSectionConfigEdit((current) => ({
              ...current,
              spacerResponsive: checked ? "true" : "false",
            }))
          }
        />
        Use a smaller height on mobile
      </label>

      {sectionConfigEdit.spacerResponsive === "true" && (
        <CreatorNumberControl
          label="Mobile height"
          value={sectionConfigEdit.spacerMobileHeight || "32"}
          min={0}
          max={400}
          step={4}
          fallback={32}
          suffix="px"
          presets={[8, 16, 24, 32, 48, 64]}
          onChange={(value) =>
            setSectionConfigEdit((current) => ({
              ...current,
              spacerMobileHeight: value,
            }))
          }
        />
      )}
    </div>
  );
}
