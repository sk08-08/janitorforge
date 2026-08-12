export function normalizeHttpUrl(input: string): string | null {
  const value = String(input || "").trim();

  if (!value) return null;

  try {
    const normalized = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)
      ? value
      : `https://${value}`;

    const url = new URL(normalized);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
