import { cn } from "@/lib/utils";
import type {
  FormAccent,
  FormAppearance,
  FormDensity,
  FormPreset,
} from "@/lib/types";
import type { CSSProperties } from "react";

export const defaultFormAppearance: FormAppearance = {
  preset: "clean",
  accent: "indigo",
  density: "comfortable",
};

export const formAppearancePresets: Array<{
  value: FormPreset;
  label: string;
  description: string;
}> = [
  {
    value: "clean",
    label: "Clean",
    description: "Neutral cards and standard spacing.",
  },
  {
    value: "bold",
    label: "Bold",
    description: "Stronger emphasis with a more assertive shell.",
  },
  {
    value: "editorial",
    label: "Editorial",
    description: "Airier layout with a more polished header feel.",
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Lighter surfaces and reduced visual noise.",
  },
];

export const formAppearanceAccents: Array<{
  value: FormAccent;
  label: string;
}> = [
  { value: "indigo", label: "Indigo" },
  { value: "emerald", label: "Emerald" },
  { value: "amber", label: "Amber" },
  { value: "rose", label: "Rose" },
  { value: "slate", label: "Slate" },
];

export const formAppearanceDensityOptions: Array<{
  value: FormDensity;
  label: string;
  description: string;
}> = [
  {
    value: "comfortable",
    label: "Comfortable",
    description: "More space between sections and fields.",
  },
  {
    value: "compact",
    label: "Compact",
    description: "Tighter spacing for denser forms.",
  },
];

const accentMap: Record<
  FormAccent,
  {
    softBg: string;
    border: string;
    text: string;
    button: string;
    badge: string;
    hex: string;
    glow: string;
    focus: string;
  }
> = {
  indigo: {
    softBg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    text: "text-indigo-600",
    button: "bg-indigo-600 hover:bg-indigo-700 text-white",
    badge: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
    hex: "#4f46e5",
    glow: "rgba(79, 70, 229, 0.18)",
    focus: "focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20",
  },
  emerald: {
    softBg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-600",
    button: "bg-emerald-600 hover:bg-emerald-700 text-white",
    badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    hex: "#059669",
    glow: "rgba(5, 150, 105, 0.18)",
    focus: "focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20",
  },
  amber: {
    softBg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-600",
    button: "bg-amber-600 hover:bg-amber-700 text-white",
    badge: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    hex: "#d97706",
    glow: "rgba(217, 119, 6, 0.18)",
    focus: "focus-visible:border-amber-500 focus-visible:ring-amber-500/20",
  },
  rose: {
    softBg: "bg-rose-500/10",
    border: "border-rose-500/20",
    text: "text-rose-600",
    button: "bg-rose-600 hover:bg-rose-700 text-white",
    badge: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    hex: "#e11d48",
    glow: "rgba(225, 29, 72, 0.18)",
    focus: "focus-visible:border-rose-500 focus-visible:ring-rose-500/20",
  },
  slate: {
    softBg: "bg-slate-500/10",
    border: "border-slate-500/20",
    text: "text-slate-600",
    button: "bg-slate-700 hover:bg-slate-800 text-white",
    badge: "bg-slate-500/10 text-slate-700 border-slate-500/20",
    hex: "#334155",
    glow: "rgba(51, 65, 85, 0.18)",
    focus: "focus-visible:border-slate-500 focus-visible:ring-slate-500/20",
  },
};

export function resolveFormAppearance(
  appearance?: Partial<FormAppearance> | null,
): FormAppearance {
  return {
    preset: appearance?.preset ?? defaultFormAppearance.preset,
    accent: appearance?.accent ?? defaultFormAppearance.accent,
    density: appearance?.density ?? defaultFormAppearance.density,
  };
}

export function getFormAccentClasses(accent: FormAccent) {
  return accentMap[accent] ?? accentMap.indigo;
}

export function getFormFieldFocusClasses(accent: FormAccent) {
  const resolved = getFormAccentClasses(accent);
  return cn(
    "focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none",
    resolved.focus,
  );
}

export function getFormDensityClasses(density: FormDensity) {
  return density === "compact"
    ? {
        formGap: "space-y-3",
        sectionContent: "space-y-3",
        fieldGroup: "space-y-1",
        headerSpacing: "mb-3",
        containerPadding: "py-4 sm:py-6",
      }
    : {
        formGap: "space-y-8",
        sectionContent: "space-y-8",
        fieldGroup: "space-y-3",
        headerSpacing: "mb-8 sm:mb-10",
        containerPadding: "py-10 sm:py-14",
      };
}

