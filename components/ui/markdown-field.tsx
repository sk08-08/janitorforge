"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bold,
  Code,
  Eye,
  Italic,
  Link,
  List,
  ListOrdered,
  Palette,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/forms/markdown-renderer";

const COLOR_PRESETS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
  "#f43f5e",
] as const;

// Ported from components/forms/form-builder.tsx (not exported from source)
function applyToggleWrap(
  value: string,
  start: number,
  end: number,
  before: string,
  after = "",
) {
  const val = value || "";
  const sel = val.substring(start, end);
  if (sel.startsWith(before) && sel.endsWith(after)) {
    const inner = sel.substring(before.length, sel.length - after.length);
    return {
      newValue: val.substring(0, start) + inner + val.substring(end),
      newStart: start,
      newEnd: start + inner.length,
    };
  }
  if (start === end) {
    const openIndex = val.lastIndexOf(
      before,
      Math.max(0, start - before.length),
    );
    const closeIndex = val.indexOf(after || before, start);
    if (
      openIndex !== -1 &&
      closeIndex !== -1 &&
      openIndex < start &&
      start <= closeIndex
    ) {
      const inner = val.substring(openIndex + before.length, closeIndex);
      const newValue =
        val.substring(0, openIndex) +
        inner +
        val.substring(closeIndex + after.length);
      return {
        newValue,
        newStart: openIndex,
        newEnd: openIndex + inner.length,
      };
    }
    if (val.startsWith(before) && val.endsWith(after)) {
      const inner = val.substring(before.length, val.length - after.length);
      return { newValue: inner, newStart: 0, newEnd: inner.length };
    }
    const newValue = before + val + after;
    return { newValue, newStart: before.length, newEnd: before.length };
  }
  const wrapped =
    val.substring(0, start) + before + sel + after + val.substring(end);
  return {
    newValue: wrapped,
    newStart: start + before.length,
    newEnd: start + before.length + sel.length,
  };
}

function toggleListMarkersForText(text: string, type: "ul" | "ol") {
  const lines = String(text || "").split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim() !== "");
  if (nonEmpty.length === 0) return text;
  const isAllMarked = nonEmpty.every((l) =>
    type === "ul" ? /^\s*[-*]\s+/.test(l) : /^\s*\d+\.\s+/.test(l),
  );
  if (isAllMarked) {
    return lines.map((l) => l.replace(/^\s*([-*]|\d+\.)\s+/, "")).join("\n");
  }
  if (type === "ul") {
    return lines.map((l) => (l.trim() === "" ? l : `- ${l}`)).join("\n");
  }
  let counter = 1;
  return lines
    .map((l) => (l.trim() === "" ? l : `${counter++}. ${l}`))
    .join("\n");
}

function isWrapActive(
  value: string,
  start: number,
  end: number,
  before: string,
  after = "",
) {
  const val = value || "";
  const safeStart = Math.max(0, Math.min(start, val.length));
  const safeEnd = Math.max(safeStart, Math.min(end, val.length));
  const sel = val.substring(safeStart, safeEnd);

  if (safeStart !== safeEnd) {
    return sel.startsWith(before) && sel.endsWith(after);
  }

  const openIndex = val.lastIndexOf(
    before,
    Math.max(0, safeStart - before.length),
  );
  const closeIndex = val.indexOf(after || before, safeStart);
  return (
    openIndex !== -1 &&
    closeIndex !== -1 &&
    openIndex < safeStart &&
    safeStart <= closeIndex
  );
}

function areSelectedLinesMarked(
  value: string,
  start: number,
  end: number,
  type: "ul" | "ol",
) {
  const val = String(value || "");
  const safeStart = Math.max(0, Math.min(start, val.length));
  const safeEnd = Math.max(safeStart, Math.min(end, val.length));
  const lineStart = Math.max(
    0,
    val.lastIndexOf("\n", Math.max(0, safeStart - 1)) + 1,
  );
  let lineEnd = val.indexOf("\n", safeEnd);
  if (lineEnd === -1) lineEnd = val.length;
  const lines = val
    .substring(lineStart, lineEnd)
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  if (lines.length === 0) return false;
  return lines.every((l) =>
    type === "ul" ? /^\s*[-*]\s+/.test(l) : /^\s*\d+\.\s+/.test(l),
  );
}

