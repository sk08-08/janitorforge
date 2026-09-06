"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CreatorNumberControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;

  min?: number;
  max?: number;
  step?: number;
  fallback?: number;
  suffix?: string;
  presets?: number[];
  className?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CreatorNumberControl({
  label,
  value,
  onChange,
  min = 0,
  max = 3000,
  step = 50,
  fallback = 0,
  suffix,
  presets = [],
  className,
}: CreatorNumberControlProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = (raw: string) => {
    const parsed = Number(raw);

    if (!raw.trim() || Number.isNaN(parsed)) {
      const next = String(clamp(fallback, min, max));
      setDraft(next);
      onChange(next);
      return;
    }

    const next = String(clamp(parsed, min, max));
    setDraft(next);
    onChange(next);
  };

  const adjust = (direction: -1 | 1) => {
    const parsed = Number(draft);
    const base = Number.isFinite(parsed) ? parsed : fallback;
    commit(String(base + step * direction));
  };

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs">{label}</Label>

        {suffix && (
          <span className="text-[10px] text-muted-foreground">{suffix}</span>
        )}
      </div>

      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 cursor-pointer rounded-lg"
          onClick={() => adjust(-1)}
          disabled={Number(draft || fallback) <= min}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>

        <div className="relative min-w-0">
          <Input
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(event) => {
              const next = event.target.value;

              // Allow an empty draft while typing. It is normalized on blur.
              if (next === "" || /^-?\d*$/.test(next)) {
                setDraft(next);
              }
            }}
            onBlur={() => commit(draft)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                adjust(1);
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                adjust(-1);
              }
            }}
            className="h-9 min-w-0 text-center font-mono text-xs tabular-nums"
            aria-label={label}
          />

          {suffix && (
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 cursor-pointer rounded-lg"
          onClick={() => adjust(1)}
          disabled={Number(draft || fallback) >= max}
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const active = Number(value) === preset;

            return (
              <button
                key={preset}
                type="button"
                className={cn(
                  "cursor-pointer rounded-full border border-border/70 px-2 py-1 text-[10px] tabular-nums text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground",
                  active && "border-primary/35 bg-primary/8 text-primary",
                )}
                onClick={() => commit(String(preset))}
              >
                {preset}
                {suffix}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
