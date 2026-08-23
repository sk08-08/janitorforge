"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  addToGlobalBlocklist,
  getGlobalBlocklist,
  removeFromGlobalBlocklist,
} from "@/features/moderation/actions/safety";

interface BlocklistItem {
  id: string;
  pattern: string;
  isRegex: boolean;
  severity: "warning" | "dangerous";
  createdAt: string;
}

export function GlobalBlocklist() {
  const [patterns, setPatterns] = useState<BlocklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPattern, setNewPattern] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [severity, setSeverity] = useState<"warning" | "dangerous">("warning");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadBlocklist();
  }, []);

  const loadBlocklist = async () => {
    setLoading(true);
    try {
      const res = await getGlobalBlocklist();
      if (res.success && res.patterns) {
        setPatterns(
          res.patterns.map((p: any, i: number) => ({
            id: `${i}-${p.pattern}`,
            pattern: p.pattern,
            isRegex: p.is_regex || false,
            severity: p.severity || "warning",
            createdAt: p.created_at || new Date().toISOString(),
          })),
        );
      }
    } catch (e) {
      console.error("Failed to load global blocklist:", e);
      toast.error("Failed to load global blocklist");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newPattern.trim()) {
      toast.error("Please enter a pattern");
      return;
    }
    setIsAdding(true);
    try {
      const res = await addToGlobalBlocklist(
        newPattern.trim(),
        isRegex,
        severity,
      );
      if (res.success) {
        toast.success("Pattern added to global blocklist");
        setNewPattern("");
        setIsRegex(false);
        setSeverity("warning");
        setDialogOpen(false);
        await loadBlocklist();
      } else {
        toast.error(res.error || "Failed to add pattern");
      }
    } catch (e) {
      console.error("Error adding global pattern:", e);
      toast.error("Failed to add pattern");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    const pattern = patterns.find((p) => p.id === id);
    if (!pattern) return;

    try {
      const res = await removeFromGlobalBlocklist(pattern.pattern);
      if (res.success) {
        toast.success("Pattern removed");
        await loadBlocklist();
      } else {
        toast.error(res.error || "Failed to remove pattern");
      }
    } catch (e) {
      console.error("Error removing pattern:", e);
      toast.error("Failed to remove pattern");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Global Blocklist</CardTitle>
            <CardDescription>
              Manage site-wide blocklist patterns and severity
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 cursor-pointer">
                <Plus className="h-4 w-4" />
                Add Pattern
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Global Blocklist Pattern</DialogTitle>
                <DialogDescription>
                  Add words or regex patterns (site-wide)
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="pattern" className="text-sm font-medium">
                    Pattern
                  </Label>
                  <Input
                    id="pattern"
                    placeholder="e.g., kill yourself, badword"
                    value={newPattern}
                    onChange={(e) => setNewPattern(e.target.value)}
                    className="mt-1"
                    maxLength={300}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is-regex"
                    checked={isRegex}
                    onCheckedChange={(c) => setIsRegex(!!c)}
                  />
                  <Label htmlFor="is-regex" className="text-sm cursor-pointer">
                    Use regex pattern
                  </Label>
                </div>

                <div>
                  <Label className="text-sm">Severity</Label>
                  <Select
                    value={severity}
                    onValueChange={(value) =>
                      setSeverity(value as "warning" | "dangerous")
                    }
                  >
                    <SelectTrigger className="w-45">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="dangerous">Dangerous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={isAdding}
                  className="cursor-pointer"
                >
                  Add Pattern
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : patterns.length === 0 ? (
          <div className="text-center py-6">
            <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No global patterns yet. Add your first one!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {patterns.map((pattern) => (
              <div
                key={pattern.id}
                className="flex items-center justify-between p-2 bg-muted rounded-lg"
              >
                <div className="flex-1">
                  <code className="text-sm font-mono">{pattern.pattern}</code>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {pattern.severity}
                  </Badge>
                  {pattern.isRegex && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      regex
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemove(pattern.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
