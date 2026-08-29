export const RESOURCE_TYPES = [
  "guide",
  "article",
  "tool",
  "template",
  "reference",
  "other",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  guide: "Guide",
  article: "Article",
  tool: "Tool",
  template: "Template",
  reference: "Reference",
  other: "Other",
};

export function createResourceSlug(title: string) {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80);

  const suffix = crypto.randomUUID().slice(0, 8);

  return `${base || "resource"}-${suffix}`;
}

export function createResourceExcerpt(markdown: string, maxLength = 220) {
  const text = markdown
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  const shortened = text.slice(0, maxLength).trimEnd();

  const lastSpace = shortened.lastIndexOf(" ");

  return `${lastSpace > 120 ? shortened.slice(0, lastSpace) : shortened}…`;
}
