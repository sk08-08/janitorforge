// ============================================================================
// JanitorForge - Atlas Utility Functions
// Mappers, converters, and helper functions for Atlas
// ============================================================================

import type {
  AtlasWorld,
  AtlasWorldRow,
  AtlasLorebook,
  AtlasLorebookRow,
  AtlasEntry,
  AtlasEntryRow,
  AtlasWorldKind,
  AtlasWorldStatus,
  AtlasEntryKind,
  LorebookPackage,
  JanitorLorebookEntry,
} from "./atlas-types";

// ---------------------------------------------------------------------------
// Display labels and badges
// ---------------------------------------------------------------------------

export const worldKindLabels: Record<AtlasWorldKind, string> = {
  series: "Series",
  universe: "Universe",
  location: "Location",
  timeline: "Timeline",
};

export const worldKindBadges: Record<AtlasWorldKind, string> = {
  series: "bg-primary/10 text-primary",
  universe: "bg-chart-2/10 text-chart-2",
  location: "bg-chart-4/10 text-chart-4",
  timeline: "bg-success/10 text-success",
};

export const entryKindLabels: Record<AtlasEntryKind, string> = {
  lore: "Lore",
  character: "Character",
  location: "Location",
  timeline: "Timeline",
  note: "Note",
};

export const entryKindBadges: Record<AtlasEntryKind, string> = {
  lore: "bg-primary/10 text-primary",
  character: "bg-chart-2/10 text-chart-2",
  location: "bg-chart-4/10 text-chart-4",
  timeline: "bg-success/10 text-success",
  note: "bg-muted text-muted-foreground",
};

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

export const WORLDS_PER_PAGE = 4;
export const WORLD_CARD_HEIGHT = 88;
export const WORLD_LIST_GAP = 12;
export const WORLD_LIST_PADDING = 24;
export const WORLD_LIST_MAX_HEIGHT = 560;
export const WORLD_LIST_MIN_HEIGHT = 160;
export const PAGINATION_HEIGHT = 56;
export const LOREBOOK_LIST_HEIGHT = 288;
export const LOREBOOK_CARD_HEIGHT = 140;
export const LOREBOOK_LIST_GAP = 8;
export const LOREBOOK_LIST_PADDING = 12;

export const LEGACY_ATLAS_STORAGE_KEY = "janitorforge-atlas-worlds";

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Row mappers (DB ↔ App)
// ---------------------------------------------------------------------------

export function mapWorldRow(row: AtlasWorldRow): AtlasWorld {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    kind: row.kind,
    status: row.status,
    description: row.description || "",
    loreSummary: row.lore_summary || "",
    botIds: Array.isArray(row.bot_ids) ? row.bot_ids : [],
    featuredLorebookIds: Array.isArray(row.featured_lorebook_ids)
      ? row.featured_lorebook_ids
      : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapLorebookRow(row: AtlasLorebookRow): AtlasLorebook {
  return {
    id: row.id,
    worldId: row.world_id,
    title: row.title,
    summary: row.summary || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEntryRow(row: AtlasEntryRow): AtlasEntry {
  return {
    id: row.id,
    worldId: row.world_id,
    lorebookId: row.lorebook_id,
    title: row.title,
    kind: row.kind,
    body: row.body || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildWorldRow(
  world: AtlasWorld,
  userId: string,
): AtlasWorldRow {
  return {
    id: world.id,
    user_id: userId,
    title: world.title,
    slug: world.slug,
    kind: world.kind,
    status: world.status,
    description: world.description,
    lore_summary: world.loreSummary,
    bot_ids: world.botIds,
    featured_lorebook_ids: world.featuredLorebookIds,
    created_at: world.createdAt,
    updated_at: world.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Entry default state factories
// ---------------------------------------------------------------------------

export function createEmptyWorldEditorState() {
  return {
    title: "",
    slug: "",
    kind: "series" as AtlasWorldKind,
    status: "draft" as AtlasWorldStatus,
    description: "",
    loreSummary: "",
    botIds: [] as string[],
    featuredLorebookIds: [] as string[],
  };
}

export function createEmptyEntryEditorState(worldId = "", lorebookId = "") {
  return {
    worldId,
    lorebookId,
    title: "",
    kind: "note" as AtlasEntryKind,
    body: "",
  };
}

// ---------------------------------------------------------------------------
// Import metadata stripping
// ---------------------------------------------------------------------------

export function stripImportedMetadataBlock(body: string): string {
  const marker = "\n\n---\nImported metadata";
  const markerIndex = body.indexOf(marker);
  if (markerIndex === -1) return body;
  return body.slice(0, markerIndex).trimEnd();
}

// ---------------------------------------------------------------------------
// Janitor lorebook category mapping
// ---------------------------------------------------------------------------

export function mapEntryKindToJanitorCategory(kind: AtlasEntryKind): string {
  switch (kind) {
    case "character":
      return "character";
    case "location":
      return "place";
    case "timeline":
      return "timeline";
    case "lore":
      return "world_info";
    default:
      return "other";
  }
}

export function mapJanitorCategoryToEntryKind(
  category?: string,
): AtlasEntryKind {
  switch (category?.toLowerCase()) {
    case "character":
      return "character";
    case "place":
    case "location":
      return "location";
    case "world_info":
    case "faction":
    case "event":
    case "other":
      return "lore";
    case "timeline":
      return "timeline";
    default:
      return "note";
  }
}

export function buildImportedEntryBody(entry: JanitorLorebookEntry): string {
  return entry.content?.trim() || "";
}

// ---------------------------------------------------------------------------
// Export format builders
// ---------------------------------------------------------------------------

export function isAtlasPackage(
  value: unknown,
): value is Partial<LorebookPackage> {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "entries" in value,
  );
}

export function createJanitorLorebookExport(lorebookEntries: AtlasEntry[]) {
  return lorebookEntries.map((entry, index) => {
    const title = entry.title?.trim() || `Entry ${index + 1}`;
    const content = entry.body?.trim() || "";
    const titleLower = title.toLowerCase();
    const keywords = Array.from(new Set([title, titleLower]));
    const category = mapEntryKindToJanitorCategory(entry.kind);

    return {
      activationMode: "standard",
      activationScript: "",
      case_sensitive: false,
      category,
      comment: "",
      constant: false,
      content,
      depth: 4,
      enabled: true,
      extensions: { excludeRecursion: true },
      groupWeight: 100,
      id: index + 1,
      inclusionGroupRaw: "",
      insertion_order: (index + 1) * 100,
      key: keywords,
      keyMatchPriority: false,
      keysecondary: [],
      keysecondaryRaw: "",
      keysRaw: keywords.join(", "),
      matchWholeWords: true,
      minMessages: 0,
      name: title,
      prioritizeInclusion: false,
      priority: index + 1,
      probability: 100,
      selectiveLogic: 0,
      tags: [category],
      keywordsRaw: keywords.join(", "),
    };
  });
}

export function createLorebookPackage(
  world: AtlasWorld,
  lorebook: AtlasLorebook,
  lorebookEntries: AtlasEntry[],
): LorebookPackage {
  return {
    version: 1,
    world: {
      title: world.title,
      slug: world.slug,
      kind: world.kind,
      status: world.status,
      description: world.description,
      loreSummary: world.loreSummary,
      botIds: world.botIds,
      featuredLorebookIds: world.featuredLorebookIds,
    },
    entries: lorebookEntries.map((entry) => ({
      title: entry.title,
      kind: entry.kind,
      body: entry.body,
    })),
  };
}
