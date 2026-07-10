// ============================================================================
// JanitorForge - Shared Markdown Renderer
// Lightweight inline+block markdown rendering for use across the app
// ============================================================================

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": String.fromCharCode(38) + "amp;",
  "<": String.fromCharCode(60) + "lt;",
  ">": String.fromCharCode(62) + "gt;",
  '"': String.fromCharCode(34) + "quot;",
  "'": String.fromCharCode(39) + "#39;",
};

function escapeHtml(str: string): string {
  return String(str).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

/** Render markdown to safe HTML (supports bold, italic, links, lists, line breaks) */
export function renderMarkdown(md?: string | null): string {
  if (!md) return "";
  let out = escapeHtml(String(md));

  // Links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, txt, href) => {
    const safe = String(href).trim();
    if (/^\s*(javascript:|data:)/i.test(safe)) return escapeHtml(txt);
    return `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(txt)}</a>`;
  });

  // Color fragments: [text]{#ff00aa}
  out = out.replace(
    /\[([^\]]+)\]\{(#[0-9a-fA-F]{3,6})\}/g,
    (_m, txt, color) => `<span style="color:${color}">${txt}</span>`,
  );

  // Bold
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  out = out.replace(/_(.+?)_/g, "<em>$1</em>");

  // Lists and line breaks
  const lines = out.split(/\r?\n/);
  let result = "";
  let inList = false;
  let listType: "ul" | "ol" | null = null;

  for (const line of lines) {
    const mUn = line.match(/^\s*[-*]\s+(.+)/);
    const mOl = line.match(/^\s*(\d+)\.\s+(.+)/);
    if (mUn || mOl) {
      const thisType = mUn ? "ul" : "ol";
      const content = mUn ? mUn[1] : mOl![2];
      if (!inList || listType !== thisType) {
        if (inList) {
          result += listType === "ul" ? "</ul>" : "</ol>";
        }
        inList = true;
        listType = thisType;
        result += thisType === "ul" ? "<ul>" : "<ol>";
      }
      result += `<li>${content}</li>`;
    } else {
      if (inList) {
        result += listType === "ul" ? "</ul>" : "</ol>";
        inList = false;
        listType = null;
      }
      if (line.trim() === "") {
        result += "<br/>";
      } else {
        result += `<p>${line}</p>`;
      }
    }
  }
  if (inList) result += listType === "ul" ? "</ul>" : "</ol>";

  return result;
}

/** Render inline markdown only (no block elements like <p>, <ul>) */
export function renderMarkdownInline(md?: string | null): string {
  if (!md) return "";
  let out = escapeHtml(String(md));

  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, txt, href) => {
    const safe = String(href).trim();
    if (/^\s*(javascript:|data:)/i.test(safe)) return escapeHtml(txt);
    return `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(txt)}</a>`;
  });

  out = out.replace(
    /\[([^\]]+)\]\{(#[0-9a-fA-F]{3,6})\}/g,
    (_m, txt, color) => `<span style="color:${color}">${txt}</span>`,
  );

  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__(.+?)__/g, "<strong>$1</strong>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  out = out.replace(/_(.+?)_/g, "<em>$1</em>");
  out = out.replace(/\n/g, "<br/>");

  return out;
}
