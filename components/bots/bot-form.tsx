// ============================================================================
// JanitorForge - Bot Form Component
// Advanced bot creation and editing form with validation
// ============================================================================

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  X,
  Plus,
  Upload,
  Download,
  Save,
  Trash2,
  ChevronDown,
  Info,
  Bold,
  Italic,
  Link as LinkIcon,
  Pencil,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MarkdownRenderer } from "@/components/forms/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { TokenCounter, TokenSummary } from "./token-counter";
import { cn } from "@/lib/utils";
import type { BotFormData } from "@/lib/types";
import type { JanitorForgeCharacterCardExtension } from "@/lib/types";
import {
  exportCharacterCardPNG,
  importCharacterCardPNG,
  characterCardToBot,
} from "@/lib/bot-utils";
import { toast } from "sonner";
import { EyeOff } from "lucide-react";
import { removeBotImageAction, uploadBotImageAction } from "@/app/actions/bots";

const MAX_BOT_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;
const COMPRESSED_BOT_IMAGE_TARGET_BYTES = 3.5 * 1024 * 1024;
const IMAGE_COMPRESSION_STEPS = [
  { maxDimension: 1600, quality: 0.82 },
  { maxDimension: 1280, quality: 0.78 },
  { maxDimension: 1024, quality: 0.72 },
  { maxDimension: 768, quality: 0.68 },
  { maxDimension: 640, quality: 0.62 },
];

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function compressBotImageFile(file: File): Promise<File> {
  const image = await loadImageElement(file);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;

  if (!originalWidth || !originalHeight) {
    return file;
  }

  let bestBlob: Blob | null = null;

  for (const step of IMAGE_COMPRESSION_STEPS) {
    const scale = Math.min(
      1,
      step.maxDimension / Math.max(originalWidth, originalHeight),
    );
    const width = Math.max(1, Math.round(originalWidth * scale));
    const height = Math.max(1, Math.round(originalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) continue;

    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/webp", step.quality);
    if (!blob) continue;

    bestBlob = blob;
    if (blob.size <= COMPRESSED_BOT_IMAGE_TARGET_BYTES) {
      return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
        type: blob.type || "image/webp",
        lastModified: file.lastModified,
      });
    }
  }

  if (bestBlob) {
    return new File([bestBlob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
      type: bestBlob.type || "image/webp",
      lastModified: file.lastModified,
    });
  }

  return file;
}

// ----------------------------------------------------------------------------
// Bot Form Props
// ----------------------------------------------------------------------------

interface BotFormProps {
  initialData?: Partial<BotFormData>;
  onSubmit: (data: BotFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isEditing?: boolean;
}

// ----------------------------------------------------------------------------
// Bot Form Component
// ----------------------------------------------------------------------------

export function BotForm({
  initialData,
  onSubmit,
  onCancel,
  onDelete,
  isEditing = false,
}: BotFormProps) {
  const MAX_INITIAL_MESSAGES = 10;

  // Form state
  const [name, setName] = useState(initialData?.name || "");
  const [chatName, setChatName] = useState(initialData?.chatName || "");
  const [shortDescription, setShortDescription] = useState(
    initialData?.shortDescription || "",
  );
  const [personality, setPersonality] = useState(
    initialData?.personality || "",
  );
  const [initialMessages, setInitialMessages] = useState<string[]>(() => {
    const seedMessages = [
      initialData?.firstMessage || "",
      ...(initialData?.alternateGreetings || []),
    ]
      .map((message) => message.trim())
      .filter(Boolean);

    return seedMessages.length > 0 ? seedMessages : [""];
  });
  const [selectedInitialMessageIndex, setSelectedInitialMessageIndex] =
    useState(0);
  const [initialMessageMode, setInitialMessageMode] = useState<
    "edit" | "preview"
  >("edit");
  const [scenario, setScenario] = useState(initialData?.scenario || "");
  const [exampleDialogues, setExampleDialogues] = useState(
    initialData?.exampleDialogues || "",
  );
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [rating, setRating] = useState<"SFW" | "NSFW">(
    initialData?.rating || "SFW",
  );
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hideSensitiveFields, setHideSensitiveFields] = useState(
    initialData?.hideSensitiveFields || false,
  );
  const [tagInput, setTagInput] = useState("");

