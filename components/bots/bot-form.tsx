// ============================================================================
// JanitorForge - Bot Form Component
// Advanced bot creation and editing form with validation
// ============================================================================

"use client";

import { useState, useCallback, useEffect } from "react";
import { X, Plus, Upload, Download, Save, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { TokenCounter, TokenSummary } from "./token-counter";
import { cn } from "@/lib/utils";
import type { BotFormData } from "@/lib/types";
import {
  exportCharacterCardPNG,
  importCharacterCardPNG,
  characterCardToBot,
} from "@/lib/bot-utils";
import { toast } from "sonner";

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
  const [scenario, setScenario] = useState(initialData?.scenario || "");
  const [exampleDialogues, setExampleDialogues] = useState(
    initialData?.exampleDialogues || "",
  );
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [rating, setRating] = useState<"SFW" | "NSFW">(
    initialData?.rating || "SFW",
  );
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
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

  const normalizeInitialMessages = useCallback(
    () => initialMessages.map((message) => message.trim()).filter(Boolean),
    [initialMessages],
  );

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
          setRating(botData.rating);
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
    <form onSubmit={handleSubmit} className="space-y-6 p-4 lg:p-6">
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
          Import Card V2
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
          Export Card V2
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Core details about your bot character
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label htmlFor="image-url">
              Image URL
              <span className="ml-1 text-xs text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="image-url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/bot-image.png"
            />
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
        <CardContent className="space-y-6">
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

          {/* Initial Messages */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Initial Messages</Label>
              <TokenCounter
                text={initialMessages}
                fieldName="Initial Messages"
              />
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-1 flex-wrap gap-2">
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
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={addInitialMessage}
                  disabled={initialMessages.length >= MAX_INITIAL_MESSAGES}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
                <p className="w-full text-xs text-muted-foreground">
                  Janitor AI supports up to {MAX_INITIAL_MESSAGES} initial
                  messages total.
                </p>
              </div>

              <div className="space-y-2 rounded-md bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label
                    htmlFor={`initial-message-${selectedInitialMessageIndex}`}
                  >
                    Message {selectedInitialMessageIndex + 1} of{" "}
                    {initialMessages.length}
                  </Label>
                  {initialMessages.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-destructive cursor-pointer"
                      onClick={() =>
                        removeInitialMessage(selectedInitialMessageIndex)
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
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
                  rows={6}
                  className="font-mono text-sm max-h-56 overflow-auto resize-y"
                />
              </div>
            </div>
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
