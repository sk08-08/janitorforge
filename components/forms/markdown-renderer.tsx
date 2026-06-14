"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

// ---------------------------------------------------------------------------
// MarkdownRenderer
// Renders GFM markdown safely with proper styling
// ---------------------------------------------------------------------------

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  if (!content?.trim()) return null;

  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize as any]}
        components={{
          h1: ({ children, ...props }: any) => (
            <h1 className="text-xl font-bold mt-4 mb-2" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }: any) => (
            <h2 className="text-lg font-bold mt-3 mb-1.5" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }: any) => (
            <h3 className="text-base font-semibold mt-2 mb-1" {...props}>
              {children}
            </h3>
          ),
          p: ({ children, ...props }: any) => (
            <p className="mb-2 leading-relaxed" {...props}>
              {children}
            </p>
          ),
          a: ({ children, href, ...props }: any) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
              {...props}
            >
              {children}
            </a>
          ),
          strong: ({ children, ...props }: any) => (
            <strong className="font-bold" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }: any) => (
            <em className="italic" {...props}>
              {children}
            </em>
          ),
          ul: ({ children, ...props }: any) => (
            <ul className="list-disc pl-5 mb-2 space-y-1" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }: any) => (
            <ol className="list-decimal pl-5 mb-2 space-y-1" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }: any) => (
            <li className="leading-relaxed" {...props}>
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }: any) => (
            <blockquote
              className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-2"
              {...props}
            >
              {children}
            </blockquote>
          ),
          code: ({ children, className: codeClass, ...props }: any) => {
            const isInline = !codeClass;
            if (isInline) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="rounded-lg bg-muted p-4 overflow-x-auto mb-2">
                <code className="text-sm font-mono" {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          hr: (props: any) => <hr className="border-border my-4" {...props} />,
          table: ({ children, ...props }: any) => (
            <div className="overflow-x-auto mb-2">
              <table
                className="min-w-full border-collapse border border-border text-sm"
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }: any) => (
            <thead className="bg-muted/50" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }: any) => (
            <th
              className="border border-border px-3 py-2 text-left font-semibold"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }: any) => (
            <td className="border border-border px-3 py-2" {...props}>
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
