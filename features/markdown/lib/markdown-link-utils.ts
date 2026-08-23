const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeMarkdownLinkUrl(input: string): string | null {
  const value = input.trim();

  if (!value) {
    return null;
  }

  if (EMAIL_PATTERN.test(value)) {
    return `mailto:${value}`;
  }

  if (/^mailto:/i.test(value)) {
    try {
      const url = new URL(value);

      return url.protocol === "mailto:" ? value : null;
    } catch {
      return null;
    }
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) {
    try {
      const url = new URL(value);

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
      }

      return url.toString();
    } catch {
      return null;
    }
  }

  try {
    const url = new URL(`https://${value}`);

    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
