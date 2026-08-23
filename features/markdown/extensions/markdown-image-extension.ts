import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";

import { ReactNodeViewRenderer } from "@tiptap/react";

import { MarkdownImageNodeView } from "@/features/markdown/components/markdown-image-node-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    markdownImage: {
      setMarkdownImage: (options: {
        src: string;
        alt?: string;
        title?: string | null;
      }) => ReturnType;
    };
  }
}

export type MarkdownImageExtensionOptions = {
  onReplaceRequest?: (position: number) => void;
};

export const MarkdownImage = TiptapNode.create<MarkdownImageExtensionOptions>({
  name: "markdownImage",

  addOptions() {
    return {
      onReplaceRequest: undefined,
    };
  },

  /*
   * Keep the Markdown image node inline
   * so Markdown parsing / serialization
   * remains compatible.
   *
   * Newly inserted images are still
   * wrapped in their own paragraph by
   * MarkdownField.
   */
  inline: true,

  group: "inline",

  atom: true,

  draggable: false,

  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },

      alt: {
        default: "",
      },

      title: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",

      mergeAttributes(HTMLAttributes, {
        class:
          "my-3 block max-h-[32rem] max-w-full rounded-xl border object-contain shadow-sm",

        loading: "lazy",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MarkdownImageNodeView, {
      trackNodeViewPosition: true,
    });
  },

  markdownTokenName: "image",

  parseMarkdown(token, helpers) {
    return helpers.createNode("markdownImage", {
      src: token.href || "",

      alt: token.text || "",

      title: token.title || null,
    });
  },

  renderMarkdown(node) {
    const src = String(node.attrs?.src || "");

    const alt = String(node.attrs?.alt || "").replace(/\]/g, "\\]");

    const title = node.attrs?.title ? String(node.attrs.title) : "";

    const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : "";

    return `![${alt}](${src}${titlePart})`;
  },

  addCommands() {
    return {
      setMarkdownImage:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,

            attrs: options,
          }),
    };
  },
});
