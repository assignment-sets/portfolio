# AI UX: On-The-Fly Markdown Content Negotiation (RFC 9110)

## Overview

**Markdown Content Negotiation** allows a single URL (e.g. `https://gourabmondal.vercel.app/` or a future blog post `/blog/post-name`) to serve two completely different representations depending on who is requesting the page:

1. **Human Browsers** (`Accept: text/html`): Receive standard Server-Side Rendered (SSR) HTML with React components, Tailwind styling, and interactive client widgets.
2. **AI Agents & Crawlers** (`Accept: text/markdown` or explicit `.md` URLs): Receive raw, token-efficient Markdown with layout wrappers, navigation trays, and scripts stripped out.

---

## Architectural Flow

```
                             Client Request (GET /path)
                                         │
                                         ▼
                            proxy.ts (Next.js 16 Proxy)
                     Parses RFC 9110 Accept header (lib/accept.ts)
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     Accept: text/html (Humans)                    Accept: text/markdown (AI Agents)
                 │                                               │
                 ▼                                               ▼
         Page Component (SSR)                        Internal Rewrite: /markdown/path
     Full React + Tailwind HTML                      app/markdown/[[...slug]]/route.ts
       Header: Vary: Accept                                      │
                                                                 ▼
                                                    Internal Fetch: Render SSR HTML
                                                     (Header: x-internal-render: true)
                                                                 │
                                                                 ▼
                                                    node-html-markdown Processor
                                                     - Extract <main> container
                                                     - Strip <nav>, <footer>, <script>
                                                     - Transform to clean Markdown
                                                                 │
                                                                 ▼
                                                    Return text/markdown Response
                                                     Header: Vary: Accept
```

---

## Technical Components

### 1. Next.js 16 Proxy: [`proxy.ts`](../../proxy.ts)

> **Note**: In Next.js 16, the `middleware.ts` file convention was deprecated and renamed to `proxy.ts`.

- **Interception**: Runs on all public page requests before route rendering.
- **Rewriting**: When `text/markdown` is preferred or an explicit `.md` URL is requested, `proxy.ts` rewrites the request internally to `/markdown${pathname}` using `NextResponse.rewrite()`. The browser/curl address bar remains unchanged.
- **Loop Prevention**: Checks for `x-internal-render: true`. If present, the request bypasses the proxy to allow the internal SSR fetch to complete without recursion.
- **`Vary: Accept`**: Injected on both HTML and Markdown branches to ensure Edge CDNs (Vercel, Cloudflare) and browsers cache the two variants separately.

### 2. RFC 9110 Accept Parser: [`lib/accept.ts`](../../lib/accept.ts)

- **Quality Values**: Correctly evaluates `q` weighting (e.g. `Accept: text/markdown, text/html;q=0.9` correctly selects `text/markdown`).
- **Specificity**: Differentiates between specific types (`text/markdown`), range types (`text/*`), and wildcards (`*/*`).
- **Spec Compliance**: Returns `406 Not Acceptable` if a client explicitly rejects all supported types.

### 3. On-The-Fly Compiler: [`app/markdown/[[...slug]]/route.ts`](../../app/markdown/[[...slug]]/route.ts)

- **Zero Static File Duplication**: Rather than generating static `.md` files ahead of time, this route handler fetches the internal SSR HTML of the requested route on the fly.
- **Chrome Removal**:
  - Extracts the `<main>` content container.
  - Drops `<nav>`, `<footer>`, `<script>`, `<style>`, `<noscript>`, and inline `<svg>` code.
  - Removes interactive buttons (theme toggle) and form shells.
- **Semantic DOM Preprocessor (`preprocessHtmlForMarkdown`)**:
  - **Inline Tag Spacing**: Converts inline tag spans in `.project-tags` into spaced backtick code pills (`` `Java` `FastAPI` `Postgresql` ``).
  - **Structured Skill Lists**: Transforms `.skill-row` spans into semantic markdown unordered lists (`- **Languages**: Python, Java, JavaScript`).
  - **Separators for Links**: Inserts middle-dot ` · ` separators between consecutive `<a>` links in `.hero-links`.
  - **Project Metadata & Licenses**: Preserves repository licenses (e.g. `### Title `MIT``) and formats footer timestamps (`[GitHub →](...) · *Updated Aug 2026*`).
  - **Education**: Transforms education timelines into clean bulleted items.
- **Compilation Engine**: Uses `node-html-markdown` to convert the semantic HTML into clean Markdown.
- **Future-Proof**: Whenever future dynamic pages (e.g. blogs, newsletters, database items) are added to the application, they automatically inherit Markdown negotiation without writing any custom parsers.

---

## Verification & Test Cases Matrix

### 1. Human Browser Request (HTML)

```bash
curl -s -i -H "Accept: text/html" http://localhost:3000/
```

- **Response**: `HTTP/1.1 200 OK`
- **Content-Type**: `text/html; charset=utf-8`
- **Body**: Complete React SSR HTML with scripts and layout.

### 2. AI Agent Request (Markdown)

```bash
curl -s -i -H "Accept: text/markdown" http://localhost:3000/
```

- **Response**: `HTTP/1.1 200 OK`
- **Content-Type**: `text/markdown; charset=utf-8`
- **Vary**: `Accept`
- **Body**: Dense Markdown starting directly with `# Gourab Mondal` and listing projects/skills.

### 3. Weighted Crawler Headers

```bash
curl -s -i -H "Accept: text/markdown, text/html;q=0.9" http://localhost:3000/
```

- **Response**: `HTTP/1.1 200 OK`
- **Content-Type**: `text/markdown; charset=utf-8` (Favors `text/markdown` because `q=1.0` > `q=0.9`).

### 4. Explicit Suffix Path

```bash
curl -s -i http://localhost:3000/index.md
```

- **Response**: `HTTP/1.1 200 OK`
- **Content-Type**: `text/markdown; charset=utf-8`

### 5. Missing Subpage / 404

```bash
curl -s -i -H "Accept: text/markdown" http://localhost:3000/error
```

- **Response**: `HTTP/1.1 404 Not Found`
- **Body**: `Error 404: Unable to retrieve content for /error`

### 6. Explicit Format Rejection

```bash
curl -s -i -H "Accept: application/xml" http://localhost:3000/
```

- **Response**: `HTTP/1.1 406 Not Acceptable`
- **Body**: `Not Acceptable\n\nAvailable representations: text/html, text/markdown`
