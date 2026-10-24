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

### Core Platform & APIs

- [**Contact Email Route (`/api/send-email`)**](api/contact-email.md)
  - Details the native Next.js 16 Route Handler, Zod validation, Nodemailer SMTP with `replyTo` support, and edge rate limiting.
- [**Availability Status Route (`/api/availability`)**](#availability-status)
  - Authenticated route to toggle or set the "Available for work" status badge on the Hero section with instant ISR revalidation.
- [**Newsletter & MongoDB Persistence**](newsletter/newsletter-architecture.md)
  - Details the self-hosted newsletter platform, MongoDB Atlas connection pooling (`lib/mongodb.ts`), Gmail SMTP sequential delivery, one-click unsubscribe handling, and Vercel Cron dispatch.
- [**Personal Blog Platform & Authoring Studio**](blog/blog-architecture.md)
  - Details the native blogging system, MongoDB Atlas Lucene fuzzy search (`$search`), authenticated authoring studio (`/studio/blog`), paginated public API (`/api/blog`), dynamic OpenGraph SEO, and RFC 9110 Markdown negotiation integration.

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

### Security & Transport Hardening

- [**HTTP Security Headers & Defensive Transport Architecture**](security/http-headers-and-transport-security.md)
  - Details defensive browser headers (CSP, COOP, HSTS, Permissions-Policy), route-specific caching policies, AI endpoint CORS/CORP, `Clear-Site-Data` logout invalidation, Sec-Fetch CSRF guards, SSRF protocol normalization, and cryptographic secret isolation.

### Performance & Caching

- [**Caching & Revalidation Architecture**](caching/caching-and-revalidation.md)
  - Details the 5-layer multi-tiered caching topology, Next.js Data Cache (`unstable_cache`), background ISR policies, on-demand tag invalidation (`revalidateTag`), dynamic sitemap caching, and MongoDB connection pooling.

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

### 6. Test Security Headers (COOP, CSP, HSTS, Permissions-Policy)

```bash
curl -I http://localhost:3000/
```

### 7. Test Cross-Site CSRF Rejection (Sec-Fetch-Site)

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/send-email -H "sec-fetch-site: cross-site"
```
