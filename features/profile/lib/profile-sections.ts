export type ProfileSectionKey =
  | "featured_bots"
  | "bots"
  | "creator_pages"
  | "worlds"
  | "forms";

export type ProfileSectionSelectionMode = "all" | "selected";

export interface ProfileSection {
  sectionKey: ProfileSectionKey;
  enabled: boolean;
  sortOrder: number;
  selectionMode: ProfileSectionSelectionMode;
  config: Record<string, unknown>;
}

export interface ProfileSectionRow {
  section_key: string;
  enabled: boolean;
  sort_order: number;
  selection_mode: string;
  config: unknown;
}

export interface ProfileSectionBotRow {
  bot_id: string;
  sort_order: number;
}

export interface ProfileSectionFormRow {
  form_id: string;
  sort_order: number;
}

export interface ProfileSectionCreatorPageRow {
  creator_page_id: string;
  sort_order: number;
}

export interface ProfileSectionWorldRow {
  world_id: string;
  sort_order: number;
}

export interface PublicProfileSectionSelectionRow {
  section_key: string;
  item_id: string;
  sort_order: number;
}

export function getOrderedProfileSectionIds<T>(
  rows: T[] | null | undefined,
  getId: (row: T) => string,
  getSortOrder: (row: T) => number,
): string[] {
  return [...(rows || [])]
    .sort((a, b) => getSortOrder(a) - getSortOrder(b))
    .map(getId)
    .filter(Boolean);
}

export function getPublicProfileSectionSelectedIds(
  rows: PublicProfileSectionSelectionRow[] | null | undefined,
  sectionKey: ProfileSectionKey,
): string[] {
  return [...(rows || [])]
    .filter((row) => row.section_key === sectionKey)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => row.item_id)
    .filter(Boolean);
}

export function applyProfileSectionSelection<T extends { id: string }>(
  items: T[] | null | undefined,
  section: ProfileSection,
  selectedIds: string[] | null | undefined,
): T[] {
  const safeItems = [...(items || [])];

  if (section.selectionMode === "all") {
    return safeItems;
  }

  const orderById = new Map(
    (selectedIds || []).map((id, index) => [id, index]),
  );

  return safeItems
    .filter((item) => orderById.has(item.id))
    .sort(
      (a, b) =>
        (orderById.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (orderById.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
}

const DEFAULT_SECTIONS: ProfileSection[] = [
  {
    sectionKey: "featured_bots",
    enabled: true,
    sortOrder: 10,
    selectionMode: "selected",
    config: {},
  },
  {
    sectionKey: "bots",
    enabled: true,
    sortOrder: 20,
    selectionMode: "all",
    config: {},
  },
  {
    sectionKey: "creator_pages",
    enabled: true,
    sortOrder: 30,
    selectionMode: "all",
    config: {},
  },
  {
    sectionKey: "worlds",
    enabled: true,
    sortOrder: 40,
    selectionMode: "all",
    config: {},
  },
  {
    sectionKey: "forms",
    enabled: true,
    sortOrder: 50,
    selectionMode: "all",
    config: {},
  },
];

function isSectionKey(value: string): value is ProfileSectionKey {
  return DEFAULT_SECTIONS.some((section) => section.sectionKey === value);
}

function normalizeConfig(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeSelectionMode(
  value: string,
  fallback: ProfileSectionSelectionMode,
): ProfileSectionSelectionMode {
  return value === "selected" || value === "all" ? value : fallback;
}

function legacyEnabled(theme: Record<string, unknown>, key: string): boolean {
  const value = theme[key];
  return value !== false && value !== "false";
}

export function resolveProfileSections(
  rows: ProfileSectionRow[] | null | undefined,
  theme: Record<string, unknown> | null | undefined,
): ProfileSection[] {
  const safeTheme = theme || {};
  const rowsByKey = new Map(
    (rows || [])
      .filter((row) => isSectionKey(row.section_key))
      .map((row) => [row.section_key, row]),
  );

  return DEFAULT_SECTIONS.map((defaults) => {
    const row = rowsByKey.get(defaults.sectionKey);

    if (row) {
      return {
        sectionKey: defaults.sectionKey,
        enabled: row.enabled,
        sortOrder: row.sort_order,
        selectionMode: normalizeSelectionMode(
          row.selection_mode,
          defaults.selectionMode,
        ),
        config: normalizeConfig(row.config),
      };
    }

    const legacyThemeKey =
      defaults.sectionKey === "featured_bots"
        ? "showFeatured"
        : defaults.sectionKey === "bots"
          ? "showBots"
          : defaults.sectionKey === "creator_pages"
            ? "showCreatorPages"
            : defaults.sectionKey === "worlds"
              ? "showWorlds"
              : "showForms";

    return {
      ...defaults,
      enabled: legacyEnabled(safeTheme, legacyThemeKey),
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export type ProfileSectionAudience = "owner" | "visitor";

export function getProfileSectionEmptyCopy(
  section: ProfileSection,
  audience: ProfileSectionAudience,
): {
  title: string;
  description?: string;
} {
  const selected = section.selectionMode === "selected";

  if (audience === "owner") {
    switch (section.sectionKey) {
      case "featured_bots":
        return {
          title: "No featured bots selected",
          description:
            "Choose up to 5 bots in the profile editor to highlight them here.",
        };

      case "bots":
        return selected
          ? {
              title: "No bots selected",
              description:
                "Choose bots in the profile editor or switch this section back to All.",
            }
          : {
              title: "No bots yet",
              description: "Create a bot and it can appear here automatically.",
            };

      case "creator_pages":
        return selected
          ? {
              title: "No creator pages selected",
              description:
                "Choose Creator Pages in the profile editor or switch this section back to All.",
            }
          : {
              title: "No creator pages yet",
              description:
                "Create a Creator Page and it can appear here automatically.",
            };

      case "worlds":
        return selected
          ? {
              title: "No worlds selected",
              description:
                "Choose Worlds in the profile editor or switch this section back to All.",
            }
          : {
              title: "No worlds yet",
              description:
                "Create a World and it can appear here automatically.",
            };

      case "forms":
        return selected
          ? {
              title: "No forms selected",
              description:
                "Choose Forms in the profile editor or switch this section back to All.",
            }
          : {
              title: "No forms yet",
              description:
                "Create a form and it can appear here automatically.",
            };
    }
  }

  switch (section.sectionKey) {
    case "featured_bots":
      return {
        title: "No featured bots yet",
        description:
          "This creator hasn't featured any bots on their profile yet.",
      };

    case "bots":
      return {
        title: "No bots to show",
        description:
          "This creator doesn't have any bots available on their profile right now.",
      };

    case "creator_pages":
      return {
        title: "No creator pages to show",
        description:
          "This creator doesn't have any Creator Pages available on their profile right now.",
      };

    case "worlds":
      return {
        title: "No worlds to show",
        description:
          "This creator doesn't have any Worlds available on their profile right now.",
      };

    case "forms":
      return {
        title: "No forms to show",
        description:
          "This creator doesn't have any Forms available on their profile right now.",
      };
  }
}

export function getProfileSection(
  sections: ProfileSection[],
  key: ProfileSectionKey,
): ProfileSection {
  return (
    sections.find((section) => section.sectionKey === key) ??
    DEFAULT_SECTIONS.find((section) => section.sectionKey === key)!
  );
}
