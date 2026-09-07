# Engineering Documentation

Welcome to the technical documentation for the Gourab Mondal portfolio and web platform.

This platform is engineered using **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS v4**. Beyond delivering a fast, responsive visual experience for human visitors, it implements first-class **AI / LLM UX** capabilities to serve AI models, agents, and scrapers with high-density, token-efficient Markdown representations.

---

## Documentation Index

### AI / LLM UX

- [**Root `/llms.txt` Endpoint**](ai-ux/llms-txt.md)
  - Details the dedicated `/llms.txt` standard route, dynamic data synthesis from `data/portfolio.ts`, crawler discovery tags, and sitemap integration.
- [**Markdown Content Negotiation (RFC 9110)**](ai-ux/markdown-content-negotiation.md)
  - Details the edge content negotiation architecture powered by Next.js 16 `proxy.ts`, RFC 9110 `Accept` parsing, and on-the-fly SSR DOM-to-Markdown compilation via `node-html-markdown`.

### Fullstack APIs

- [**Contact Email Route (`/api/send-email`)**](api/contact-email.md)
  - Details the native Next.js 16 Route Handler, Zod validation, HTML sanitization, Nodemailer SMTP with `replyTo` support, and in-memory IP rate limiting.
- [**Newsletter & MongoDB Persistence**](newsletter/newsletter-architecture.md)
  - Details the self-hosted newsletter platform, MongoDB Atlas connection pooling (`lib/mongodb.ts`), Resend batch delivery engine, one-click unsubscribe handling, and secure Vercel Cron dispatch.

### Analytics & Observability

- [**Google Analytics 4 & Custom Event Tracking**](analytics/event-tracking.md)
  - Details the official `@next/third-parties/google` integration, ad-blocker resilient dispatch architecture, and the complete event catalog (resume clicks, project interest, form submits, theme preferences).

### Dynamic Data Layer

- [**Dynamic GitHub Repositories & ISR Caching**](data/github-integration.md)
  - Details the server-side GitHub REST API integration, Incremental Static Regeneration (1h background sync), tag casing normalization, and silent static fallback architecture.

### SEO & Discoverability

- [**SEO & Lighthouse Technical Architecture**](seo/search-engine-optimization.md)
  - Details the `metadataBase` canonical routing, dynamic OpenGraph social image (`app/opengraph-image.tsx`), Schema.org JSON-LD `ProfilePage` graph, WCAG AA contrast compliance, and `/api/` crawler protection.

### Offline & PWA Resilience

- [**Offline Architecture & PWA Caching**](offline/pwa-and-offline-caching.md)
  - Details the native Service Worker (`public/sw.js`), Network-First HTML caching, Next.js 16 Web App Manifest (`app/manifest.ts`), and React 19 `useSyncExternalStore` offline indicator.

---

## Quick Testing Cheatsheet

### 1. Test `/llms.txt` Endpoint

```bash
curl -i http://localhost:3000/llms.txt
```

### 2. Test Human Browser SSR Interface

```bash
curl -i -H "Accept: text/html" http://localhost:3000/
```

### 3. Test AI Agent Markdown Content Negotiation

```bash
curl -i -H "Accept: text/markdown" http://localhost:3000/
```

### 4. Test Weighted Crawler Preferences

```bash
curl -i -H "Accept: text/markdown, text/html;q=0.9" http://localhost:3000/
```

### 5. Test Explicit `.md` Path

```bash
curl -i http://localhost:3000/index.md
```
