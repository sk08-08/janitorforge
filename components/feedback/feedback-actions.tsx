"use client";

import { useState, type FormEvent } from "react";
import { Bug, Lightbulb, MessageSquarePlus, Send } from "lucide-react";
import { toast } from "sonner";
import { submitFeedbackAction } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/components/ui/use-mobile";
import { cn } from "@/lib/utils";
import { X as XIcon } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

type FeedbackType = "suggestion" | "bug";

interface FeedbackContext {
  sourcePage?: string;
  sourceLabel?: string;
  sourcePath?: string;
  relatedId?: string;
  metadata?: Record<string, unknown>;
}

interface FeedbackActionsProps {
  context: FeedbackContext;
  className?: string;
  compact?: boolean;
  mode?: "both" | "suggestion" | "bug";
}

const feedbackLocationOptions = [
  "Login / Register",
  "Public form",
  "Dashboard",
  "Requests",
  "Forms",
  "Bots",
] as const;

function resolveInitialLocation(context: FeedbackContext) {
  const sourceLabel = context.sourceLabel?.trim();
  if (sourceLabel && feedbackLocationOptions.includes(sourceLabel as any)) {
    return sourceLabel;
  }

  const sourcePath = context.sourcePath?.toLowerCase() ?? "";
  if (sourcePath.startsWith("/login")) return "Login / Register";
  if (sourcePath.startsWith("/form")) return "Public form";
  if (sourcePath.startsWith("/dashboard")) return "Dashboard";

  return "Dashboard";
}

const copyByType: Record<
  FeedbackType,
  {
    title: string;
    description: string;
    subjectLabel: string;
    subjectPlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    helper: string;
  }
> = {
  suggestion: {
    title: "Send a suggestion",
    description:
      "Share an idea, comment, or improvement you would like to see in JanitorForge.",
    subjectLabel: "Suggestion title",
    subjectPlaceholder: "Example: Add a faster form preview",
    messageLabel: "What would you like to change?",
    messagePlaceholder:
      "Tell us what you would like to see, why it matters, and any details that help us understand the idea.",
    helper: "We read every suggestion and use them to prioritize improvements.",
  },
  bug: {
    title: "Report a bug",
    description:
      "Tell us what broke, what you expected to happen, and how we can reproduce it.",
    subjectLabel: "Bug summary",
    subjectPlaceholder: "Example: Login modal does not open on mobile",
    messageLabel: "Bug details",
    messagePlaceholder:
      "Explain what happened, the steps to reproduce it, what you expected, and anything else that would help us debug it.",
    helper:
      "If you can include reproduction steps, that makes fixes much faster.",
  },
};

