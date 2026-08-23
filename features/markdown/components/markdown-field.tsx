"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { Mark, mergeAttributes } from "@tiptap/core";
import LinkExtension from "@tiptap/extension-link";
import { HexColorPicker } from "react-colorful";
import {
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  List,
  ListOrdered,
  Palette,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Constants & Interceptors
// ---------------------------------------------------------------------------

const COLOR_PRESETS = [
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Rose", value: "#f43f5e" },
];

// ---------------------------------------------------------------------------
// Toolbar Components
// ---------------------------------------------------------------------------

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors",
        active
          ? "bg-primary/20 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled &&
          "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// MarkdownField
// WYSIWYG Editor using Tiptap that seamlessly outputs Markdown
// ---------------------------------------------------------------------------

interface MarkdownFieldProps {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  minEditorHeightRem?: number;
  maxEditorHeightRem?: number;
  disabled?: boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    markdownColor: {
      setMarkdownColor: (color: string) => ReturnType;
      unsetMarkdownColor: () => ReturnType;
    };
  }
}

const MarkdownColor = Mark.create({
  name: "markdownColor",

  addAttributes() {
    return {
      color: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-markdown-color]",
        getAttrs: (element) => ({
          color: (element as HTMLElement).getAttribute("data-markdown-color"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const color = HTMLAttributes.color;

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-markdown-color": color,
        style: color ? `color: ${color}` : undefined,
      }),
      0,
    ];
  },

  markdownTokenizer: {
    name: "markdownColor",
    level: "inline",

    start(src) {
      return src.indexOf("[");
    },

    tokenize(src, _tokens, lexer) {
      const match = /^\[([^\]]+)\]\{(#[0-9a-fA-F]{3,6})\}/.exec(src);

      if (!match) return undefined;

      return {
        type: "markdownColor",
        raw: match[0],
        text: match[1],
        color: match[2],
        tokens: lexer.inlineTokens(match[1]),
      };
    },
  },

  parseMarkdown(token, helpers) {
    const content = helpers.parseInline(token.tokens || []);

    return helpers.applyMark("markdownColor", content, {
      color: token.color,
    });
  },

  renderMarkdown(node, helpers) {
    const content = helpers.renderChildren(node.content || []);
    const color = node.attrs?.color;

    if (!color) {
      return content;
    }

    return `[${content}]{${color}}`;
  },

  addCommands() {
    return {
      setMarkdownColor:
        (color: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { color });
        },

      unsetMarkdownColor:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeLinkUrl(input: string): string | null {
  const value = input.trim();

  if (!value) return null;

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

export function MarkdownField({
  id,
  value = "",
  onChange,
  className,
  placeholder = "Write something amazing...",
  minEditorHeightRem = 10,
  maxEditorHeightRem = 32,
  disabled = false,
}: MarkdownFieldProps) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [, setForceUpdate] = useState(0);
  const [tempHexColor, setTempHexColor] = useState("");

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState("");

  const colorPickerRef = useRef<HTMLDivElement>(null);
  const lastEmittedValue = useRef(value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node)
      ) {
        setIsColorPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: false,
        paragraph: {
          HTMLAttributes: {
            class: "leading-relaxed",
          },
        },
        bold: { HTMLAttributes: { class: "font-bold" } },
        italic: { HTMLAttributes: { class: "italic" } },
        strike: { HTMLAttributes: { class: "line-through" } },
        bulletList: {
          HTMLAttributes: {
            class: "list-disc list-outside ml-4 pl-2 space-y-1 my-2",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal list-outside ml-4 pl-2 space-y-1 my-2",
          },
        },
        listItem: {
          HTMLAttributes: {
            class: "mt-1 leading-relaxed",
          },
        },
        blockquote: {
          HTMLAttributes: {
            class:
              "border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-2",
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class:
              "rounded-lg bg-muted p-4 font-mono text-sm my-2 overflow-x-auto",
          },
        },
      }),
      MarkdownColor,
      LinkExtension.configure({
        openOnClick: false,
        protocols: ["http", "https", "mailto"],

        isAllowedUri: (url, ctx) => {
          if (!ctx.defaultValidate(url)) {
            return false;
          }

          try {
            const parsed = new URL(url);

            return ["http:", "https:", "mailto:"].includes(parsed.protocol);
          } catch {
            return false;
          }
        },

        HTMLAttributes: {
          class: "text-primary underline underline-offset-2",
          rel: "noopener noreferrer",
        },
      }),
      Markdown,
    ],
    content: value,
    contentType: "markdown",
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "focus:outline-none p-4 w-full overflow-y-auto",
          "[&_p]:my-0",
          "[&_p+p]:mt-3",
        ),
        style: `min-height: ${minEditorHeightRem}rem; max-height: ${maxEditorHeightRem}rem;`,
      },
      handleKeyDown: (_view, event) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "k"
        ) {
          event.preventDefault();

          const previousUrl = editor?.getAttributes("link").href || "";

          setLinkInput(previousUrl);
          setLinkError("");
          setLinkDialogOpen(true);

          return true;
        }

        return false;
      },
    },
    onTransaction: () => {
      setForceUpdate((x) => x + 1);
    },
    onUpdate: ({ editor }) => {
      const markdown = editor.getMarkdown();

      lastEmittedValue.current = markdown;
      onChange?.(markdown);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (value === lastEmittedValue.current) return;

    const currentContent = editor.getMarkdown();

    if (value !== currentContent) {
      lastEmittedValue.current = value;

      editor.commands.setContent(value, {
        contentType: "markdown",
        emitUpdate: false,
      });
    }
  }, [value, editor]);

  const openLinkDialog = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href || "";

    setLinkInput(previousUrl);
    setLinkError("");
    setLinkDialogOpen(true);
  }, [editor]);

  const submitLink = useCallback(() => {
    if (!editor) return;

    const normalizedUrl = normalizeLinkUrl(linkInput);

    if (!normalizedUrl) {
      setLinkError("Enter a valid HTTP, HTTPS, or email address.");
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .unsetMarkdownColor()
      .setLink({ href: normalizedUrl })
      .run();

    setLinkDialogOpen(false);
    setLinkInput("");
    setLinkError("");
  }, [editor, linkInput]);

  const removeLink = useCallback(() => {
    if (!editor) return;

    editor.chain().focus().extendMarkRange("link").unsetLink().run();

    setLinkDialogOpen(false);
    setLinkInput("");
    setLinkError("");
  }, [editor]);

  if (!editor) return null;

  const isFocused = editor.isFocused;
  const currentColor = editor.getAttributes("markdownColor").color || "";
  const showColorActive = isFocused && editor.isActive("markdownColor");

  const handleOpenChange = (open: boolean) => {
    if (disabled) return;

    if (open) {
      setTempHexColor(currentColor || "#a855f7");
    }

    setIsColorPickerOpen(open);
  };

  const applyCustomColor = () => {
    let finalColor = tempHexColor.trim();
    if (!finalColor.startsWith("#")) finalColor = "#" + finalColor;
    editor.chain().focus().unsetLink().setMarkdownColor(finalColor).run();
    setIsColorPickerOpen(false);
  };

  const isCustomColor =
    tempHexColor &&
    !COLOR_PRESETS.some(
      (p) => p.value.toLowerCase() === tempHexColor.toLowerCase(),
    );

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border border-input bg-background shadow-sm transition-colors duration-300",
        "focus-within:border-ring focus-within:ring-[2px] focus-within:ring-ring/50",
        className,
      )}
    >
      <Dialog
        open={linkDialogOpen}
        onOpenChange={(open) => {
          setLinkDialogOpen(open);

          if (!open) {
            setLinkInput("");
            setLinkError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert link</DialogTitle>
            <DialogDescription>
              Enter a website or email address. URLs without a protocol will use
              HTTPS automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`${id || "markdown"}-link-url`}>URL</Label>

            <Input
              id={`${id || "markdown"}-link-url`}
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value);
                setLinkError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitLink();
                }
              }}
              placeholder="youtube.com"
              autoFocus
            />

            {linkError && (
              <p className="text-xs text-destructive">{linkError}</p>
            )}

            <p className="text-xs text-muted-foreground">
              Allowed: HTTP, HTTPS, and email links.
            </p>
          </div>

          <DialogFooter className="gap-2">
            {editor?.isActive("link") && (
              <Button
                type="button"
                className="cursor-pointer"
                variant="destructive"
                onClick={removeLink}
              >
                Remove link
              </Button>
            )}

            <Button
              type="button"
              className="cursor-pointer"
              variant="outline"
              onClick={() => setLinkDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              className="cursor-pointer"
              onClick={submitLink}
            >
              Apply link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border/50 bg-muted/20 p-1.5 relative">
        <div className="flex items-center gap-0.5 pr-2 border-r border-border/50">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={disabled || !editor.can().undo()}
            title="Undo (Ctrl/Cmd+Z)"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={disabled || !editor.can().redo()}
            title="Redo (Ctrl/Cmd+Shift+Z)"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-0.5 pl-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={isFocused && editor.isActive("bold")}
            disabled={disabled}
            title="Bold (Ctrl/Cmd+B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={isFocused && editor.isActive("italic")}
            disabled={disabled}
            title="Italic (Ctrl/Cmd+I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={isFocused && editor.isActive("code")}
            disabled={disabled}
            title="Inline Code"
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={openLinkDialog}
            active={isFocused && editor.isActive("link")}
            disabled={disabled}
            title="Link (Ctrl/Cmd+K)"
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>

          {/* Color Picker */}
          <Popover open={isColorPickerOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className={cn(
                  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-all duration-200 active:scale-90",
                  isColorPickerOpen || showColorActive
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                title="Text Color"
              >
                <Palette
                  className="h-4 w-4 transition-colors duration-200"
                  style={{ color: showColorActive ? currentColor : "inherit" }}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 border-border/80 bg-popover p-4 shadow-xl"
              align="start"
              sideOffset={8}
              avoidCollisions={false}
            >
              <div className="space-y-4">
                <div className="w-full overflow-hidden rounded-lg border border-border/50 shadow-inner">
                  <HexColorPicker
                    color={
                      tempHexColor.startsWith("#") ? tempHexColor : "#000000"
                    }
                    onChange={setTempHexColor}
                    style={{ width: "100%", height: "140px" }}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Suggested colors</p>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_PRESETS.map((preset) => {
                      const isActive =
                        tempHexColor.toLowerCase() ===
                        preset.value.toLowerCase();
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          data-state={isActive ? "on" : "off"}
                          className={cn(
                            "group flex flex-col items-center gap-1 rounded-xl border border-border/70 bg-card/70 p-2 transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-muted/40 cursor-pointer",
                            isActive &&
                              "border-primary/70 bg-primary/10 shadow-sm",
                          )}
                          onClick={() => {
                            editor
                              .chain()
                              .focus()
                              .unsetLink()
                              .setMarkdownColor(preset.value)
                              .run();
                            setTempHexColor(preset.value);
                            setIsColorPickerOpen(false);
                          }}
                        >
                          <span
                            className="h-7 w-7 rounded-full border shadow-sm transition-transform group-hover:scale-105"
                            style={{ backgroundColor: preset.value }}
                          />
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {preset.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs">Custom hex</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tempHexColor}
                      onChange={(e) => setTempHexColor(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && applyCustomColor()}
                      className="h-9 font-mono text-xs uppercase"
                      maxLength={7}
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={applyCustomColor}
                      className="h-9 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer active:scale-95 shadow-sm"
                    >
                      Apply
                    </button>
                  </div>
                  {isCustomColor && (
                    <div
                      className="mt-2 h-1.5 w-full rounded-full shadow-inner transition-colors duration-300"
                      style={{ backgroundColor: tempHexColor }}
                    />
                  )}
                </div>

                <div className="h-px w-full bg-border/50 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetMarkdownColor().run();
                    setTempHexColor("");
                    setIsColorPickerOpen(false);
                  }}
                  className="w-full rounded-md py-1.5 text-xs font-medium bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90 active:scale-95 cursor-pointer shadow-sm"
                >
                  Remove Color
                </button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="mx-1 h-5 w-px bg-border/50" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={isFocused && editor.isActive("bulletList")}
            disabled={disabled}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={isFocused && editor.isActive("orderedList")}
            disabled={disabled}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="relative w-full">
        {editor.isEmpty && (
          <div className="pointer-events-none absolute left-4 top-4 text-sm text-muted-foreground opacity-70 transition-opacity duration-300">
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
