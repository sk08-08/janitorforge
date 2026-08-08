// ============================================================================
// JanitorForge - Atlas Type Definitions
// Shared types for Atlas worldbuilding system
// ============================================================================

export type AtlasWorldKind = "series" | "universe" | "location" | "timeline";
export type AtlasWorldStatus = "draft" | "active";
export type AtlasEntryKind =
  | "lore"
  | "character"
  | "location"
  | "timeline"
  | "note";

export interface AtlasWorld {
  id: string;
  title: string;
  slug: string;
  kind: AtlasWorldKind;
  status: AtlasWorldStatus;
  description: string;
  loreSummary: string;
  botIds: string[];
  featuredLorebookIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AtlasWorldRow {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  kind: AtlasWorldKind;
  status: AtlasWorldStatus;
  description: string;
  lore_summary: string;
  active_atlas_world_bots?: Array<{ bot_id: string }>;
  active_atlas_world_featured_lorebooks?: Array<{ lorebook_id: string }>;
  created_at: string;
  updated_at: string;
}

export interface AtlasLorebook {
  id: string;
  worldId: string | null;
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface AtlasLorebookRow {
  id: string;
  user_id: string;
  world_id: string | null;
  title: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface AtlasEntry {
  id: string;
  worldId: string | null;
  lorebookId: string;
  title: string;
  kind: AtlasEntryKind;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface AtlasEntryRow {
  id: string;
  user_id: string;
  world_id: string | null;
  lorebook_id: string;
  title: string;
  kind: AtlasEntryKind;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface WorldEditorState {
  id?: string;
  title: string;
  slug: string;
  kind: AtlasWorldKind;
  status: AtlasWorldStatus;
  description: string;
  loreSummary: string;
  botIds: string[];
  featuredLorebookIds: string[];
}

export interface EntryEditorState {
  id?: string;
  worldId: string;
  lorebookId: string;
  title: string;
  kind: AtlasEntryKind;
  body: string;
}

export interface LorebookPackage {
  version: number;
  world?: {
    title: string;
    slug: string;
    kind: AtlasWorldKind;
    status: AtlasWorldStatus;
    description: string;
    loreSummary: string;
    botIds: string[];
    featuredLorebookIds: string[];
  };
  entries: Array<{
    title: string;
    kind: AtlasEntryKind;
    body: string;
  }>;
}

export interface JanitorLorebookEntry {
  name?: string;
  content?: string;
  category?: string;
  comment?: string;
  depth?: number;
  priority?: number;
  insertion_order?: number;
  activationMode?: string;
  keysRaw?: string;
  keywordsRaw?: string;
}
