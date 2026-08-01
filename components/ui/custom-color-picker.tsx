"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const defaultPresets = [
  { label: "Violet", value: "#7c3aed" },
  { label: "Emerald", value: "#10b981" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Slate", value: "#64748b" },
  { label: "Fuchsia", value: "#d946ef" },
  { label: "Teal", value: "#14b8a6" },
];

interface CustomColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets?: Array<{ label: string; value: string }>;
}

export function CustomColorPicker({
  label,
  value,
  onChange,
  presets = defaultPresets,
}: CustomColorPickerProps) {
  const normalized = String(value || "").trim() || "#7c3aed";

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-start gap-3 border-border/80 bg-card/85 px-3 shadow-sm transition-colors hover:bg-muted/55 cursor-pointer"
          >
            <span
              className="h-5 w-5 rounded-full border border-foreground/15 shadow-sm ring-1 ring-black/5"
              style={{ backgroundColor: normalized }}
            />
            <span className="flex flex-1 flex-col items-start text-left">
              <span className="text-sm font-medium">{label}</span>
              <span className="font-mono text-[11px] text-muted-foreground uppercase">
                {normalized}
              </span>
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 border-border/80 bg-popover p-4 shadow-xl"
          align="start"
        >
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Suggested colors</p>
              <p className="text-xs text-muted-foreground">
                Pick a clean base, then fine-tune with a hex value.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  data-state={
                    normalized.toLowerCase() === preset.value.toLowerCase()
                      ? "on"
                      : "off"
                  }
                  className={cn(
                    "group flex flex-col items-center gap-1 rounded-xl border border-border/70 bg-card/70 p-2 transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-muted/40",
                    normalized.toLowerCase() === preset.value.toLowerCase() &&
                      "border-primary/70 bg-primary/10 shadow-sm",
                  )}
                  onClick={() => onChange(preset.value)}
                >
                  <span
                    className="h-7 w-7 rounded-full border shadow-sm transition-transform group-hover:scale-105"
                    style={{ backgroundColor: preset.value }}
                  />
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Custom hex</Label>
              <Input
                value={normalized}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 font-mono text-xs uppercase"
                maxLength={7}
                spellCheck={false}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
