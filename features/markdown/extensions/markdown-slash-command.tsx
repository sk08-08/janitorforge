"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

import { Extension, type Editor } from "@tiptap/core";

import { PluginKey } from "@tiptap/pm/state";

import { ReactRenderer } from "@tiptap/react";

import Suggestion, {
  exitSuggestion,
  type SuggestionMatch,
} from "@tiptap/suggestion";

import {
  Bold,
  Code2,
  FileCode2,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Strikethrough,
} from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type SlashCommandRange = {
  from: number;
  to: number;
};

export type MarkdownSlashFeature =
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

type SlashCommandGroup =
  | "Basic"
  | "Formatting"
  | "Headings"
  | "Blocks"
  | "Media";

type SlashCommandItem = {
  title: string;

  description: string;

  keywords?: string[];

  icon: React.ComponentType<{
    className?: string;
  }>;

  feature?: MarkdownSlashFeature;

  group: SlashCommandGroup;

  command: ({
    editor,
    range,
  }: {
    editor: Editor;
    range: SlashCommandRange;
  }) => void;
};

type SlashMenuProps = {
  items: SlashCommandItem[];

  command: (item: SlashCommandItem) => void;
};

export type SlashMenuHandle = {
  onKeyDown: ({ event }: { event: KeyboardEvent }) => boolean;
};

export type MarkdownSlashCommandOptions = {
  imageEnabled?: boolean;

  onImageRequest?: () => void;

  container?: string | HTMLElement;

  enabledFeatures?: readonly MarkdownSlashFeature[];
};

// ============================================================================
// Slash command list
// ============================================================================

const MarkdownSlashPluginKey = new PluginKey("markdownSlashCommand");

export function closeMarkdownSlashCommand(editor: Editor) {
  exitSuggestion(editor.view, MarkdownSlashPluginKey);
}

function findMarkdownSlashMatch({
  $position,
}: {
  $position: any;
}): SuggestionMatch | null {
  const textBefore = $position.parent.textBetween(
    0,
    $position.parentOffset,
    undefined,
    "\ufffc",
  );

  /*
   * Match:
   *
   * /
   * /hea
   * /bold
   * hello /image
   *
   * But do NOT match:
   *
   * https://example.com
   * word/foo
   */
  const match = /(?:^|\s)\/([^\s/]*)$/.exec(textBefore);

  if (!match) {
    return null;
  }

  const query = match[1] ?? "";

  const fullMatch = match[0];

  const slashOffsetInsideMatch = fullMatch.lastIndexOf("/");

  const from = $position.pos - fullMatch.length + slashOffsetInsideMatch;

  const to = $position.pos;

  return {
    range: {
      from,
      to,
    },

    query,

    text: `/${query}`,
  };
}

const MarkdownSlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(
  function MarkdownSlashMenu({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

    const listRef = React.useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useEffect(() => {
      const list = listRef.current;

      const item = itemRefs.current[selectedIndex];

      if (!list || !item) {
        return;
      }
      const itemTop = item.offsetTop;

      const itemBottom = itemTop + item.offsetHeight;

      const visibleTop = list.scrollTop;

      const visibleBottom = visibleTop + list.clientHeight;

      if (itemTop < visibleTop) {
        list.scrollTop = itemTop;

        return;
      }

      if (itemBottom > visibleBottom) {
        list.scrollTop = itemBottom - list.clientHeight;
      }
    }, [selectedIndex]);

    const selectItem = (index: number) => {
      const item = items[index];

      if (!item) {
        return;
      }

      command(item);
    };

    useImperativeHandle(
      ref,
      () => ({
        onKeyDown({ event }) {
          if (event.key === "ArrowUp") {
            if (items.length === 0) {
              return true;
            }

            setSelectedIndex((current) =>
              current <= 0 ? items.length - 1 : current - 1,
            );

            return true;
          }

          if (event.key === "ArrowDown") {
            if (items.length === 0) {
              return true;
            }

            setSelectedIndex((current) =>
              current >= items.length - 1 ? 0 : current + 1,
            );

            return true;
          }

          if (event.key === "Enter") {
            selectItem(selectedIndex);

            return true;
          }

          return false;
        },
      }),
      [items, selectedIndex],
    );

    if (items.length === 0) {
      return (
        <div
          role="status"
          className={cn(
            "w-64 rounded-xl border bg-popover p-3 shadow-xl",
            "text-sm text-muted-foreground",
          )}
        >
          No matching commands
        </div>
      );
    }

    return (
      <div
        className={cn(
          "pointer-events-auto relative isolate z-[1]",
          "w-[min(20rem,calc(100vw-2rem))]",
          "overflow-hidden rounded-xl",
          "border border-border/80",
          "bg-popover/98 shadow-xl backdrop-blur-xl",
          "animate-in fade-in-0 zoom-in-95 duration-150",
        )}
        onWheel={(event) => {
          event.stopPropagation();
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="px-3 pb-1.5 pt-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Insert
            </p>

            <span className="text-[10px] text-muted-foreground/60">
              Markdown
            </span>
          </div>
        </div>

        <div
          ref={listRef}
          role="menu"
          aria-label="Insert Markdown content"
          className={cn(
            "max-h-[17rem] overflow-y-auto overscroll-contain",
            "touch-pan-y px-1.5 pb-1.5",
            "[scrollbar-width:thin]",
          )}
          onWheel={(event) => {
            event.stopPropagation();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          {items.map((item, index) => {
            const Icon = item.icon;

            const active = index === selectedIndex;

            const previousItem = items[index - 1];

            const startsGroup =
              index === 0 || previousItem?.group !== item.group;

            return (
              <React.Fragment key={item.title}>
                {startsGroup && (
                  <div
                    className={cn("px-2.5 pb-1 pt-2.5", index === 0 && "pt-1")}
                    aria-hidden="true"
                  >
                    <p
                      className={cn(
                        "text-[9px] font-semibold uppercase",
                        "tracking-[0.14em]",
                        "text-muted-foreground/70",
                      )}
                    >
                      {item.group}
                    </p>
                  </div>
                )}

                <button
                  ref={(element) => {
                    itemRefs.current[index] = element;
                  }}
                  type="button"
                  role="menuitem"
                  aria-current={active ? "true" : undefined}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();

                    selectItem(index);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3",
                    "rounded-lg px-2.5 py-2 text-left",
                    "transition-[background-color,color,transform] duration-100",
                    "active:scale-[0.99]",

                    active
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center",
                      "rounded-lg border",
                      "transition-colors duration-100",

                      active
                        ? "border-primary/25 bg-primary/10 text-primary"
                        : "border-border/70 bg-muted/40",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {item.title}
                    </span>

                    <span className="block truncate text-[11px] text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {items[selectedIndex]
            ? `${items[selectedIndex].title}: ${items[selectedIndex].description}`
            : ""}
        </div>

        <div
          className={cn(
            "border-t border-border/70",
            "bg-popover/95 px-3 py-2",
            "text-[10px] text-muted-foreground",
          )}
        >
          ↑ ↓ navigate · Enter select · Esc close
        </div>
      </div>
    );
  },
);

// ============================================================================
// Extension factory
// ============================================================================

export function createMarkdownSlashCommand(
  options: MarkdownSlashCommandOptions = {},
) {
  return Extension.create({
    name: "markdownSlashCommand",

    addProseMirrorPlugins() {
      const editor = this.editor;

      const imageEnabled = options.imageEnabled === true;

      const enabledFeatures = new Set(options.enabledFeatures ?? []);

      const allItems: SlashCommandItem[] = [
        {
          title: "Text",
          description: "Normal paragraph",
          keywords: ["paragraph", "text"],
          icon: Pilcrow,

          group: "Basic",

          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setParagraph().run();
          },
        },

        {
          title: "Bold",

          description: "Bold the text you type next",

          keywords: ["bold", "strong", "b"],

          icon: Bold,

          group: "Formatting",

          feature: "bold",

          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBold().run();
          },
        },

        {
          title: "Italic",

          description: "Italicize the text you type next",

          keywords: ["italic", "emphasis", "i"],

          icon: Italic,

          group: "Formatting",

          feature: "italic",

          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleItalic().run();
          },
        },

        {
          title: "Strikethrough",

          description: "Strike through the text you type next",

          keywords: ["strike", "strikethrough", "delete"],

          icon: Strikethrough,

          group: "Formatting",

          feature: "strike",

          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleStrike().run();
          },
        },

        {
          title: "Inline Code",

          description: "Format the text you type next as code",

          keywords: ["inline", "code", "monospace"],

          icon: Code2,

          group: "Formatting",

          feature: "code",

          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleCode().run();
          },
        },

        {
          title: "Heading 1",
          description: "Large section heading",
          keywords: ["h1", "title"],
          icon: Heading1,

          group: "Headings",

          feature: "heading",

          command: ({ editor, range }) => {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .setHeading({
                level: 1,
              })
              .run();
          },
        },

        {
          title: "Heading 2",
          description: "Medium section heading",
          keywords: ["h2", "heading"],
          icon: Heading2,

          group: "Headings",

          feature: "heading",

          command: ({ editor, range }) => {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .setHeading({
                level: 2,
              })
              .run();
          },
        },

        {
          title: "Heading 3",
          description: "Small section heading",
          keywords: ["h3", "heading"],
          icon: Heading3,

          group: "Headings",

          feature: "heading",

          command: ({ editor, range }) => {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .setHeading({
                level: 3,
              })
              .run();
          },
        },

        {
          title: "Bullet List",
          description: "Create an unordered list",
          keywords: ["bullet", "list", "unordered"],
          icon: List,

          group: "Blocks",

          feature: "bulletList",

          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
          },
        },

        {
          title: "Numbered List",
          description: "Create an ordered list",
          keywords: ["ordered", "number", "list"],
          icon: ListOrdered,

          group: "Blocks",

          feature: "orderedList",

          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
          },
        },

        {
          title: "Quote",
          description: "Highlight a quotation",
          keywords: ["blockquote", "quote"],
          icon: Quote,

          group: "Blocks",

          feature: "blockquote",

          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBlockquote().run();
          },
        },

        {
          title: "Code Block",
          description: "Multi-line code block",
          keywords: ["code", "pre"],
          icon: FileCode2,

          group: "Blocks",

          feature: "codeBlock",

          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
          },
        },

        {
          title: "Divider",
          description: "Separate sections",
          keywords: ["separator", "line", "hr"],
          icon: Minus,

          group: "Blocks",

          feature: "horizontalRule",

          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run();
          },
        },

        ...(imageEnabled
          ? [
              {
                title: "Image",
                description: "Upload an image from your device",
                keywords: ["photo", "picture", "upload"],
                icon: ImagePlus,

                group: "Media",

                command: ({
                  editor,
                  range,
                }: {
                  editor: Editor;
                  range: SlashCommandRange;
                }) => {
                  editor.chain().focus().deleteRange(range).run();

                  requestAnimationFrame(() => options.onImageRequest?.());
                },
              } satisfies SlashCommandItem,
            ]
          : []),
      ];

      const availableItems = allItems.filter((item) => {
        if (!item.feature) {
          return true;
        }

        return enabledFeatures.has(item.feature);
      });

      return [
        Suggestion<SlashCommandItem>({
          editor,

          pluginKey: MarkdownSlashPluginKey,

          container: options.container,

          dismissOnOutsideClick: false,

          floatingUi: {
            strategy: "absolute",
          },

          char: "/",

          placement: "bottom-start",

          offset: {
            mainAxis: 8,
            crossAxis: 0,
          },

          allowSpaces: false,

          startOfLine: false,

          allowedPrefixes: null,

          findSuggestionMatch: findMarkdownSlashMatch,

          items: ({ query }) => {
            const normalized = query.trim().toLowerCase();

            if (!normalized) {
              return availableItems;
            }

            return availableItems.filter((item) => {
              const haystack = [
                item.title,
                item.description,
                ...(item.keywords || []),
              ]
                .join(" ")
                .toLowerCase();

              return haystack.includes(normalized);
            });
          },

          command: ({ editor, range, props }) => {
            props.command({
              editor,
              range,
            });
          },

          render: () => {
            let component: ReactRenderer<SlashMenuHandle> | null = null;

            let unmount: (() => void) | null = null;

            return {
              onStart(props) {
                component = new ReactRenderer(MarkdownSlashMenu, {
                  props,
                  editor: props.editor,
                });

                /*
                 * Tiptap/Floating UI still owns the anchor
                 * calculation, but we explicitly control how
                 * the resulting position is written.
                 *
                 * This is especially important inside Radix
                 * Dialogs, where the suggestion must sit above
                 * the dialog's scrollable content.
                 */
                unmount = props.mount(component.element, {
                  onPosition({ x, y, strategy }) {
                    if (!component) {
                      return;
                    }

                    Object.assign(component.element.style, {
                      position: strategy,

                      left: `${x}px`,

                      top: `${y}px`,

                      /*
                       * This z-index is now INSIDE the
                       * Dialog stacking context, rather
                       * than competing with the Dialog
                       * from document.body.
                       */
                      zIndex: "100",

                      pointerEvents: "auto",

                      visibility: "visible",
                    });
                  },
                });
              },

              onUpdate(props) {
                component?.updateProps(props);
              },

              onKeyDown(props) {
                if (props.event.key === "Escape") {
                  props.event.preventDefault();
                  props.event.stopPropagation();

                  exitSuggestion(editor.view, MarkdownSlashPluginKey);

                  return true;
                }

                return component?.ref?.onKeyDown(props) ?? false;
              },

              onExit() {
                unmount?.();

                unmount = null;

                component?.destroy();

                component = null;
              },
            };
          },
        }),
      ];
    },
  });
}
