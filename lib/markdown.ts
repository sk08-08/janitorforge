// ============================================================================
// JanitorForge - Markdown Utilities
// ============================================================================

/** Strip markdown syntax and return plain text for compact UI labels. */
export function stripMarkdownToText(md?: string | null): string {
  if (!md) return "";

  let text = String(md);

  text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\{#[0-9a-fA-F]{3,8}\}/g, "$1");
  text = text.replace(/`{3}[\s\S]*?`{3}/g, " ");
  text = text.replace(/`([^`]+)`/g, "$1");

  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  text = text.replace(/^\s{0,3}>\s?/gm, "");
  text = text.replace(/^\s{0,3}[-*+]\s+/gm, "");
  text = text.replace(/^\s{0,3}\d+\.\s+/gm, "");
  text = text.replace(/\*\*|__|\*|_|~~/g, "");

  return text.replace(/\s+/g, " ").trim();
}
