import type { SectionKind } from "@/features/creator-pages/types/creator-page-types";

export const CREATOR_PAGE_SCHEMA_VERSION = 1 as const;

export type CreatorPageBlockCategory =
  | "content"
  | "creator"
  | "media"
  | "interactive"
  | "layout";

export type CreatorPageBlockResource =
  | "bots"
  | "worlds"
  | "lorebooks"
  | "forms";

export interface CreatorPageBlockDefinition {
  label: string;
  category: CreatorPageBlockCategory;
  resources: readonly CreatorPageBlockResource[];
  capabilities: {
    anchor: boolean;
    motion: boolean;
    children: boolean;
  };
}

export const CREATOR_PAGE_BLOCK_REGISTRY: Record<
  SectionKind,
  CreatorPageBlockDefinition
> = {
  hero: {
    label: "Hero Section",
    category: "content",
    resources: [],
    capabilities: { anchor: true, motion: true, children: false },
  },
  banner: {
    label: "Banner",
    category: "content",
    resources: [],
    capabilities: { anchor: true, motion: true, children: false },
  },
  bot_showcase: {
    label: "Bot Showcase",
    category: "creator",
    resources: ["bots"],
    capabilities: { anchor: true, motion: true, children: false },
  },
  bot_group: {
    label: "Bot Group",
    category: "creator",
    resources: ["bots"],
    capabilities: { anchor: true, motion: true, children: false },
  },
  world_showcase: {
    label: "World Showcase",
    category: "creator",
    resources: ["worlds"],
    capabilities: { anchor: true, motion: true, children: false },
  },
  lorebook_gallery: {
    label: "Lorebook Gallery",
    category: "creator",
    resources: ["worlds", "lorebooks"],
    capabilities: { anchor: true, motion: true, children: false },
  },
  text_block: {
    label: "Text Block",
    category: "content",
    resources: [],
    capabilities: { anchor: true, motion: true, children: false },
  },
  gallery: {
    label: "Image Gallery",
    category: "media",
    resources: [],
    capabilities: { anchor: true, motion: true, children: false },
  },
  sticker: {
    label: "Image",
    category: "media",
    resources: [],
    capabilities: { anchor: true, motion: true, children: false },
  },
  embed: {
    label: "Embed (YouTube/Twitch)",
    category: "media",
    resources: [],
    capabilities: { anchor: true, motion: true, children: false },
  },
  form: {
    label: "Request Form",
    category: "interactive",
    resources: ["forms"],
    capabilities: { anchor: true, motion: true, children: false },
  },
  social_links: {
    label: "Social Links",
    category: "interactive",
    resources: [],
    capabilities: { anchor: true, motion: true, children: false },
  },
  divider: {
    label: "Divider",
    category: "layout",
    resources: [],
    capabilities: { anchor: true, motion: true, children: false },
  },
  spacer: {
    label: "Spacer",
    category: "layout",
    resources: [],
    capabilities: { anchor: true, motion: false, children: false },
  },
};

export const sectionKindLabels: Record<SectionKind, string> = Object.fromEntries(
  Object.entries(CREATOR_PAGE_BLOCK_REGISTRY).map(([kind, definition]) => [
    kind,
    definition.label,
  ]),
) as Record<SectionKind, string>;

export function getCreatorPageBlockDefinition(
  kind: SectionKind,
): CreatorPageBlockDefinition {
  return CREATOR_PAGE_BLOCK_REGISTRY[kind];
}

export function getSectionDisplayTitle(section: { title: string }): string {
  return section.title;
}
