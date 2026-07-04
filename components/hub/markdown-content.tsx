"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

type MarkdownBlockAlignment = "left" | "center" | "right";

type MarkdownBlock = {
  alignment: MarkdownBlockAlignment;
  content: string;
};

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  let currentAlignment: MarkdownBlockAlignment = "left";
  let currentLines: string[] = [];

  const pushBlock = () => {
    const blockContent = currentLines.join("\n");
    if (blockContent) {
      blocks.push({ alignment: currentAlignment, content: blockContent });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const marker = line.trim().toLowerCase();

    if (
      marker === ":::left" ||
      marker === ":::center" ||
      marker === ":::right"
    ) {
      pushBlock();
      currentAlignment = marker.slice(3) as MarkdownBlockAlignment;
      continue;
    }

    if (marker === ":::" || marker === ":::") {
      pushBlock();
      currentAlignment = "left";
      continue;
    }

    currentLines.push(line);
  }

  pushBlock();

  return blocks.length > 0 ? blocks : [{ alignment: "left", content }];
}

function renderMarkdown(markdown: string, alignment: MarkdownBlockAlignment) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src || ""}
            alt={alt || ""}
            className={cn(
              "my-3 block h-auto max-h-[70vh] w-auto max-w-full rounded-xl border border-border/60",
              alignment === "center" && "mx-auto",
              alignment === "right" && "ml-auto",
            )}
            loading="lazy"
          />
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
        p: ({ children }) => {
          // If the paragraph is empty, render a line break so it takes up vertical space
          if (!children || (Array.isArray(children) && children.length === 0)) {
            return <br />;
          }
          return (
            <p className="mb-3 last:mb-0 whitespace-pre-wrap">{children}</p>
          );
        },
        h1: ({ children }) => (
          <h1 className="mb-3 text-2xl font-bold tracking-tight">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-3 text-lg font-semibold">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="mb-3 text-base font-semibold">{children}</h4>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 list-disc space-y-1 pl-6">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 list-decimal space-y-1 pl-6">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="marker:text-primary">{children}</li>
        ),
        hr: () => <hr className="my-4 border-border/70" />,
        pre: ({ children }) => (
          <pre className="mb-3 overflow-x-auto rounded-xl border border-border/60 bg-muted p-4 text-sm leading-6">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border border-border/60 px-3 py-2 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border/60 px-3 py-2 align-top">
            {children}
          </td>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary bg-muted/90 pl-4 font-semibold text-2xl">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="rounded text-primary bg-muted-foreground/20 px-1.5 py-0.5 text-[0.85em]">
            {children}
          </code>
        ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div
      className={cn("prose prose-sm max-w-none dark:prose-invert", className)}
    >
      {blocks.map((block, index) => (
        <div
          key={`${block.alignment}-${index}`}
          className="mb-4 last:mb-0"
          style={{ textAlign: block.alignment }}
        >
          {renderMarkdown(block.content, block.alignment)}
        </div>
      ))}
    </div>
  );
}
