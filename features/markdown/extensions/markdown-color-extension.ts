import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    markdownColor: {
      setMarkdownColor: (color: string) => ReturnType;

      unsetMarkdownColor: () => ReturnType;
    };
  }
}

export const MarkdownColor = Mark.create({
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

      if (!match) {
        return undefined;
      }

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
        ({ commands }) =>
          commands.setMark(this.name, {
            color,
          }),

      unsetMarkdownColor:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
