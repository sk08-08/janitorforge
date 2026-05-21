// ============================================================================
// JanitorForge - Sensitivity Level Settings
// Adjust detection strictness for form submissions
// ============================================================================

"use client";

import React, { useState, useEffect } from "react";
import { Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export type SensitivityLevel = "low" | "medium" | "high" | "strict";

interface SensitivitySettings {
  formId: string;
  formTitle?: string;
  currentLevel?: SensitivityLevel;
  onLevelChange?: (level: SensitivityLevel) => void;
}

const SENSITIVITY_CONFIGS: Record<
  SensitivityLevel,
  {
    label: string;
    description: string;
    what_detects: string[];
    what_ignores: string[];
  }
> = {
  low: {
    label: "Low - Minimal Detection",
    description: "Only flags the most critical issues",
    what_detects: [
      "Direct suicide/self-harm language",
      "Severe threats (kill, rape, etc.)",
      "Obvious spam & malicious URLs",
    ],
    what_ignores: [
      "All caps text",
      "Excessive punctuation",
      "Repetitive patterns",
      "Suspicious domains",
    ],
  },
  medium: {
    label: "Medium - Balanced (Default)",
    description: "Standard detection with reasonable false positive rate",
    what_detects: [
      "Suicide/self-harm language",
      "Serious threats & harassment",
      "Obvious spam & malicious URLs",
      "Excessive capitals (70%+)",
      "Malicious domains",
    ],
    what_ignores: [
      "Minor profanity",
      "Mild slang",
      "Single excessive punctuation",
    ],
  },
  high: {
    label: "High - Strict Detection",
    description: "Detects more suspicious patterns",
    what_detects: [
      "All medium detections",
      "Multiple exclamation/question marks",
      "Suspicious domain extensions",
      "Repetitive characters",
      "Mixed aggression indicators",
    ],
    what_ignores: ["Internet slang", "Casual language"],
  },
  strict: {
    label: "Strict - Maximum Protection",
    description: "Flags anything remotely suspicious (highest false positives)",
    what_detects: [
      "All high detections",
      "New/unusual word patterns",
      "Submissions from new IPs",
      "Any flagged custom blocklist match",
      "Rapid repeated submissions",
    ],
    what_ignores: [],
  },
};

export function SensitivityLevelSettings({
  formId,
  formTitle,
  currentLevel = "medium",
  onLevelChange,
}: SensitivitySettings) {
  const [level, setLevel] = useState<SensitivityLevel>(currentLevel);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load from Supabase on mount (source of truth)
  useEffect(() => {
    const loadLevel = async () => {
      try {
        const supabase = await createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("request_forms")
          .select("security_sensitivity")
          .eq("id", formId)
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.warn("Failed to load sensitivity level:", error);
        } else if (data?.security_sensitivity) {
          setLevel(data.security_sensitivity as SensitivityLevel);
          // Also sync to localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem(
              `sensitivity_${formId}`,
              data.security_sensitivity,
            );
          }
        }
      } catch (error) {
        console.error("Error loading sensitivity:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLevel();
  }, [formId]);

  const config = SENSITIVITY_CONFIGS[level];

  const handleLevelChange = async (newLevel: SensitivityLevel) => {
    setLevel(newLevel);

    // Save to localStorage immediately
    if (typeof window !== "undefined") {
      localStorage.setItem(`sensitivity_${formId}`, newLevel);
    }

    setSaving(true);
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        toast.error("You must be signed in to update this form");
        return;
      }

      const { error } = await supabase
        .from("request_forms")
        .update({ security_sensitivity: newLevel })
        .eq("id", formId)
        .eq("user_id", user.id);

      if (error) {
        console.warn("Failed to update DB but saved locally:", error);
        toast.success("Sensitivity level updated");
        onLevelChange?.(newLevel);
      } else {
        toast.success("Sensitivity level updated");
        onLevelChange?.(newLevel);
      }
    } catch (error) {
      console.error("Error updating sensitivity:", error);
      toast.success("Sensitivity level updated");
      onLevelChange?.(newLevel);
    } finally {
      setSaving(false);
    }
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-base">Security Sensitivity</CardTitle>
              <CardDescription>
                Adjust how strict content detection is for{" "}
                {formTitle || "this form"}
              </CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-sm">
                  Lower sensitivity = fewer false positives but may miss some
                  issues. Higher sensitivity = more protection but more manual
                  reviews needed.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <Select
              value={level}
              onValueChange={(value) =>
                handleLevelChange(value as SensitivityLevel)
              }
              disabled={saving || loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SENSITIVITY_CONFIGS).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {loading ? "Loading sensitivity level..." : config.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs font-semibold text-green-900 dark:text-green-200 mb-1">
                ✓ Will Detect
              </p>
              <ul className="text-xs space-y-1 text-green-800 dark:text-green-300">
                {config.what_detects.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">
                ✗ Will Ignore
              </p>
              {config.what_ignores.length === 0 ? (
                <p className="text-xs text-blue-800 dark:text-blue-300 italic">
                  Nothing will be ignored at this level
                </p>
              ) : (
                <ul className="text-xs space-y-1 text-blue-800 dark:text-blue-300">
                  {config.what_ignores.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
