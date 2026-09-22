import sanitizeHtml from "sanitize-html";

/**
 * Escapes characters that have special meaning in regular expressions.
 * Used across MongoDB text queries to prevent ReDoS and unintended filter matches.
 */
export function escapeRegex(str: string): string {
  if (!str) return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Sandboxed HTML sanitization options for rendered blog articles.
 * Enforces strict tag allowlists, attribute filtering, external link safety,
 * and eliminates all script/iframe/event-handler injection vectors.
 */
const BLOG_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    // Headings & paragraphs
    "h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span", "hr", "br",
    // Typography & emphasis
    "blockquote", "pre", "code", "strong", "em", "b", "i", "del", "s",
    "strike", "sub", "sup", "mark", "small", "kbd", "abbr",
    // Lists
    "ul", "ol", "li",
    // Tables
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
    // Media & semantic grouping
    "a", "img", "figure", "figcaption", "details", "summary",
  ],
  allowedAttributes: {
    "*": ["class", "id", "title"],
    a: ["href", "name", "target", "rel", "title"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    th: ["align", "colspan", "rowspan", "scope"],
    td: ["align", "colspan", "rowspan"],
    pre: ["class"],
    code: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href || "";
      const isExternal =
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("//");

      return {
        tagName: "a",
        attribs: {
          ...attribs,
          ...(isExternal
            ? {
                target: "_blank",
                rel: "noopener noreferrer",
              }
            : {}),
        },
      };
    },
    img: (tagName, attribs) => ({
      tagName: "img",
      attribs: {
        ...attribs,
        loading: attribs.loading || "lazy",
      },
    }),
  },
  nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "object", "embed"],
};

/**
 * Sanitizes compiled blog HTML to prevent Stored XSS and DOM-clobbering.
 */
export function sanitizeBlogHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return "";
  return sanitizeHtml(dirtyHtml, BLOG_SANITIZE_OPTIONS);
}

/**
 * Sandboxed HTML sanitization options for newsletter emails.
 * Permits email-safe inline styles and table layouts while discarding executable content.
 */
const EMAIL_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "html", "head", "body", "title", "meta", "style",
    "h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span", "hr", "br",
    "blockquote", "pre", "code", "strong", "em", "b", "i", "del", "sub", "sup",
    "ul", "ol", "li",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
    "a", "img",
  ],
  allowedAttributes: {
    "*": [
      "style", "class", "id", "align", "valign", "width", "height",
      "bgcolor", "border", "cellpadding", "cellspacing",
    ],
    html: ["lang"],
    meta: ["charset", "name", "content", "http-equiv"],
    a: ["href", "target", "title", "rel"],
    img: ["src", "alt", "title", "width", "height", "border", "style"],
    table: ["border", "cellpadding", "cellspacing", "width", "style", "class", "align"],
    td: ["align", "valign", "width", "height", "style", "class", "colspan", "rowspan"],
    th: ["align", "valign", "width", "height", "style", "class", "colspan", "rowspan"],
  },
  allowedStyles: {
    "*": {
      "color": [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i, /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([\d.]+)\s*\)$/i, /^[a-z]+$/i],
      "text-align": [/^(?:left|right|center|justify)$/i],
      "font-size": [/^\d+(?:px|em|rem|%)$/i],
      "font-weight": [/^\d+$/i, /^(?:bold|normal|lighter|bolder)$/i],
      "font-family": [/.+/],
      "line-height": [/^\d+(?:\.\d+)?(?:px|em|rem|%)?$/i],
      "margin": [/.+/],
      "margin-top": [/.+/],
      "margin-bottom": [/.+/],
      "margin-left": [/.+/],
      "margin-right": [/.+/],
      "padding": [/.+/],
      "padding-top": [/.+/],
      "padding-bottom": [/.+/],
      "padding-left": [/.+/],
      "padding-right": [/.+/],
      "background-color": [/.+/],
      "background": [/.+/],
      "border": [/.+/],
      "border-top": [/.+/],
      "border-bottom": [/.+/],
      "border-left": [/.+/],
      "border-right": [/.+/],
      "border-radius": [/.+/],
      "max-width": [/.+/],
      "max-height": [/.+/],
      "width": [/.+/],
      "height": [/.+/],
      "display": [/^(?:inline|block|inline-block|table|table-cell|none)$/i],
      "text-decoration": [/^(?:none|underline|line-through)$/i],
      "opacity": [/^\d+(?:\.\d+)?$/],
      "overflow": [/^(?:hidden|visible|auto|scroll)$/i],
      "-webkit-text-size-adjust": [/.+/],
      "-ms-text-size-adjust": [/.+/],
      "mso-table-lspace": [/.+/],
      "mso-table-rspace": [/.+/],
      "-ms-interpolation-mode": [/.+/],
      "-webkit-font-smoothing": [/.+/],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  nonTextTags: ["script", "textarea", "option", "noscript", "iframe", "object", "embed"],
};

/**
 * Sanitizes compiled newsletter HTML to ensure safe email dispatch and studio previews.
 */
export function sanitizeEmailHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return "";
  return sanitizeHtml(dirtyHtml, EMAIL_SANITIZE_OPTIONS);
}
