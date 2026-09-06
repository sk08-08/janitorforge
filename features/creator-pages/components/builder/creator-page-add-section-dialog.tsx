"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { sectionKindLabels } from "@/features/creator-pages/lib/creator-page-block-registry";
import type { SectionKind } from "@/features/creator-pages/types/creator-page-types";

interface CreatorPageAddSectionDialogProps {
  open: boolean;
  kind: SectionKind;
  title: string;
  onOpenChange: (open: boolean) => void;
  onKindChange: (kind: SectionKind) => void;
  onTitleChange: (title: string) => void;
  onAdd: () => void;
}

export function CreatorPageAddSectionDialog({
  open,
  kind,
  title,
  onOpenChange,
  onKindChange,
  onTitleChange,
  onAdd,
}: CreatorPageAddSectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Section</DialogTitle>
          <DialogDescription>
            Choose a section type to add to your page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Section Type</Label>
            <Select
              value={kind}
              onValueChange={(value) => onKindChange(value as SectionKind)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sectionKindLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Section Title</Label>
            <Input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={sectionKindLabels[kind]}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button onClick={onAdd} className="cursor-pointer">
            Add Section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