export function getFormPresetClasses(preset: FormPreset) {
  switch (preset) {
    case "bold":
      return {
        shell:
          "border-2 shadow-2xl shadow-foreground/10 bg-gradient-to-br from-background via-background to-indigo-500/5",
        card: "border-2 rounded-2xl bg-background/90 shadow-lg",
        heroIcon: "shadow-xl rounded-2xl",
        title: "tracking-tight text-xl",
        wrapper: "",
        layout: "mx-auto w-full max-w-5xl",
        sidebar: "",
        pageBg: "",
      };
    case "editorial":
      return {
        shell:
          "border-border/40 shadow-xl bg-gradient-to-b from-background via-background to-amber-500/5",
        card: "rounded-none border-x-0 border-t-0 border-b-2 border-dotted shadow-none bg-transparent",
        heroIcon: "shadow-md rounded-2xl ring-1 ring-border/20",
        title: "tracking-tight text-balance text-xl font-semibold",
        wrapper:
          "before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-transparent before:via-amber-500/40 before:to-transparent",
        layout:
          "mx-auto flex w-full max-w-7xl flex-col gap-6 md:grid md:grid-cols-[18rem_minmax(0,1fr)] lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start",
        sidebar:
          "order-first w-full rounded-3xl border border-border/60 bg-background/80 p-5 lg:p-6 shadow-lg backdrop-blur md:sticky md:top-0 top-6 md:w-auto",
        pageBg: "",
      };
    case "minimal":
      return {
        shell: "border-dashed border-border/70 shadow-none bg-muted/20",
        card: "rounded-sm border-dashed border-border/70 bg-muted/20 shadow-none",
        heroIcon: "rounded-lg opacity-90",
        title:
          "tracking-tight uppercase text-sm tracking-[0.18em] text-muted-foreground",
        wrapper: "",
        layout: "mx-auto w-full max-w-2xl",
        sidebar: "",
        pageBg: "",
      };
    case "clean":
    default:
      return {
        shell: "border-border/60 shadow-sm bg-background",
        card: "rounded-xl bg-background shadow-sm",
        heroIcon: "rounded-xl",
        title: "tracking-tight text-lg",
        wrapper: "",
        layout: "mx-auto w-full max-w-3xl",
        sidebar: "",
        pageBg: "",
      };
  }
}

export function getFormAppearanceClasses(
  appearance?: Partial<FormAppearance> | null,
) {
  const resolved = resolveFormAppearance(appearance);
  const accent = getFormAccentClasses(resolved.accent);
  const preset = getFormPresetClasses(resolved.preset);
  const density = getFormDensityClasses(resolved.density);

  return {
    resolved,
    accent,
    preset,
    density,
    wrapper: cn(
      "relative min-h-screen flex items-start justify-center overflow-hidden",
      preset.wrapper,
      density.containerPadding,
      resolved.preset === "minimal" ? "bg-muted/20" : "bg-background",
      preset.pageBg,
    ),
    wrapperStyle: {
      backgroundImage:
        resolved.preset === "minimal"
          ? `radial-gradient(circle at top left, ${accent.glow}, transparent 42%), radial-gradient(circle at bottom right, ${accent.glow.replace("0.18", "0.08")}, transparent 34%)`
          : `radial-gradient(circle at top left, ${accent.glow}, transparent 38%), radial-gradient(circle at top right, ${accent.glow.replace("0.18", "0.1")}, transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.0), rgba(255,255,255,0.0))`,
      backgroundAttachment: "fixed",
    } as CSSProperties,
    surface: cn("overflow-hidden", preset.shell),
    sectionCard: cn("transition-all border", preset.card, accent.border),
    heroIcon: cn(
      "flex h-12 w-12 items-center justify-center rounded-xl",
      accent.softBg,
      accent.border,
      preset.heroIcon,
    ),
    title: cn("font-bold", preset.title, accent.text),
    submitButton: accent.button,
    submitButtonStyle: { backgroundColor: accent.hex, color: "#fff" },
    accentBadge: cn("border", accent.badge),
  };
}
