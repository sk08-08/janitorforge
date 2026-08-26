import type { CSSProperties } from "react";

export type ProfileLayout = "grid" | "list" | "showcase";
export type ProfileCardStyle = "default" | "bordered" | "minimal" | "glass";
export type ProfileFontFamily = "default" | "serif" | "mono" | "display";
export type ProfileBackground = "default" | "dark" | "ambient" | "minimal";

export interface ResolvedProfileTheme {
  primaryColor: string;
  accentColor: string;
  avatarBorderColor: string;
  layout: ProfileLayout;
  cardStyle: ProfileCardStyle;
  fontFamily: ProfileFontFamily;
  profileBackground: ProfileBackground;
  showStats: boolean;
  showBadges: boolean;
  hideCompletenessNudge: boolean;
}

function isHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function asString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function getReadableProfileAccentColor(
  color: string,
  intensity: "strong" | "medium" | "soft" = "strong",
): string {
  if (!isHexColor(color)) return "var(--foreground)";

  const mixPercentage =
    intensity === "strong" ? 58 : intensity === "medium" ? 46 : 34;

  return `color-mix(in oklab, ${color} ${mixPercentage}%, var(--foreground))`;
}

export function getReadableProfileMutedAccentColor(color: string): string {
  if (!isHexColor(color)) return "var(--muted-foreground)";
  return `color-mix(in oklab, ${color} 42%, var(--muted-foreground))`;
}

export function getProfileBorderTintColor(
  color: string,
  strength = 34,
): string {
  if (!isHexColor(color)) {
    return "color-mix(in oklab, var(--border) 82%, transparent)";
  }

  const ratio = Math.max(10, Math.min(70, Math.trunc(strength)));
  return `color-mix(in oklab, ${color} ${ratio}%, transparent)`;
}

export function getProfileBackgroundTintColor(
  color: string,
  strength = 16,
): string {
  if (!isHexColor(color)) {
    return "color-mix(in oklab, var(--muted) 50%, transparent)";
  }

  const ratio = Math.max(6, Math.min(40, Math.trunc(strength)));
  return `color-mix(in oklab, ${color} ${ratio}%, transparent)`;
}

function asBooleanDefaultTrue(value: unknown): boolean {
  return value !== false && value !== "false";
}

function asBooleanDefaultFalse(value: unknown): boolean {
  return value === true || value === "true";
}

export function resolveProfileTheme(
  rawTheme: Record<string, unknown> | null | undefined,
): ResolvedProfileTheme {
  const theme = rawTheme || {};

  const primaryColor = asString(theme.primaryColor, "#7c3aed");
  const accentColor = asString(theme.accentColor, "#a78bfa");

  const layoutRaw = asString(theme.layout, "grid");
  const cardStyleRaw = asString(theme.cardStyle, "default");
  const fontFamilyRaw = asString(theme.fontFamily, "default");
  const profileBackgroundRaw = asString(theme.profileBackground, "default");

  const layout: ProfileLayout =
    layoutRaw === "list" || layoutRaw === "showcase" ? layoutRaw : "grid";
  const cardStyle: ProfileCardStyle =
    cardStyleRaw === "bordered" ||
    cardStyleRaw === "minimal" ||
    cardStyleRaw === "glass"
      ? cardStyleRaw
      : "default";
  const fontFamily: ProfileFontFamily =
    fontFamilyRaw === "serif" ||
    fontFamilyRaw === "mono" ||
    fontFamilyRaw === "display"
      ? fontFamilyRaw
      : "default";
  const profileBackground: ProfileBackground =
    profileBackgroundRaw === "dark" ||
    profileBackgroundRaw === "ambient" ||
    profileBackgroundRaw === "minimal"
      ? profileBackgroundRaw
      : "default";

  return {
    primaryColor,
    accentColor,
    avatarBorderColor: asString(theme.avatarBorderColor, primaryColor),
    layout,
    cardStyle,
    fontFamily,
    profileBackground,
    showStats: asBooleanDefaultTrue(theme.showStats),
    showBadges: asBooleanDefaultTrue(theme.showBadges),
    hideCompletenessNudge: asBooleanDefaultFalse(theme.hideCompletenessNudge),
  };
}

export function getProfileFontStyle(
  fontFamily: ProfileFontFamily,
): CSSProperties {
  if (fontFamily === "serif") {
    return { fontFamily: '"Georgia", "Times New Roman", serif' };
  }
  if (fontFamily === "mono") {
    return {
      fontFamily:
        '"JetBrains Mono", "Fira Code", "SFMono-Regular", Menlo, monospace',
    };
  }
  if (fontFamily === "display") {
    return {
      fontFamily: '"Trebuchet MS", "Avenir Next", "Segoe UI", sans-serif',
    };
  }
  return {};
}

export function getProfileBackgroundStyles(
  profileBackground: ProfileBackground,
  primaryColor: string,
  accentColor: string,
): { className: string; style: CSSProperties } {
  if (profileBackground === "dark") {
    return {
      className: "bg-slate-950/95",
      style: {
        backgroundImage:
          "linear-gradient(180deg, rgba(2,6,23,0.88), rgba(15,23,42,0.96))",
      },
    };
  }

  if (profileBackground === "ambient") {
    return {
      className: "bg-background",
      style: {
        backgroundImage: `radial-gradient(circle at 0% 0%, ${primaryColor}22 0%, transparent 45%), radial-gradient(circle at 100% 0%, ${accentColor}1f 0%, transparent 45%)`,
      },
    };
  }

  if (profileBackground === "minimal") {
    return {
      className: "bg-muted/25",
      style: {
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0))",
      },
    };
  }

  return {
    className: "bg-background",
    style: {},
  };
}

export function getProfileGridClass(layout: ProfileLayout): string {
  if (layout === "list") {
    return "grid gap-3 grid-cols-1";
  }

  if (layout === "showcase") {
    return "grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  }

  return "grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5";
}

export function getProfileCardClass(cardStyle: ProfileCardStyle): string {
  if (cardStyle === "bordered") {
    return "rounded-xl border-2 p-3 transition-all hover:shadow-md";
  }

  if (cardStyle === "minimal") {
    return "rounded-xl border border-transparent bg-muted/40 p-3 transition-all hover:bg-muted/65";
  }

  if (cardStyle === "glass") {
    return "rounded-xl border border-white/20 bg-background/65 p-3 backdrop-blur-md transition-all hover:bg-background/80";
  }

  return "rounded-lg border p-3 transition-all hover:border-primary/30 shadow-md";
}
