export const COLOR_PRESETS = [
  {
    label: "Red",
    value: "#ef4444",
  },
  {
    label: "Orange",
    value: "#f97316",
  },
  {
    label: "Yellow",
    value: "#eab308",
  },
  {
    label: "Green",
    value: "#22c55e",
  },
  {
    label: "Cyan",
    value: "#06b6d4",
  },
  {
    label: "Blue",
    value: "#3b82f6",
  },
  {
    label: "Purple",
    value: "#a855f7",
  },
  {
    label: "Rose",
    value: "#f43f5e",
  },
] as const;

export type MarkdownPreset = "inline" | "standard" | "full";

export type MarkdownFeature =
  | "heading"
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "codeBlock"
  | "link"
  | "color"
  | "bulletList"
  | "orderedList"
  | "blockquote"
  | "horizontalRule";

export const MARKDOWN_PRESET_FEATURES: Record<
  MarkdownPreset,
  MarkdownFeature[]
> = {
  inline: ["bold", "italic", "strike", "code", "link", "color"],

  standard: [
    "bold",
    "italic",
    "strike",
    "code",
    "link",
    "color",
    "bulletList",
    "orderedList",
    "blockquote",
  ],

  full: [
    "heading",
    "bold",
    "italic",
    "strike",
    "code",
    "codeBlock",
    "link",
    "color",
    "bulletList",
    "orderedList",
    "blockquote",
    "horizontalRule",
  ],
};
