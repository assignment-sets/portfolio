import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { remarkAlert } from "remark-github-blockquote-alert";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from "@shikijs/rehype";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
  transformerNotationFocus,
  transformerNotationErrorLevel,
} from "@shikijs/transformers";
import type { Root, Element, Node, Parent } from "hast";
import { sanitizeBlogHtml } from "./sanitize";

/**
 * Custom Rehype plugin: Intercepts code blocks with `language-mermaid`
 * before Shiki processes them, transforming them into dynamic Mermaid containers.
 */
function rehypeMermaid() {
  return (tree: Root) => {
    const visit = (node: Node, parent: Parent | null, index: number) => {
      if (!node) return;

      if (
        node.type === "element" &&
        (node as Element).tagName === "pre" &&
        parent &&
        Array.isArray(parent.children)
      ) {
        const preEl = node as Element;
        const firstChild = preEl.children?.[0] as Element | undefined;

        if (firstChild && firstChild.type === "element" && firstChild.tagName === "code") {
          const classNames = (firstChild.properties?.className as string[]) || [];
          const isMermaid = Array.isArray(classNames) && classNames.some((c) => String(c).includes("mermaid"));

          if (isMermaid) {
            const rawCode = extractText(firstChild);
            parent.children[index] = {
              type: "element",
              tagName: "div",
              properties: {
                className: ["mermaid-diagram"],
                "data-mermaid-code": encodeURIComponent(rawCode),
              },
              children: [
                {
                  type: "element",
                  tagName: "div",
                  properties: { className: ["mermaid-loading-skeleton"] },
                  children: [{ type: "text", value: "Rendering diagram..." }],
                },
                {
                  type: "element",
                  tagName: "pre",
                  properties: { className: ["mermaid"], style: "display:none" },
                  children: [{ type: "text", value: rawCode }],
                },
              ],
            };
            return;
          }
        }
      }

      if ("children" in node && Array.isArray((node as Parent).children)) {
        const parentNode = node as Parent;
        parentNode.children.forEach((child, i) => visit(child, parentNode, i));
      }
    };

    visit(tree, null, 0);
  };
}

/**
 * Helper to recursively extract plain text from an AST node.
 */
function extractText(node: Node): string {
  if (!node) return "";
  if (node.type === "text" && "value" in node) {
    return String(node.value || "");
  }
  if ("children" in node && Array.isArray((node as Parent).children)) {
    return (node as Parent).children.map(extractText).join("");
  }
  return "";
}

/**
 * Custom Rehype plugin: Wraps `<pre class="shiki">` in a `.code-block-wrapper`
 * with a title bar indicating the detected language.
 */
function rehypeWrapCodeBlocks() {
  return (tree: Root) => {
    const visit = (node: Node, parent: Parent | null, index: number) => {
      if (!node) return;

      if (
        node.type === "element" &&
        (node as Element).tagName === "pre" &&
        parent &&
        Array.isArray(parent.children) &&
        (node as Element).properties &&
        "data-language" in (node as Element).properties
      ) {
        const el = node as Element;
        const rawLang = String(el.properties["data-language"] || "text").toLowerCase();
        const displayLang = formatLanguageName(rawLang);

        const wrapper: Element = {
          type: "element",
          tagName: "div",
          properties: {
            className: ["code-block-wrapper"],
            "data-language": rawLang,
          },
          children: [
            {
              type: "element",
              tagName: "div",
              properties: { className: ["code-block-header"] },
              children: [
                {
                  type: "element",
                  tagName: "span",
                  properties: { className: ["code-block-lang"] },
                  children: [{ type: "text", value: displayLang }],
                },
              ],
            },
            el,
          ],
        };

        parent.children[index] = wrapper;
        return;
      }

      if ("children" in node && Array.isArray((node as Parent).children)) {
        const parentNode = node as Parent;
        parentNode.children.forEach((child, i) => visit(child, parentNode, i));
      }
    };

    visit(tree, null, 0);
  };
}

/**
 * Custom Rehype plugin: Wraps `<table>` elements in a `.table-wrapper`
 * for responsive horizontal scroll on mobile devices.
 */
function rehypeWrapTables() {
  return (tree: Root) => {
    const visit = (node: Node, parent: Parent | null, index: number) => {
      if (!node) return;

      if (
        node.type === "element" &&
        (node as Element).tagName === "table" &&
        parent &&
        Array.isArray(parent.children)
      ) {
        const wrapper: Element = {
          type: "element",
          tagName: "div",
          properties: { className: ["table-wrapper"] },
          children: [node as Element],
        };
        parent.children[index] = wrapper;
        return;
      }

      if ("children" in node && Array.isArray((node as Parent).children)) {
        const parentNode = node as Parent;
        parentNode.children.forEach((child, i) => visit(child, parentNode, i));
      }
    };

    visit(tree, null, 0);
  };
}

/**
 * Clean display names for popular programming languages.
 */
function formatLanguageName(lang: string): string {
  const map: Record<string, string> = {
    ts: "TypeScript",
    typescript: "TypeScript",
    tsx: "TSX",
    js: "JavaScript",
    javascript: "JavaScript",
    jsx: "JSX",
    py: "Python",
    python: "Python",
    rs: "Rust",
    rust: "Rust",
    go: "Go",
    golang: "Go",
    bash: "Bash",
    sh: "Shell",
    shell: "Shell",
    zsh: "Zsh",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    html: "HTML",
    css: "CSS",
    sql: "SQL",
    dockerfile: "Dockerfile",
    docker: "Docker",
    md: "Markdown",
    markdown: "Markdown",
    text: "Plain Text",
  };
  return map[lang] || lang.toUpperCase();
}

/**
 * Compiles Markdown content into rich, sanitized HTML with:
 * - Shiki dual-theme syntax highlighting (Light & Dark)
 * - Diffs, highlights, word highlights, focus
 * - Mermaid diagram interception
 * - GitHub-style blockquote alerts
 * - Responsive tables
 * - Safe HTML sanitization
 */
export async function compileBlogMarkdown(content: string): Promise<string> {
  if (!content || !content.trim()) {
    return "";
  }

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkAlert)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeMermaid)
    .use(rehypeShiki, {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      fallbackLanguage: "text",
      defaultColor: "light",
      cssVariablePrefix: "--shiki-",
      transformers: [
        {
          name: "preserve-language-meta",
          pre(node) {
            node.properties["data-language"] = this.options.lang || "text";
          },
        },
        transformerNotationDiff(),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationFocus(),
        transformerNotationErrorLevel(),
      ],
    })
    .use(rehypeWrapCodeBlocks)
    .use(rehypeWrapTables)
    .use(rehypeStringify);

  const vfile = await processor.process(content);
  const rawHtml = String(vfile);

  return sanitizeBlogHtml(rawHtml);
}