export function FeedbackActions({
  context,
  className,
  compact = false,
  mode = "both",
}: FeedbackActionsProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("suggestion");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState<string>(
    resolveInitialLocation(context),
  );
  const [otherLocation, setOtherLocation] = useState("");
  const [images, setImages] = useState<
    { name: string; dataUrl: string; size: number }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = copyByType[feedbackType];
  const selectLabelText =
    feedbackType === "bug"
      ? "Where did this bug happen?"
      : "Where would you like to suggest this?";
  const attachIntroText =
    feedbackType === "bug"
      ? "Attach screenshots (up to 3, PNG/JPG), max 2MB each."
      : "Attach images or mockups (up to 3), max 2MB each.";

  const openDialog = (type: FeedbackType) => {
    setFeedbackType(type);
    setOpen(true);
  };

  const closeDialog = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSubject("");
      setMessage("");
      setContact("");
      setFeedbackType("suggestion");
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (trimmedSubject.length < 3 || trimmedMessage.length < 10) {
      toast.error("Please add a short title and a more complete description.");
      return;
    }

    setIsSubmitting(true);

    const chosenSource =
      location === "other" ? otherLocation.trim() || "Other" : location;

    const result = await submitFeedbackAction({
      feedbackType,
      subject: trimmedSubject,
      message: trimmedMessage,
      contact: contact.trim(),
      sourcePage: chosenSource,
      sourceLabel: chosenSource,
      sourcePath: context.sourcePath ?? "",
      relatedId: context.relatedId ?? "",
      metadata: {
        ...(context.metadata ?? {}),
        images: images.map((i) => ({
          name: i.name,
          size: i.size,
          dataUrl: i.dataUrl,
        })),
      },
    });

    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error || "Failed to send feedback.");
      return;
    }

    toast.success(
      feedbackType === "bug"
        ? "Bug report sent. We'll review it soon."
        : "Suggestion sent. Thanks for the input.",
    );
    closeDialog(false);
  };

  const ActionSheet = (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant={feedbackType === "suggestion" ? "default" : "outline"}
          className="justify-start cursor-pointer data-[state=active]:cursor-default"
          onClick={() => setFeedbackType("suggestion")}
        >
          <Lightbulb className="mr-2 h-4 w-4" />
          Suggestion
        </Button>
        <Button
          type="button"
          variant={feedbackType === "bug" ? "destructive" : "outline"}
          className="justify-start cursor-pointer data-[state=active]:cursor-default"
          onClick={() => setFeedbackType("bug")}
        >
          <Bug className="mr-2 h-4 w-4" />
          Bug report
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-subject">{copy.subjectLabel}</Label>
        <Input
          id="feedback-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={copy.subjectPlaceholder}
          maxLength={120}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-message">{copy.messageLabel}</Label>
        <Textarea
          id="feedback-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={copy.messagePlaceholder}
          rows={feedbackType === "bug" ? 7 : 6}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-contact">Contact info</Label>
        <Input
          id="feedback-contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Email or username, optional"
          maxLength={160}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-location">{selectLabelText}</Label>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger id="feedback-location" className="w-full">
            <SelectValue
              placeholder={
                feedbackType === "bug"
                  ? "Select bug location"
                  : "Select suggestion target"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Login / Register">Login / Register</SelectItem>
            <SelectItem value="Public form">Public form</SelectItem>
            <SelectItem value="Dashboard">Dashboard</SelectItem>
            <SelectItem value="Requests">Requests / Kanban</SelectItem>
            <SelectItem value="Forms">Request Forms</SelectItem>
            <SelectItem value="Bots">Bot Manager</SelectItem>
            <SelectItem value="other">Other (specify)</SelectItem>
          </SelectContent>
        </Select>
        {location === "other" && (
          <Input
            value={otherLocation}
            onChange={(e) => setOtherLocation(e.target.value)}
            placeholder="Describe where this happened"
            maxLength={160}
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-images">Attach images (optional)</Label>
        <div className="rounded-md border border-dashed p-3">
          <p className="text-sm text-muted-foreground">{attachIntroText}</p>
          <div className="mt-3 flex items-center gap-2">
            <label
              htmlFor="feedback-images"
              className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm hover:opacity-90 cursor-pointer"
            >
              {feedbackType === "bug" ? "Add screenshots" : "Add images"}
            </label>
            <p className="text-xs text-muted-foreground">or drag & drop</p>
          </div>

          <input
            id="feedback-images"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              const maxFiles = 3;
              const maxSize = 2 * 1024 * 1024; // 2MB each
              const toAdd: { name: string; dataUrl: string; size: number }[] =
                [];

              for (const f of files.slice(0, maxFiles)) {
                if (f.size > maxSize) {
                  toast.error(`${f.name} is too large (max 2MB).`);
                  continue;
                }
                const dataUrl = await new Promise<string | null>((res) => {
                  const reader = new FileReader();
                  reader.onload = () => res(String(reader.result ?? ""));
                  reader.onerror = () => res(null);
                  reader.readAsDataURL(f);
                });
                if (dataUrl)
                  toAdd.push({ name: f.name, dataUrl, size: f.size });
              }

              setImages((prev) => [...prev, ...toAdd].slice(0, 3));
              // reset input
              (e.target as HTMLInputElement).value = "";
            }}
          />

          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className="h-28 w-full object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white"
                    onClick={() =>
                      setImages((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{copy.helper}</p>

      <Button
        type="submit"
        className="w-full cursor-pointer"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          "Sending..."
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send {feedbackType === "bug" ? "bug report" : "suggestion"}
          </>
        )}
      </Button>
    </form>
  );

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {(mode === "both" || mode === "suggestion") && (
          <Button
            type="button"
            variant="outline"
            size={compact ? "sm" : "default"}
            className="cursor-pointer"
            onClick={() => openDialog("suggestion")}
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Suggestion
          </Button>
        )}
        {(mode === "both" || mode === "bug") && (
          <Button
            type="button"
            variant="destructive"
            size={compact ? "sm" : "default"}
            className="cursor-pointer"
            onClick={() => openDialog("bug")}
          >
            <Bug className="mr-2 h-4 w-4" />
            Report bug
          </Button>
        )}
      </div>

      {isMobile ? (
        <Drawer open={open} onOpenChange={closeDialog}>
          <DrawerContent className="max-h-[90vh] overflow-y-auto rounded-t-3xl p-6">
            <DrawerHeader className="px-0 pt-2 text-left">
              <DrawerTitle>{copy.title}</DrawerTitle>
              <DrawerDescription>{copy.description}</DrawerDescription>
            </DrawerHeader>
            {ActionSheet}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={closeDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>
            {ActionSheet}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
