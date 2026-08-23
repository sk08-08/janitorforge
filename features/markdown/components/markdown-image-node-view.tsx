"use client";

import React, { useEffect, useMemo, useState } from "react";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  ImageIcon,
  PencilLine,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { toast } from "sonner";

import { cn } from "@/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ============================================================================
// Types
// ============================================================================

type MarkdownImageExtensionOptions = {
  onReplaceRequest?: (position: number) => void;
};

// ============================================================================
// Markdown Image Node View
// ============================================================================

export function MarkdownImageNodeView({
  editor,
  node,
  selected,
  getPos,
  updateAttributes,
  deleteNode,
  extension,
}: NodeViewProps) {
  const src = String(node.attrs.src || "");

  const alt = String(node.attrs.alt || "");

  const [altOpen, setAltOpen] = useState(false);

  const [altDraft, setAltDraft] = useState(alt);

  const [loaded, setLoaded] = useState(false);

  const [imageError, setImageError] = useState(false);

  const isPending = src.startsWith("blob:");

  // --------------------------------------------------------------------------
  // Keep alt editor synchronized
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!altOpen) {
      setAltDraft(alt);
    }
  }, [alt, altOpen]);

  useEffect(() => {
    setLoaded(false);
    setImageError(false);
  }, [src]);

  // --------------------------------------------------------------------------
  // Current image position
  // --------------------------------------------------------------------------

  const imagePosition = getPos();

  const blockInfo = useMemo(() => {
    if (typeof imagePosition !== "number") {
      return null;
    }

    try {
      const resolved = editor.state.doc.resolve(imagePosition);

      /*
       * Markdown images are inline nodes,
       * normally contained by a paragraph.
       *
       * Move Up / Down operates on the whole
       * paragraph when that paragraph contains
       * only this image.
       */
      if (resolved.depth !== 1) {
        return null;
      }

      const parent = resolved.parent;

      const standaloneImage =
        parent.type.name === "paragraph" &&
        parent.childCount === 1 &&
        parent.firstChild?.type.name === "markdownImage";

      if (!standaloneImage) {
        return null;
      }

      const blockStart = resolved.before(1);

      const blockIndex = resolved.index(0);

      return {
        blockStart,
        blockIndex,
        blockNode: parent,
      };
    } catch {
      return null;
    }
  }, [editor.state.doc, imagePosition]);

  const canMoveUp = Boolean(blockInfo && blockInfo.blockIndex > 0);

  const canMoveDown = Boolean(
    blockInfo && blockInfo.blockIndex < editor.state.doc.childCount - 1,
  );

  // --------------------------------------------------------------------------
  // Selection
  // --------------------------------------------------------------------------

  const selectImage = () => {
    const pos = getPos();

    if (typeof pos !== "number") {
      return;
    }

    editor.chain().focus().setNodeSelection(pos).run();
  };

  // --------------------------------------------------------------------------
  // Alt text
  // --------------------------------------------------------------------------

  const saveAltText = () => {
    updateAttributes({
      alt: altDraft.trim(),
    });

    setAltOpen(false);
  };

  // --------------------------------------------------------------------------
  // Replace
  // --------------------------------------------------------------------------

  const requestReplace = () => {
    const pos = getPos();

    if (typeof pos !== "number") {
      return;
    }

    const options = extension.options as MarkdownImageExtensionOptions;

    if (!options.onReplaceRequest) {
      toast.error("Image replacement is not available here.");

      return;
    }

    options.onReplaceRequest(pos);
  };

  // --------------------------------------------------------------------------
  // Move
  // --------------------------------------------------------------------------

  const moveImage = (direction: "up" | "down") => {
    const pos = getPos();

    if (typeof pos !== "number") {
      return;
    }

    const resolved = editor.state.doc.resolve(pos);

    const parent = resolved.parent;

    /*
     * For predictable movement we require the
     * image to occupy its own paragraph.
     *
     * Newly inserted images will do this
     * automatically after the MarkdownField
     * change below.
     */
    const standaloneImage =
      resolved.depth === 1 &&
      parent.type.name === "paragraph" &&
      parent.childCount === 1 &&
      parent.firstChild?.type.name === "markdownImage";

    if (!standaloneImage) {
      toast.info(
        "This image needs to be on its own line before it can be moved.",
      );

      return;
    }

    const blockStart = resolved.before(1);

    const blockIndex = resolved.index(0);

    const blockNode = parent;

    const blockEnd = blockStart + blockNode.nodeSize;

    // ----------------------------------------------------------------------
    // Move up
    // ----------------------------------------------------------------------

    if (direction === "up") {
      if (blockIndex <= 0) {
        return;
      }

      const previousBlock = editor.state.doc.child(blockIndex - 1);

      const targetPosition = blockStart - previousBlock.nodeSize;

      const transaction = editor.state.tr;

      transaction.delete(blockStart, blockEnd);

      transaction.insert(targetPosition, blockNode);

      editor.view.dispatch(transaction);

      /*
       * +1 enters the paragraph and lands on
       * the inline image itself.
       */
      editor
        .chain()
        .focus()
        .setNodeSelection(targetPosition + 1)
        .run();

      return;
    }

    // ----------------------------------------------------------------------
    // Move down
    // ----------------------------------------------------------------------

    if (blockIndex >= editor.state.doc.childCount - 1) {
      return;
    }

    const nextBlock = editor.state.doc.child(blockIndex + 1);

    const transaction = editor.state.tr;

    transaction.delete(blockStart, blockEnd);

    /*
     * After deleting the current block,
     * the next block shifts to blockStart.
     *
     * We insert after that block.
     */
    const targetPosition = blockStart + nextBlock.nodeSize;

    transaction.insert(targetPosition, blockNode);

    editor.view.dispatch(transaction);

    editor
      .chain()
      .focus()
      .setNodeSelection(targetPosition + 1)
      .run();
  };

  // --------------------------------------------------------------------------
  // Duplicate
  // --------------------------------------------------------------------------

  const duplicateImage = () => {
    const pos = getPos();

    if (typeof pos !== "number") {
      return;
    }

    const resolved = editor.state.doc.resolve(pos);

    const parent = resolved.parent;

    const standaloneImage =
      resolved.depth === 1 &&
      parent.type.name === "paragraph" &&
      parent.childCount === 1 &&
      parent.firstChild?.type.name === "markdownImage";

    /*
     * Best case:
     * duplicate the entire standalone
     * image paragraph.
     */
    if (standaloneImage) {
      const blockStart = resolved.before(1);

      const insertPosition = blockStart + parent.nodeSize;

      const transaction = editor.state.tr.insert(insertPosition, parent);

      editor.view.dispatch(transaction);

      editor
        .chain()
        .focus()
        .setNodeSelection(insertPosition + 1)
        .run();

      return;
    }

    /*
     * Legacy/fallback:
     * duplicate only the inline image node.
     */
    const duplicateNode = node.type.create({
      ...node.attrs,
    });

    const insertPosition = pos + node.nodeSize;

    editor.view.dispatch(editor.state.tr.insert(insertPosition, duplicateNode));

    editor.chain().focus().setNodeSelection(insertPosition).run();
  };

  return (
    <NodeViewWrapper
      as="span"
      className={cn(
        "group relative my-4 block w-fit max-w-full",
        "rounded-2xl",
        "transition-[box-shadow,background-color,transform] duration-200",
        selected &&
          "bg-primary/[0.035] ring-2 ring-primary/60 ring-offset-4 ring-offset-background",
      )}
      data-type="markdown-image"
    >
      {/* ======================================================
          IMAGE
      ======================================================= */}

      <button
        type="button"
        onClick={selectImage}
        className={cn(
          "relative block max-w-full cursor-default overflow-hidden rounded-xl",
          "border border-border/80 bg-muted/20",
          "shadow-sm",
          "transition-all duration-200",
          "hover:border-primary/35 hover:shadow-md",
          selected && "border-primary/40",
        )}
        aria-label={alt ? `Image: ${alt}` : "Markdown image"}
      >
        {!loaded && !imageError && (
          <div
            className={cn(
              "flex min-h-40 min-w-56 items-center justify-center",
              "bg-muted/40",
            )}
          >
            <ImageIcon className="h-7 w-7 animate-pulse text-muted-foreground/50" />
          </div>
        )}

        {imageError ? (
          <div
            className={cn(
              "flex min-h-40 min-w-56 flex-col items-center justify-center gap-2",
              "bg-muted/30 px-6 py-8 text-center",
            )}
          >
            <ImageIcon className="h-7 w-7 text-muted-foreground/60" />

            <p className="text-xs font-medium text-muted-foreground">
              Image unavailable
            </p>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => {
              setLoaded(true);
              setImageError(true);
            }}
            className={cn(
              "block max-h-[32rem] w-auto max-w-full object-contain",
              "transition-opacity duration-200",
              loaded ? "opacity-100" : "absolute opacity-0",
            )}
          />
        )}

        {isPending && (
          <span
            className={cn(
              "pointer-events-none absolute right-2 top-2",
              "rounded-full border border-border/70",
              "bg-background/90 px-2 py-1",
              "text-[10px] font-medium text-muted-foreground",
              "shadow-sm backdrop-blur-sm",
            )}
          >
            New
          </span>
        )}
      </button>

      {/* ======================================================
          CONTROLS
      ======================================================= */}

      <div
        contentEditable={false}
        className={cn(
          "mt-2 overflow-hidden",
          "transition-[max-height,opacity,transform] duration-200",
          selected
            ? "max-h-24 translate-y-0 opacity-100"
            : "pointer-events-none max-h-0 -translate-y-1 opacity-0",
        )}
      >
        <div
          className={cn(
            "flex max-w-full flex-wrap items-center gap-1",
            "rounded-xl border border-border/70",
            "bg-muted/25 p-1 shadow-sm",
          )}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
        >
          {/* Move Up */}

          <button
            type="button"
            onClick={() => moveImage("up")}
            disabled={!canMoveUp}
            title="Move image up"
            aria-label="Move image up"
            className={cn(
              "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg",
              "text-muted-foreground transition-all duration-150",
              "hover:bg-muted hover:text-foreground active:scale-90",
              "disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent",
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>

          {/* Move Down */}

          <button
            type="button"
            onClick={() => moveImage("down")}
            disabled={!canMoveDown}
            title="Move image down"
            aria-label="Move image down"
            className={cn(
              "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg",
              "text-muted-foreground transition-all duration-150",
              "hover:bg-muted hover:text-foreground active:scale-90",
              "disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent",
            )}
          >
            <ArrowDown className="h-4 w-4" />
          </button>

          <div className="mx-0.5 h-5 w-px bg-border" />

          {/* Replace */}

          <button
            type="button"
            onClick={requestReplace}
            title="Replace image"
            aria-label="Replace image"
            className={cn(
              "flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2",
              "text-xs font-medium text-muted-foreground",
              "transition-all duration-150",
              "hover:bg-muted hover:text-foreground active:scale-[0.97]",
            )}
          >
            <RefreshCw className="h-3.5 w-3.5" />

            <span className="hidden sm:inline">Replace</span>
          </button>

          {/* Alt text */}

          <Popover
            open={altOpen}
            onOpenChange={(open) => {
              setAltOpen(open);

              if (open) {
                setAltDraft(alt);
              }
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Edit alt text"
                aria-label="Edit alt text"
                className={cn(
                  "flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2",
                  "text-xs font-medium text-muted-foreground",
                  "transition-all duration-150",
                  "hover:bg-muted hover:text-foreground",
                  "active:scale-[0.97]",
                  altOpen && "bg-primary/10 text-primary",
                )}
              >
                <PencilLine className="h-3.5 w-3.5" />

                <span className="hidden sm:inline">Alt</span>
              </button>
            </PopoverTrigger>

            <PopoverContent
              side="bottom"
              align="start"
              sideOffset={8}
              className="w-[min(22rem,calc(100vw-2rem))] space-y-4"
              onOpenAutoFocus={(event) => {
                event.preventDefault();
              }}
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold">Alternative text</p>

                <p className="text-xs leading-relaxed text-muted-foreground">
                  Describe what is shown in the image for accessibility.
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor={`markdown-image-alt-${node.attrs.src}`}
                  className="text-xs"
                >
                  Description
                </Label>

                <Input
                  id={`markdown-image-alt-${node.attrs.src}`}
                  value={altDraft}
                  onChange={(event) => setAltDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      saveAltText();
                    }
                  }}
                  placeholder="Example: Dashboard showing bot analytics"
                  autoFocus
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full cursor-pointer sm:w-auto"
                  onClick={() => setAltOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  className="w-full cursor-pointer sm:w-auto"
                  onClick={saveAltText}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Duplicate */}

          <button
            type="button"
            onClick={duplicateImage}
            title="Duplicate image"
            aria-label="Duplicate image"
            className={cn(
              "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg",
              "text-muted-foreground transition-all duration-150",
              "hover:bg-muted hover:text-foreground active:scale-90",
            )}
          >
            <Copy className="h-4 w-4" />
          </button>

          <div className="mx-0.5 h-5 w-px bg-border" />

          {/* Delete */}

          <button
            type="button"
            title="Delete image"
            aria-label="Delete image"
            onClick={() => deleteNode()}
            className={cn(
              "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg",
              "text-muted-foreground",
              "transition-all duration-150",
              "hover:bg-destructive/10 hover:text-destructive",
              "active:scale-90",
            )}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Alt status */}

        <div
          className={cn(
            "mt-1.5 flex max-w-full items-center gap-1.5 px-1",
            "text-[11px] text-muted-foreground",
          )}
        >
          <ImageIcon className="h-3 w-3 shrink-0" />

          <span className="truncate">{alt ? alt : "No alternative text"}</span>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
