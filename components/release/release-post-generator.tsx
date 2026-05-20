// ============================================================================
// JanitorForge - Release Post Generator
// Tool for generating formatted release announcements
// ============================================================================

"use client";

import { useState, useMemo } from "react";
import {
  Megaphone,
  Copy,
  Bot as BotIcon,
  Hash,
  Eye,
  Settings2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { generateReleasePost, countBotTokens } from "@/lib/bot-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Bot } from "@/lib/types";

// ----------------------------------------------------------------------------
// Platform Options
// ----------------------------------------------------------------------------

type Platform = "discord" | "reddit" | "general";

const platforms: { id: Platform; label: string; description: string }[] = [
  {
    id: "discord",
    label: "Discord",
    description: "Markdown formatting for Discord",
  },
  { id: "reddit", label: "Reddit", description: "Reddit-style markdown" },
  {
    id: "general",
    label: "General",
    description: "Plain markdown for other platforms",
  },
];

// ----------------------------------------------------------------------------
// Bot Selector Card
// ----------------------------------------------------------------------------

interface BotSelectorProps {
  bot: Bot;
  isSelected: boolean;
  onSelect: () => void;
}

function BotSelectorCard({ bot, isSelected, onSelect }: BotSelectorProps) {
  const tokenCount = useMemo(() => countBotTokens(bot), [bot]);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50",
        isSelected && "border-primary bg-primary/5 ring-1 ring-primary/20",
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              isSelected ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            {isSelected ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <BotIcon className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">{bot.name}</h4>
              <Badge
                variant={bot.rating === "SFW" ? "secondary" : "destructive"}
                className="shrink-0"
              >
                {bot.rating}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
              {bot.shortDescription || "No description"}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {tokenCount.toLocaleString()} tokens
              </span>
              <span>|</span>
              <span>{bot.tags.slice(0, 2).join(", ")}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Post Preview Component
// ----------------------------------------------------------------------------

interface PostPreviewProps {
  content: string;
  platform: Platform;
}

function PostPreview({ content, platform }: PostPreviewProps) {
  // Simple markdown preview - convert basic markdown to styled elements
  const formattedContent = useMemo(() => {
    let html = content;

    // Headers
    html = html.replace(
      /^# (.+)$/gm,
      '<h1 class="text-2xl font-bold mb-2">$1</h1>',
    );
    html = html.replace(
      /^## (.+)$/gm,
      '<h2 class="text-xl font-semibold mb-2">$1</h2>',
    );

    // Bold
    html = html.replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="font-semibold">$1</strong>',
    );

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');

    // Code blocks
    html = html.replace(
      /```/g,
      '<div class="border-t border-b border-border my-2 py-2">',
    );

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>');

    // Line breaks
    html = html.replace(/\n/g, "<br />");

    // Hashtags
    html = html.replace(/#(\w+)/g, '<span class="text-primary">#$1</span>');

    return html;
  }, [content]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </CardTitle>
          <Badge variant="outline">
            {platforms.find((p) => p.id === platform)?.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] rounded-lg bg-muted/30 p-4">
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Empty State
// ----------------------------------------------------------------------------

function EmptyState() {
  const { setCurrentView } = useStore();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Megaphone className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mt-6 text-xl font-semibold">No bots to announce</h3>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Create some bots first, then come back here to generate release posts
        for them.
      </p>
      <Button className="mt-6" onClick={() => setCurrentView("bots")}>
        <BotIcon className="mr-2 h-4 w-4" />
        Go to Bot Manager
      </Button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Release Post Generator Component
// ----------------------------------------------------------------------------

export function ReleasePostGenerator() {
  const { bots } = useStore();

  // State
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>("discord");
  const [includeStats, setIncludeStats] = useState(true);
  const [includePreview, setIncludePreview] = useState(true);

  // Get selected bot
  const selectedBot = selectedBotId
    ? bots.find((b) => b.id === selectedBotId)
    : null;

  // Generate post content
  const postContent = useMemo(() => {
    if (!selectedBot) return "";
    return generateReleasePost(selectedBot, {
      platform,
      includeStats,
      includePreview,
    });
  }, [selectedBot, platform, includeStats, includePreview]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(postContent);
      toast.success("Post copied to clipboard!");
    } catch {
      toast.error("Failed to copy post");
    }
  };

  if (bots.length === 0) {
    return (
      <div className="p-8 lg:p-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Release Post Generator
          </h1>
          <p className="mt-1 text-muted-foreground">
            Generate beautifully formatted release announcements for your bots
          </p>
        </div>
        <Card>
          <EmptyState />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Release Post Generator
        </h1>
        <p className="mt-1 text-muted-foreground">
          Generate beautifully formatted release announcements for your bots
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Bot Selection & Settings */}
        <div className="space-y-6">
          {/* Bot Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select a Bot</CardTitle>
              <CardDescription>
                Choose which bot to generate a release post for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {bots.map((bot) => (
                    <BotSelectorCard
                      key={bot.id}
                      bot={bot}
                      isSelected={selectedBotId === bot.id}
                      onSelect={() => setSelectedBotId(bot.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Post Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Platform */}
              <div className="space-y-2">
                <Label>Platform</Label>
                <Tabs
                  value={platform}
                  onValueChange={(v) => setPlatform(v as Platform)}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    {platforms.map((p) => (
                      <TabsTrigger key={p.id} value={p.id}>
                        {p.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <p className="text-xs text-muted-foreground">
                  {platforms.find((p) => p.id === platform)?.description}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-stats" className="cursor-pointer">
                    Include token stats
                  </Label>
                  <Switch
                    id="include-stats"
                    checked={includeStats}
                    onCheckedChange={setIncludeStats}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-preview" className="cursor-pointer">
                    Include scenario preview
                  </Label>
                  <Switch
                    id="include-preview"
                    checked={includePreview}
                    onCheckedChange={setIncludePreview}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview & Copy */}
        <div className="space-y-4">
          {selectedBot ? (
            <>
              <PostPreview content={postContent} platform={platform} />
              <Button className="w-full" size="lg" onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </Button>
            </>
          ) : (
            <Card className="h-[500px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Select a bot to see the preview</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
