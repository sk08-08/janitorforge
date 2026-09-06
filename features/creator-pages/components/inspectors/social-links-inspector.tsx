"use client";

import type { Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";

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
import { normalizeCreatorPageHttpUrl } from "@/features/creator-pages/lib/creator-page-links";
import { cn } from "@/lib/utils";

import type {
  CreatorInspectorBaseProps,
  CreatorSocialLinkItem,
} from "@/features/creator-pages/types/creator-page-types";

interface SocialLinksInspectorProps extends CreatorInspectorBaseProps {
  editingLinks: CreatorSocialLinkItem[];
  setEditingLinks: Dispatch<SetStateAction<CreatorSocialLinkItem[]>>;
}

export function SocialLinksInspector({
  blockInspectorTab,
  setBlockInspectorTab,
  sectionConfigEdit,
  setSectionConfigEdit,
  editingLinks,
  setEditingLinks,
}: SocialLinksInspectorProps) {
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Social links
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                URLs are normalized and validated as
                HTTP/HTTPS.
              </p>
            </div>

            <span className="text-[10px] text-muted-foreground">
              {editingLinks.length}
            </span>
          </div>

          <div className="space-y-2">
            {editingLinks.map((link, index) => {
              const urlCheck = normalizeCreatorPageHttpUrl(
                link.url,
                {
                  label: "social link",
                },
              );

              return (
                <div
                  key={index}
                  className="grid min-w-0 gap-2 rounded-xl border border-border/60 bg-muted/[0.12] p-3 sm:grid-cols-[minmax(0,1fr)_2rem]"
                >
                  <div className="min-w-0 space-y-2">
                    <Select
                      value={link.platform || "website"}
                      onValueChange={(value) => {
                        const labels: Record<string, string> =
                          {
                            janitorai: "Janitor AI",
                            twitter: "Twitter / X",
                            discord: "Discord",
                            github: "GitHub",
                            tiktok: "TikTok",
                            youtube: "YouTube",
                            twitch: "Twitch",
                            website: "Website",
                            instagram: "Instagram",
                            reddit: "Reddit",
                            bluesky: "Bluesky",
                          };

                        const next = [...editingLinks];
                        next[index] = {
                          ...next[index],
                          platform: value,
                          label:
                            next[index].label ||
                            labels[value] ||
                            value,
                        };
                        setEditingLinks(next);
                      }}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="janitorai">
                          Janitor AI
                        </SelectItem>
                        <SelectItem value="twitter">
                          Twitter / X
                        </SelectItem>
                        <SelectItem value="discord">
                          Discord
                        </SelectItem>
                        <SelectItem value="github">
                          GitHub
                        </SelectItem>
                        <SelectItem value="tiktok">
                          TikTok
                        </SelectItem>
                        <SelectItem value="youtube">
                          YouTube
                        </SelectItem>
                        <SelectItem value="twitch">
                          Twitch
                        </SelectItem>
                        <SelectItem value="instagram">
                          Instagram
                        </SelectItem>
                        <SelectItem value="reddit">
                          Reddit
                        </SelectItem>
                        <SelectItem value="bluesky">
                          Bluesky
                        </SelectItem>
                        <SelectItem value="website">
                          Website
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      value={link.url}
                      onChange={(event) => {
                        const next = [...editingLinks];
                        next[index] = {
                          ...next[index],
                          url: event.target.value,
                        };
                        setEditingLinks(next);
                      }}
                      onBlur={() => {
                        const result =
                          normalizeCreatorPageHttpUrl(
                            link.url,
                            { label: "social link" },
                          );

                        if (
                          result.valid &&
                          result.href !== null
                        ) {
                          const next = [...editingLinks];
                          next[index] = {
                            ...next[index],
                            url: result.href,
                          };
                          setEditingLinks(next);
                        }
                      }}
                      placeholder="example.com/profile"
                      className={cn(
                        "h-9 min-w-0 text-xs",
                        link.url.trim() &&
                          !urlCheck.valid &&
                          "border-destructive/55",
                      )}
                    />

                    <Input
                      value={link.label || ""}
                      onChange={(event) => {
                        const next = [...editingLinks];
                        next[index] = {
                          ...next[index],
                          label: event.target.value,
                        };
                        setEditingLinks(next);
                      }}
                      placeholder="Display label"
                      className="h-9 min-w-0 text-xs"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
                    onClick={() =>
                      setEditingLinks((current) =>
                        current.filter(
                          (_, itemIndex) =>
                            itemIndex !== index,
                        ),
                      )
                    }
                    title="Remove link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer rounded-xl"
            onClick={() =>
              setEditingLinks((current) => [
                ...current,
                {
                  platform: "website",
                  url: "",
                  label: "Website",
                },
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add social link
          </Button>
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
              value={
                sectionConfigEdit.socialLayout || "pills"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  socialLayout: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pills">Pills</SelectItem>
                <SelectItem value="icons">
                  Icons only
                </SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Alignment</Label>

              {["grid", "list"].includes(
                sectionConfigEdit.socialLayout || "pills",
              ) && (
                <span className="text-[10px] text-muted-foreground">
                  Fixed by this layout
                </span>
              )}
            </div>

            <Select
              value={
                sectionConfigEdit.socialAlignment || "left"
              }
              disabled={["grid", "list"].includes(
                sectionConfigEdit.socialLayout || "pills",
              )}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  socialAlignment: value,
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
            <Label className="text-xs">Size</Label>
            <Select
              value={sectionConfigEdit.socialSize || "medium"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  socialSize: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
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
            <Label className="text-xs">Link style</Label>
            <Select
              value={
                sectionConfigEdit.socialStyle || "outline"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  socialStyle: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outline">
                  Outline
                </SelectItem>
                <SelectItem value="soft">Soft</SelectItem>
                <SelectItem value="solid">
                  Solid accent
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

              {sectionConfigEdit.socialLayout === "icons" && (
                <span className="text-[10px] text-muted-foreground">
                  Icons are circular
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.socialRadius || "pill"}
              disabled={
                sectionConfigEdit.socialLayout === "icons"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  socialRadius: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="pill">Pill</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-3 text-xs",
              sectionConfigEdit.socialLayout === "icons" &&
                "cursor-not-allowed opacity-60",
            )}
          >
            <Checkbox
              checked={
                sectionConfigEdit.socialShowLabels !== "false"
              }
              disabled={
                sectionConfigEdit.socialLayout === "icons"
              }
              onCheckedChange={(checked) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  socialShowLabels: checked
                    ? "true"
                    : "false",
                }))
              }
            />
            <span className="min-w-0 flex-1">
              Show labels
            </span>
            {sectionConfigEdit.socialLayout === "icons" && (
              <span className="text-[10px] text-muted-foreground">
                Hidden
              </span>
            )}
          </label>
        </div>
      )}

      {blockInspectorTab === "motion" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Motion
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Hover motion</Label>
            <Select
              value={
                sectionConfigEdit.socialHoverMotion || "lift"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  socialHoverMotion: value,
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
                sectionConfigEdit.socialEntranceAnimation ||
                "none"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  socialEntranceAnimation: value,
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

          {sectionConfigEdit.socialEntranceAnimation !==
            "none" && (
            <div className="grid gap-4">
              <CreatorNumberControl
                label="Duration"
                value={
                  sectionConfigEdit.socialMotionDuration ||
                  "450"
                }
                min={150}
                max={2500}
                step={50}
                fallback={450}
                suffix="ms"
                presets={[300, 450, 700, 1000]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    socialMotionDuration: value,
                  }))
                }
              />

              <CreatorNumberControl
                label="Delay"
                value={
                  sectionConfigEdit.socialMotionDelay || "0"
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
                    socialMotionDelay: value,
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