  // Tag management
  const addTag = useCallback(() => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  }, [tagInput, tags]);

  const removeTag = useCallback(
    (tagToRemove: string) => {
      setTags(tags.filter((t) => t !== tagToRemove));
    },
    [tags],
  );

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag();
      }
    },
    [addTag],
  );

  const updateInitialMessage = useCallback((index: number, value: string) => {
    setInitialMessages((current) =>
      current.map((message, currentIndex) =>
        currentIndex === index ? value : message,
      ),
    );
  }, []);

  const addInitialMessage = useCallback(() => {
    setInitialMessages((current) => {
      if (current.length >= MAX_INITIAL_MESSAGES) return current;
      setSelectedInitialMessageIndex(current.length);
      return [...current, ""];
    });
  }, []);

  const removeInitialMessage = useCallback((index: number) => {
    setInitialMessages((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((_, currentIndex) => currentIndex !== index);
      setSelectedInitialMessageIndex((currentSelected) => {
        if (index === currentSelected) {
          return Math.min(currentSelected, next.length - 1);
        }
        if (index < currentSelected) {
          return currentSelected - 1;
        }
        return currentSelected;
      });
      return next.length > 0 ? next : [""];
    });
  }, []);

  useEffect(() => {
    setSelectedInitialMessageIndex((current) =>
      Math.min(current, Math.max(initialMessages.length - 1, 0)),
    );
  }, [initialMessages.length]);

  useEffect(() => {
    setInitialMessageMode("edit");
  }, [selectedInitialMessageIndex]);

  const normalizeInitialMessages = useCallback(
    () => initialMessages.map((message) => message.trim()).filter(Boolean),
    [initialMessages],
  );

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_BOT_IMAGE_SIZE_BYTES * 4) {
        toast.error("Image is too large. Use a file under 4MB.");
        e.target.value = "";
        return;
      }

      setUploadingImage(true);
      try {
        const compressedFile =
          file.size > MAX_BOT_IMAGE_SIZE_BYTES
            ? await compressBotImageFile(file)
            : file;

        if (compressedFile.size > MAX_BOT_IMAGE_SIZE_BYTES) {
          toast.error(
            "Image could not be compressed enough. Try a smaller file.",
          );
          return;
        }

        const formData = new FormData();
        formData.append("file", compressedFile);
        if (imageUrl.trim()) {
          formData.append("existingUrl", imageUrl.trim());
        }

        const result = await uploadBotImageAction(formData);
        if (!result.success || !result.url) {
          toast.error(result.error || "Failed to upload image");
          return;
        }

        setImageUrl(result.url);
        toast.success("Bot image uploaded");
      } finally {
        setUploadingImage(false);
        e.target.value = "";
      }
    },
    [imageUrl],
  );

  const handleRemoveImage = useCallback(async () => {
    if (!imageUrl.trim()) return;

    const result = await removeBotImageAction(imageUrl.trim());
    if (!result.success) {
      toast.error(result.error || "Failed to remove image");
      return;
    }

    setImageUrl("");
    toast.success("Bot image removed");
  }, [imageUrl]);

  // Form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        toast.error("Bot name is required");
        return;
      }

      const normalizedInitialMessages = normalizeInitialMessages();

      if (normalizedInitialMessages.length === 0) {
        toast.error("Add at least one initial message");
        return;
      }

      onSubmit({
        name: name.trim(),
        chatName: chatName.trim() || undefined,
        shortDescription: shortDescription.trim(),
        personality,
        firstMessage: normalizedInitialMessages[0],
        alternateGreetings: normalizedInitialMessages.slice(1),
        scenario,
        exampleDialogues,
        tags,
        rating,
        imageUrl: imageUrl.trim() || undefined,
        hideSensitiveFields,
      });
    },
    [
      name,
      chatName,
      shortDescription,
      personality,
      normalizeInitialMessages,
      scenario,
      exampleDialogues,
      tags,
      rating,
      imageUrl,
      hideSensitiveFields,
      onSubmit,
    ],
  );

  // Export character card
  const handleExport = useCallback(async () => {
    try {
      const normalizedInitialMessages = normalizeInitialMessages();
      const blob = await exportCharacterCardPNG({
        id: "export",
        name,
        shortDescription,
        personality,
        firstMessage: normalizedInitialMessages[0] || "",
        alternateGreetings: normalizedInitialMessages.slice(1),
        scenario,
        exampleDialogues,
        tags,
        rating,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.replace(/\s+/g, "_")}_card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Character card exported successfully!");
    } catch {
      toast.error("Failed to export character card");
    }
  }, [
    name,
    shortDescription,
    personality,
    normalizeInitialMessages,
    scenario,
    exampleDialogues,
    tags,
    rating,
  ]);

  // Import character card
  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const cardData = await importCharacterCardPNG(file);
        if (cardData) {
          const importedRating = (
            cardData.data.extensions?.janitorforge as
              | JanitorForgeCharacterCardExtension
              | undefined
          )?.rating;
          const importedTags = cardData.data.tags || [];
          const hasLimitlessTag = importedTags.some(
            (tag) => tag.trim().toLowerCase() === "limitless",
          );
          const botData = characterCardToBot(cardData);
          setName(botData.name);
          setShortDescription(botData.shortDescription);
          setPersonality(botData.personality);
          setInitialMessages(
            [
              botData.firstMessage,
              ...(botData.alternateGreetings || []),
            ].filter(Boolean),
          );
          setScenario(botData.scenario);
          setExampleDialogues(botData.exampleDialogues);
          setTags(botData.tags);
          if (hasLimitlessTag) {
            setRating("NSFW");
          } else if (importedRating === "SFW" || importedRating === "NSFW") {
            setRating(importedRating);
          }
          toast.success("Character card imported successfully!");
        } else {
          toast.error("Could not read character data from this file");
        }
      } catch {
        toast.error("Failed to import character card");
      }

      // Reset input
      e.target.value = "";
    },
    [],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 overflow-hidden p-4 lg:p-6"
    >
      {/* Header Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          id="import-card"
          accept=".png"
          className="hidden"
          onChange={handleImport}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => document.getElementById("import-card")?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          <span className="truncate">Import Card V2</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={handleExport}
          disabled={!name.trim()}
        >
          <Download className="mr-2 h-4 w-4" />
          <span className="truncate">Export Card V2</span>
        </Button>
      </div>

      {/* Markdown Help */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 cursor-pointer"
          >
            <span className="flex items-center gap-2 font-medium">
              <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
              You can use Markdown in Name, Description, and Initial Message(s)
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3 text-sm">
            <div>
              <p className="font-medium mb-1">What you can use:</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Bold className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    <code className="bg-muted px-1 rounded">**bold**</code> →{" "}
                    <strong>bold</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Italic className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    <code className="bg-muted px-1 rounded">*italic*</code> →{" "}
                    <em>italic</em>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <LinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    <code className="bg-muted px-1 rounded">
                      [link text](https://url.com)
                    </code>{" "}
                    → clickable links
                  </span>
                </li>
                <li>
                  <code className="bg-muted px-1 rounded">- item</code> or{" "}
                  <code className="bg-muted px-1 rounded">1. item</code> → lists
                </li>
                <li>Line breaks work normally — just press Enter</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Current limitations:</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>
                  Headings (
                  <code className="bg-muted px-1 rounded"># Heading</code>) are
                  not rendered in bot names, so keep that field as plain text
                </li>
                <li>Images and tables are not supported</li>
                <li>Code blocks render as plain text</li>
                <li>
                  Markdown only applies where JanitorForge renders it, such as
                  previews and public pages; Janitor AI itself may display it
                  differently
                </li>
              </ul>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Core details about your bot character
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter bot name"
              required
            />
          </div>

          {/* Chat/Display Name */}
          <div className="space-y-2">
            <Label htmlFor="chat-name">Character Chat Name</Label>
            <Input
              id="chat-name"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              placeholder="Optional display name used in chat"
            />
          </div>

          {/* Short Description */}
          <div className="space-y-2">
            <Label htmlFor="short-description">Short Description</Label>
            <Input
              id="short-description"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="A brief tagline for your bot"
            />
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Content Rating</Label>
            <RadioGroup
              value={rating}
              onValueChange={(v) => setRating(v as "SFW" | "NSFW")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="SFW" id="sfw" />
                <Label htmlFor="sfw" className="cursor-pointer">
                  SFW
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="NSFW" id="nsfw" />
                <Label htmlFor="nsfw" className="cursor-pointer">
                  NSFW
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <input
              type="file"
              id="bot-image-upload"
              className="hidden"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
              onChange={handleImageUpload}
            />
            <Label
              htmlFor="image-url"
              className="flex flex-wrap items-center gap-1"
            >
              <span>Bot Image</span>
              <span className="text-xs text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={uploadingImage}
                onClick={() =>
                  document.getElementById("bot-image-upload")?.click()
                }
              >
                {uploadingImage ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-3.5 w-3.5" />
                )}
                {imageUrl.trim() ? "Replace image" : "Upload image"}
              </Button>
              {imageUrl.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-destructive"
                  onClick={handleRemoveImage}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>
            <Input
              id="image-url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/bot-image.png"
            />
            <p className="text-xs text-muted-foreground">
              You can upload directly or paste an external URL.
            </p>
            {imageUrl.trim() && (
              <div className="mt-2 h-20 w-20 rounded-lg overflow-hidden border border-border/70">
                <img
                  src={imageUrl.trim()}
                  alt="Bot preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag..."
                className="min-w-0"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addTag}
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeTag(tag)}
                  >
                    {tag}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Character Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Character Definition</CardTitle>
          <CardDescription>
            Define your bot&apos;s personality and behavior. Use {"{{char}}"}{" "}
            and {"{{user}}"} variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden space-y-6">
          {/* Personality */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="personality">Personality</Label>
              <TokenCounter text={personality} fieldName="Personality" />
            </div>
            <Textarea
              id="personality"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="Describe {{char}}'s personality, traits, background..."
              rows={6}
              className="font-mono text-sm max-h-56 overflow-auto resize-y"
            />
          </div>

          <Separator />

          {/* Scenario */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="scenario">Scenario</Label>
              <TokenCounter text={scenario} fieldName="Scenario" />
            </div>
            <Textarea
              id="scenario"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="The setting and circumstances of the roleplay..."
              rows={4}
              className="font-mono text-sm max-h-48 overflow-auto resize-y"
            />
          </div>

          <Separator />

          {/* Initial Message */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Initial Message(s)</Label>
              <TokenCounter
                text={initialMessages}
                fieldName="Initial Messages(s)"
              />
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2">
                    {initialMessages.map((_, index) => {
                      const isActive = index === selectedInitialMessageIndex;

                      return (
                        <Button
                          key={index}
                          type="button"
                          variant={isActive ? "secondary" : "outline"}
                          size="sm"
                          className="h-8 cursor-pointer px-3"
                          onClick={() => setSelectedInitialMessageIndex(index)}
                        >
                          Message {index + 1}
                        </Button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Janitor AI supports up to {MAX_INITIAL_MESSAGES} initial
                    messages total.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full cursor-pointer sm:w-auto"
                  onClick={addInitialMessage}
                  disabled={initialMessages.length >= MAX_INITIAL_MESSAGES}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>

              <div className="rounded-md border border-border/60 bg-muted/20 p-3 sm:p-4">
                <div className="flex flex-col gap-3 border-b border-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Label
                      className="block text-sm font-medium"
                      htmlFor={`initial-message-${selectedInitialMessageIndex}`}
                    >
                      Message {selectedInitialMessageIndex + 1} of{" "}
                      {initialMessages.length}
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Markdown is rendered in this message.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="inline-flex w-full rounded-md border bg-background p-1 sm:w-auto">
                      <Button
                        type="button"
                        variant={
                          initialMessageMode === "edit" ? "secondary" : "ghost"
                        }
                        size="sm"
                        className="h-8 flex-1 gap-2 px-3 cursor-pointer sm:flex-none"
                        onClick={() => setInitialMessageMode("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant={
                          initialMessageMode === "preview"
                            ? "secondary"
                            : "ghost"
                        }
                        size="sm"
                        className="h-8 flex-1 gap-2 px-3 cursor-pointer sm:flex-none"
                        onClick={() => setInitialMessageMode("preview")}
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                    </div>
                    {initialMessages.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full px-2 text-destructive cursor-pointer sm:w-auto"
                        onClick={() =>
                          removeInitialMessage(selectedInitialMessageIndex)
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                <div className="pt-3">
                  {initialMessageMode === "edit" ? (
                    <Textarea
                      id={`initial-message-${selectedInitialMessageIndex}`}
                      value={initialMessages[selectedInitialMessageIndex] || ""}
                      onChange={(e) =>
                        updateInitialMessage(
                          selectedInitialMessageIndex,
                          e.target.value,
                        )
                      }
                      placeholder="The opening message {{char}} sends to {{user}}..."
                      rows={7}
                      className="min-h-36 font-mono text-sm max-h-60 overflow-auto resize-y"
                    />
                  ) : (
                    <div className="min-h-36 max-h-60 overflow-auto rounded-md border border-border/60 bg-background p-3">
                      {initialMessages[selectedInitialMessageIndex]?.trim() ? (
                        <MarkdownRenderer
                          content={
                            initialMessages[selectedInitialMessageIndex] || ""
                          }
                          className="text-sm"
                        />
                      ) : (
                        <p className="text-sm italic text-muted-foreground">
                          No message content yet. Switch to Edit to add
                          markdown.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Example Dialogues */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="example-dialogues">Example Dialogues</Label>
              <TokenCounter
                text={exampleDialogues}
                fieldName="Example Dialogues"
              />
            </div>
            <Textarea
              id="example-dialogues"
              value={exampleDialogues}
              onChange={(e) => setExampleDialogues(e.target.value)}
              placeholder="{{user}}: Hello!\n{{char}}: *smiles* Hello there, {{user}}!"
              rows={8}
              className="font-mono text-sm max-h-72 overflow-auto resize-y"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <EyeOff className="h-4 w-4" />
            Profile Privacy
          </CardTitle>
          <CardDescription>
            Hide prompt internals when this bot is shown in profiles and other
            public previews.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                Hide sensitive fields
              </Label>
              <p className="text-xs text-muted-foreground">
                Personality, Initial Message(s), Scenario, and Example Dialogues
                stay hidden in the detail modal.
              </p>
            </div>
            <Switch
              checked={hideSensitiveFields}
              onCheckedChange={setHideSensitiveFields}
            />
          </div>
        </CardContent>
      </Card>

      {/* Token Summary */}
      <TokenSummary
        personality={personality}
        initialMessages={initialMessages}
        scenario={scenario}
        exampleDialogues={exampleDialogues}
      />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {isEditing && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              className="cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Bot
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button type="submit" className="cursor-pointer">
            <Save className="mr-2 h-4 w-4" />
            {isEditing ? "Save Changes" : "Create Bot"}
          </Button>
        </div>
      </div>
    </form>
  );
}
