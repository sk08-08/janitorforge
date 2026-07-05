"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Bot, Globe2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

type WorldRow = {
  id: string;
  title: string;
  kind: "series" | "universe" | "location" | "timeline";
  description: string;
  bot_ids: string[];
  updated_at: string;
};

type BotRow = {
  id: string;
  name: string;
  short_description: string | null;
  rating: "SFW" | "NSFW";
  tags: string[] | null;
  updated_at: string;
};

const worldKindLabels: Record<WorldRow["kind"], string> = {
  series: "Series",
  universe: "Universe",
  location: "Location",
  timeline: "Timeline",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function AtlasBotSeriesPage() {
  const [loading, setLoading] = useState(true);
  const [worlds, setWorlds] = useState<WorldRow[]>([]);
  const [bots, setBots] = useState<BotRow[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const supabase = createClient();
        const access = await getCurrentUserAccess(supabase);
        const userId = access.user?.id ?? null;

        if (!mounted) return;

        if (!userId) {
          toast.error("Sign in to view Atlas bot series");
          setWorlds([]);
          setBots([]);
          return;
        }

        const [
          { data: worldData, error: worldError },
          { data: botData, error: botError },
        ] = await Promise.all([
          supabase
            .from("atlas_worlds")
            .select("id,title,kind,description,bot_ids,updated_at")
            .eq("user_id", userId)
            .is("deleted_at", null)
            .order("updated_at", { ascending: false }),
          supabase
            .from("bots")
            .select("id,name,short_description,rating,tags,updated_at")
            .eq("user_id", userId)
            .is("deleted_at", null)
            .order("updated_at", { ascending: false }),
        ]);

        if (worldError) throw worldError;
        if (botError) throw botError;
        if (!mounted) return;

        setWorlds(Array.isArray(worldData) ? (worldData as WorldRow[]) : []);
        setBots(Array.isArray(botData) ? (botData as BotRow[]) : []);
      } catch (error) {
        console.error("Failed to load bot series page:", error);
        toast.error("Could not load bots by world");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const botMap = useMemo(
    () => new Map(bots.map((bot) => [bot.id, bot])),
    [bots],
  );

  const worldsWithBots = useMemo(() => {
    const normalizedQuery = normalize(query);

    return worlds
      .map((world) => {
        const linkedBots = (Array.isArray(world.bot_ids) ? world.bot_ids : [])
          .map((botId) => botMap.get(botId))
          .filter((bot): bot is BotRow => Boolean(bot));

        return { world, linkedBots };
      })
      .filter(({ world, linkedBots }) => {
        if (!normalizedQuery) return true;

        const worldText = normalize(
          `${world.title} ${worldKindLabels[world.kind]} ${world.description || ""}`,
        );

        if (worldText.includes(normalizedQuery)) return true;

        return linkedBots.some((bot) => {
          const botText = normalize(
            `${bot.name} ${bot.short_description || ""} ${(bot.tags || []).join(" ")}`,
          );
          return botText.includes(normalizedQuery);
        });
      });
  }, [worlds, botMap, query]);

  const assignedBotIds = useMemo(
    () =>
      new Set(
        worlds.flatMap((world) =>
          Array.isArray(world.bot_ids) ? world.bot_ids : [],
        ),
      ),
    [worlds],
  );

  const unassignedBots = useMemo(
    () => bots.filter((bot) => !assignedBotIds.has(bot.id)),
    [bots, assignedBotIds],
  );

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:p-6 md:p-8">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading bot series...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 md:p-8">
      <div className="rounded-2xl border border-border/70 bg-linear-to-br from-primary/10 via-background to-chart-2/10 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Atlas Bot Series
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Bots grouped by worlds
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Review which bots are attached to each Atlas world and quickly
              spot gaps.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Worlds
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold tracking-tight sm:text-3xl">
            {worlds.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Bots linked
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold tracking-tight sm:text-3xl">
            {bots.length - unassignedBots.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Bots unassigned
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold tracking-tight sm:text-3xl">
            {unassignedBots.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total bots
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold tracking-tight sm:text-3xl">
            {bots.length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by world, bot name, description or tags"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {worldsWithBots.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No worlds match your search.
            </CardContent>
          </Card>
        ) : (
          worldsWithBots.map(({ world, linkedBots }) => (
            <Card key={world.id} className="overflow-hidden border-border/70">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold">
                        {world.title}
                      </h2>
                      <Badge variant="secondary">
                        {worldKindLabels[world.kind]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {world.description || "No description yet."}
                    </p>
                  </div>
                  <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground">
                    <Globe2 className="h-3.5 w-3.5" />
                    {linkedBots.length} bots linked
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                {linkedBots.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                    No bots linked to this world yet.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {linkedBots.map((bot) => (
                      <div
                        key={bot.id}
                        className="rounded-xl border border-border/70 bg-card/80 p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {bot.name}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {bot.short_description || "No short description"}
                            </div>
                          </div>
                          <Badge variant="outline">{bot.rating}</Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(bot.tags || []).slice(0, 4).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[11px]"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {unassignedBots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unassigned bots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {unassignedBots.map((bot) => (
                <div
                  key={bot.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/10 px-3 py-2"
                >
                  <div className="min-w-0 truncate text-sm">{bot.name}</div>
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