function findLinkRangeAtSelection(value: string, start: number, end: number) {
  const val = String(value || "");
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const safeStart = Math.max(0, Math.min(start, val.length));
  const safeEnd = Math.max(safeStart, Math.min(end, val.length));

  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(val)) !== null) {
    const mStart = match.index;
    const mEnd = mStart + match[0].length;
    const intersects =
      safeStart === safeEnd
        ? safeStart >= mStart && safeStart <= mEnd
        : safeStart < mEnd && safeEnd > mStart;
    if (intersects) {
      return {
        start: mStart,
        end: mEnd,
        text: match[1],
        url: match[2],
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// MarkdownField
// Drop-in replacement for <Textarea> with a compact formatting toolbar and
// an Edit/Preview toggle. Stores and emits raw Markdown — no schema changes.
// ---------------------------------------------------------------------------

interface MarkdownFieldProps extends Omit<
  React.ComponentProps<"textarea">,
  "onChange"
> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  minEditorHeightRem?: number;
  previewMaxHeightRem?: number;
}

export function MarkdownField({
  value = "",
  onChange,
  className,
  rows,
  placeholder,
  minEditorHeightRem,
  previewMaxHeightRem = 34,
  ...props
}: MarkdownFieldProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [selectionVersion, setSelectionVersion] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(
    null,
  );
  const colorInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<
    Array<{ value: string; start: number; end: number }>
  >([]);
  const redoRef = useRef<Array<{ value: string; start: number; end: number }>>(
    [],
  );
  const [selectedColor, setSelectedColor] = useState("#ef4444");

  const setSelectionFromTextArea = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const next = {
      start: ta.selectionStart ?? 0,
      end: ta.selectionEnd ?? 0,
    };
    const prev = selectionRef.current;
    selectionRef.current = {
      start: next.start,
      end: next.end,
    };
    if (prev.start !== next.start || prev.end !== next.end) {
      setSelectionVersion((v) => v + 1);
    }
  }, []);

  const pushHistory = useCallback(
    (snapshot: { value: string; start: number; end: number }) => {
      const current = historyRef.current;
      const last = current[current.length - 1];
      if (
        last &&
        last.value === snapshot.value &&
        last.start === snapshot.start &&
        last.end === snapshot.end
      ) {
        return;
      }
      current.push(snapshot);
      if (current.length > 100) {
        current.shift();
      }
    },
    [],
  );

  const applyValue = useCallback(
    (
      nextValue: string,
      nextSelection?: { start: number; end: number },
      options?: { recordHistory?: boolean; clearRedo?: boolean },
    ) => {
      const recordHistory = options?.recordHistory ?? true;
      const clearRedo = options?.clearRedo ?? true;
      if (recordHistory) {
        pushHistory({
          value: String(value || ""),
          start: selectionRef.current.start,
          end: selectionRef.current.end,
        });
      }
      if (clearRedo) {
        redoRef.current = [];
      }
      if (nextSelection) {
        pendingSelectionRef.current = nextSelection;
      }
      onChange?.({
        target: { value: nextValue },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    },
    [onChange, pushHistory, value],
  );

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const pending = pendingSelectionRef.current;
    if (!pending) return;
    pendingSelectionRef.current = null;
    requestAnimationFrame(() => {
      try {
        ta.focus();
        ta.setSelectionRange(pending.start, pending.end);
        selectionRef.current = { start: pending.start, end: pending.end };
      } catch {}
    });
  }, [value]);

  const applyFormat = useCallback(
    (before: string, after = "") => {
      const ta = taRef.current;
      if (!ta) return;
      setSelectionFromTextArea();
      const result = applyToggleWrap(
        String(value),
        ta.selectionStart ?? 0,
        ta.selectionEnd ?? ta.selectionStart ?? 0,
        before,
        after,
      );
      applyValue(result.newValue, {
        start: result.newStart,
        end: result.newEnd,
      });
    },
    [value, applyValue, setSelectionFromTextArea],
  );

  const applyList = useCallback(
    (type: "ul" | "ol") => {
      const ta = taRef.current;
      if (!ta) return;
      setSelectionFromTextArea();
      const v = String(value);
      const start = ta.selectionStart ?? 0;
      const end = ta.selectionEnd ?? start;
      const lineStart = Math.max(
        0,
        v.lastIndexOf("\n", Math.max(0, start - 1)) + 1,
      );
      let lineEnd = v.indexOf("\n", end);
      if (lineEnd === -1) lineEnd = v.length;
      const toggled = toggleListMarkersForText(
        v.substring(lineStart, lineEnd),
        type,
      );
      applyValue(v.substring(0, lineStart) + toggled + v.substring(lineEnd), {
        start: lineStart,
        end: lineStart + toggled.length,
      });
    },
    [value, applyValue, setSelectionFromTextArea],
  );

  const applyLink = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    setSelectionFromTextArea();

    const val = String(value || "");
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? start;
    const selected = val.substring(start, end);
    const selectedTrimmed = selected.trim();

    const linkRange = findLinkRangeAtSelection(val, start, end);
    if (linkRange) {
      const newUrl = window.prompt("Link URL", linkRange.url || "https://");
      if (!newUrl) return;
      const replacement = `[${linkRange.text}](${newUrl.trim()})`;
      const newValue =
        val.substring(0, linkRange.start) +
        replacement +
        val.substring(linkRange.end);
      const newEnd = linkRange.start + replacement.length;
      applyValue(newValue, { start: newEnd, end: newEnd });
      return;
    }

    if (start !== end) {
      const looksLikeUrl = /^https?:\/\//i.test(selectedTrimmed);
      const url = looksLikeUrl ? selectedTrimmed : "https://";
      const replacement = `[${selected}](${url})`;
      const newValue =
        val.substring(0, start) + replacement + val.substring(end);

      if (looksLikeUrl) {
        const newEnd = start + replacement.length;
        applyValue(newValue, { start: newEnd, end: newEnd });
      } else {
        const urlStart = start + selected.length + 3;
        const urlEnd = urlStart + url.length;
        applyValue(newValue, { start: urlStart, end: urlEnd });
      }
      return;
    }

    const template = "[link text](https://)";
    const newValue = val.substring(0, start) + template + val.substring(end);
    applyValue(newValue, { start: start + 1, end: start + 10 });
  }, [applyValue, setSelectionFromTextArea, value]);

  const applyColor = useCallback(
    (color: string) => {
      const ta = taRef.current;
      if (!ta) return;

      const safeColor = /^#[0-9a-fA-F]{6}$/.test(color)
        ? color.toLowerCase()
        : selectedColor;
      setSelectionFromTextArea();

      const val = String(value || "");
      const start = ta.selectionStart ?? 0;
      const end = ta.selectionEnd ?? start;
      const selectedText = val.substring(start, end);

      if (start !== end) {
        const coloredChunkMatch = selectedText.match(
          /^\[([\s\S]+)\]\{#[0-9a-fA-F]{3,6}\}$/,
        );
        const content = coloredChunkMatch ? coloredChunkMatch[1] : selectedText;
        const replacement = `[${content}]{${safeColor}}`;
        const newValue =
          val.substring(0, start) + replacement + val.substring(end);
        const innerStart = start + 1;
        const innerEnd = innerStart + content.length;
        applyValue(newValue, { start: innerStart, end: innerEnd });
        return;
      }

      const replacement = `[text]{${safeColor}}`;
      const newValue =
        val.substring(0, start) + replacement + val.substring(end);
      applyValue(newValue, { start: start + 1, end: start + 5 });
    },
    [applyValue, selectedColor, setSelectionFromTextArea, value],
  );

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const previous = historyRef.current.pop();
    if (!previous) return;
    redoRef.current.push({
      value: String(value || ""),
      start: selectionRef.current.start,
      end: selectionRef.current.end,
    });
    applyValue(
      previous.value,
      { start: previous.start, end: previous.end },
      {
        recordHistory: false,
        clearRedo: false,
      },
    );
  }, [applyValue, value]);

  const redo = useCallback(() => {
    if (redoRef.current.length === 0) return;
    const next = redoRef.current.pop();
    if (!next) return;
    pushHistory({
      value: String(value || ""),
      start: selectionRef.current.start,
      end: selectionRef.current.end,
    });
    applyValue(
      next.value,
      { start: next.start, end: next.end },
      {
        recordHistory: false,
        clearRedo: false,
      },
    );
  }, [applyValue, pushHistory, value]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      pushHistory({
        value: String(value || ""),
        start: selectionRef.current.start,
        end: selectionRef.current.end,
      });
      redoRef.current = [];
      onChange?.(e);
      selectionRef.current = {
        start: e.target.selectionStart ?? 0,
        end: e.target.selectionEnd ?? 0,
      };
    },
    [onChange, pushHistory, value],
  );

  const activeState = useMemo(() => {
    const start = selectionRef.current.start;
    const end = selectionRef.current.end;
    const currentValue = String(value || "");
    return {
      bold: isWrapActive(currentValue, start, end, "**", "**"),
      italic: isWrapActive(currentValue, start, end, "*", "*"),
      code: isWrapActive(currentValue, start, end, "`", "`"),
      ul: areSelectedLinesMarked(currentValue, start, end, "ul"),
      ol: areSelectedLinesMarked(currentValue, start, end, "ol"),
      link: !!findLinkRangeAtSelection(currentValue, start, end),
    };
  }, [value, selectionVersion]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key.toLowerCase();
      if (key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (key === "z") {
        e.preventDefault();
        undo();
      } else if (key === "y") {
        e.preventDefault();
        redo();
      } else if (key === "b") {
        e.preventDefault();
        applyFormat("**", "**");
      } else if (key === "i") {
        e.preventDefault();
        applyFormat("*", "*");
      } else if (key === "`") {
        e.preventDefault();
        applyFormat("`", "`");
      } else if (key === "k") {
        e.preventDefault();
        applyLink();
      }
    },
    [applyFormat, applyLink, redo, undo],
  );

  const computedMinRem = rows ? Math.max(rows * 1.5, 7) : 7;
  const minHeight = `${Math.max(minEditorHeightRem ?? 0, computedMinRem)}rem`;

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs",
        "transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
      )}
    >
      {/* Formatting toolbar */}
      <div className="flex flex-col gap-2 border-b border-border/50 bg-muted/30 px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-0.5 min-w-0">
          <MdButton
            onClick={() => applyFormat("**", "**")}
            title="Bold (Ctrl+B)"
            active={activeState.bold}
          >
            <Bold className="h-3.5 w-3.5" />
          </MdButton>
          <MdButton
            onClick={() => applyFormat("*", "*")}
            title="Italic (Ctrl+I)"
            active={activeState.italic}
          >
            <Italic className="h-3.5 w-3.5" />
          </MdButton>
          <MdButton
            onClick={() => applyFormat("`", "`")}
            title="Inline code (Ctrl+`)"
            active={activeState.code}
          >
            <Code className="h-3.5 w-3.5" />
          </MdButton>
          <MdButton
            onClick={applyLink}
            title="Link (Ctrl+K)"
            active={activeState.link}
          >
            <Link className="h-3.5 w-3.5" />
          </MdButton>
          <div className="mx-1 h-4 w-px bg-border/60" />
          <MdButton
            onClick={() => colorInputRef.current?.click()}
            title="Text color"
          >
            <Palette className="h-3.5 w-3.5" style={{ color: selectedColor }} />
          </MdButton>
          <input
            ref={colorInputRef}
            type="color"
            value={selectedColor}
            onChange={(e) => {
              const next = e.target.value;
              setSelectedColor(next);
              applyColor(next);
            }}
            className="sr-only"
            aria-label="Pick markdown text color"
          />
          <div className="flex items-center gap-1 pr-1">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  "h-4 w-4 rounded-full border border-border/70 transition-transform hover:scale-110",
                  selectedColor === color && "ring-2 ring-ring ring-offset-1",
                )}
                style={{ backgroundColor: color }}
                onClick={() => {
                  setSelectedColor(color);
                  applyColor(color);
                }}
                title={`Apply ${color}`}
                aria-label={`Apply ${color}`}
              />
            ))}
          </div>
          <div className="mx-1 h-4 w-px bg-border/60" />
          <MdButton
            onClick={() => applyList("ul")}
            title="Bullet list"
            active={activeState.ul}
          >
            <List className="h-3.5 w-3.5" />
          </MdButton>
          <MdButton
            onClick={() => applyList("ol")}
            title="Numbered list"
            active={activeState.ol}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </MdButton>
        </div>

        {/* Edit / Preview toggle */}
        <div className="flex w-full shrink-0 overflow-hidden rounded border border-border/60 bg-background text-xs sm:ml-auto sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setMode("edit");
              requestAnimationFrame(() => taRef.current?.focus());
            }}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-1 px-2.5 py-1 transition-colors sm:flex-none",
              mode === "edit"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-1 border-l border-border/60 px-2.5 py-1 transition-colors sm:flex-none",
              mode === "preview"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
        </div>
      </div>

      {/* Edit mode */}
      {mode === "edit" ? (
        <textarea
          ref={taRef}
          data-slot="textarea"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSelect={setSelectionFromTextArea}
          onClick={setSelectionFromTextArea}
          onKeyUp={setSelectionFromTextArea}
          rows={rows}
          placeholder={placeholder}
          style={{ minHeight }}
          className={cn(
            "w-full resize-y bg-transparent px-4 py-2 text-base outline-none",
            "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          {...props}
        />
      ) : (
        /* Preview mode */
        <div
          className={cn("overflow-y-auto px-4 py-2", className)}
          style={{
            minHeight,
            maxHeight: `min(72vh, ${previewMaxHeightRem}rem)`,
          }}
        >
          {value?.trim() ? (
            <MarkdownRenderer content={value} className="text-sm" />
          ) : (
            <p className="text-sm italic text-muted-foreground">
              {placeholder ?? "Nothing to preview yet."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MdButton({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-7 w-7 cursor-pointer items-center justify-center rounded transition-colors",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
