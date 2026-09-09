<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Portfolio — Agent Guide

> Next.js 16 (App Router) + React 19 + Tailwind CSS v4. Single-page portfolio with AI/LLM UX, newsletter, offline/PWA, analytics, and SEO subsystems.

## 1. Commands

```bash
npm run dev              # next dev (Turbopack)
npm run build            # next build — verify after layout/proxy/manifest changes
npm run lint             # eslint (next/core-web-vitals + typescript flat config)
npm run newsletter:sync  # tsx scripts/newsletter-sync.ts — upsert newsletters/issue-01.md
npm run newsletter:test  # tsx scripts/newsletter-sync.ts --test — send preview via Gmail SMTP
```

No test suite. Verify manually via `curl` cheatsheet in `docs/README.md:47`.

## 2. Project Structure

```
app/                      # App Router
  layout.tsx              # RootLayout + metadataBase + jsonLd + GA + ThemeInit + SW
  page.tsx                # Home — composes Navbar/Hero/Skills/Projects/Experience/Education/Contact/Footer
  globals.css             # 1700+ lines, CSS-vars light/dark, no Tailwind utilities in JSX
  sitemap.ts / robots.ts / manifest.ts / opengraph-image.tsx
  llms.txt/route.ts       # text/plain, cache 3600/86400, from data/portfolio.ts + github.ts
  markdown/[[...slug]]/route.ts  # text/markdown, internal fetch + node-html-markdown
  studio/page.tsx + StudioClient.tsx  # force-dynamic, 404-cloaked authoring UI
  api/
    send-email/route.ts              # Zod + rate-limit + nodemailer (Gmail)
    newsletter/{subscribe,unsubscribe,dispatch}/route.ts
    newsletter/studio{,/session}/route.ts
    [...catchAll]/route.ts           # JSON 404 for unknown API routes
components/               # 15 client/server comps — Navbar, Hero, Projects, ThemeToggle, etc.
lib/                      # accept.ts, github.ts, mongodb.ts, newsletter.ts, email-template.ts, analytics.ts, rate-limit.ts
data/portfolio.ts         # Single source of truth — pinnedRepoNames, skills, projects, education
public/sw.js              # Vanilla SW — Network-First HTML, Stale-While-Revalidate assets
proxy.ts                  # Next.js 16 Proxy (replaces middleware.ts) — content negotiation
scripts/newsletter-sync.ts
docs/                     # Engineering docs — ai-ux, newsletter, offline, analytics, data, seo, api
vercel.json               # Cron: GET /api/newsletter/dispatch Mondays 10:00 UTC
```

## 3. Critical Conventions (Do Not Break)

- **Next.js 16 Proxy:** File is `proxy.ts` (not `middleware.ts`) exporting `proxy()` + `config.matcher`. See `proxy.ts:1-60`. Matcher skips `api`, `_next/*`, `llms.txt`, `markdown`, static assets. Always check `x-internal-render: true` bypass before rewriting.
- **Content Negotiation:** `lib/accept.ts` parses RFC 9110 `Accept` with `q` + specificity. `proxy.ts` rewrites to `/markdown/*` when `text/markdown` wins or path ends `.md`; returns `406` if neither `text/html` nor `text/markdown` is acceptable and `*/*` absent. Must `appendVaryAccept` / set `Vary: Accept`.
- **Markdown Compilation:** `app/markdown/[[...slug]]/route.ts` does an internal `fetch` with `x-internal-render`, extracts `<main>`, strips `script/style/svg/button/form`, reformats via `node-html-markdown`. `Vary` + `Cache-Control public max-age 3600 s-maxage 86400` required.
- **Theme:** FOUC-free via `components/ThemeInitScript.tsx` using `useServerInsertedHTML` inline IIFE (`localStorage` + `prefers-color-scheme`). `globals.css` uses `data-theme` + CSS vars + `@media prefers-color-scheme` fallback. `ThemeToggle.tsx` tracks `theme_toggle` and listens to `matchMedia`.
- **Analytics:** `@next/third-parties/google` `<GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!}>` in `app/layout.tsx:166`. Custom events via `lib/analytics.ts:10` `trackEvent()` wrapping `sendGAEvent` with try/catch (ad-blocker resilience). Never hardcode GA ID — use `NEXT_PUBLIC_GA_ID` (`G-8LVL1N08S6`).
- **MongoDB:** `lib/mongodb.ts` globals-caches client for HMR; `getDb()` defaults to `MONGODB_DB || "portfolio"`. Newsletters use atomic `deliveredEmails` `$addToSet` + sequential Gmail SMTP send (≤50, 500/day free, resume-safe via `$nin deliveredEmails`).
- **Studio Security:** Route is 404-cloaked (`notFound()`) unless `?key=STUDIO_SECRET` or `studio_session` httpOnly cookie (30d, `secure`, `lax`). `proxy.ts` / `robots.ts` disallow `/studio/` + `/api/`. Two secrets: `CRON_SECRET` (Vercel Cron Bearer) vs `STUDIO_SECRET` (human).
- **Rate Limiting:** `lib/rate-limit.ts` in-memory `Map` (5/hr default, 10m cleanup `unref`), keyed by `x-forwarded-for` / `x-real-ip`. Contact form checks `navigator.onLine` client-side before POST.
- **Offline/PWA:** `public/sw.js` `portfolio-cache-v1` precaches `/`, favicons, `/llms.txt`; `ServiceWorkerRegister.tsx` registers only in `production`; `OfflineNotice.tsx` uses `useSyncExternalStore` (hydration-safe) with 3s reconnect toast.
- **Styling:** `@tailwindcss/postcss` imported in `globals.css` but components use hand-rolled class names (`.skill-row`, `.project-card`, etc.). Do not add Tailwind utility classes without checking existing pattern.
- **SEO:** `metadataBase https://gourabmondal.vercel.app`, `alternates.canonical`, `openGraph`, `twitter`, JSON-LD `Person` + `ProfilePage` graph in `app/layout.tsx:84`. `app/sitemap.ts` + `robots.ts` + `<link rel=alternate>` for `llms.txt` and `text/markdown`.

## 4. Environment

Required vars (see `.env.example:1-22`):
```
MONGODB_URI / MONGODB_DB=portfoliodb
CRON_SECRET / STUDIO_SECRET
EMAIL_USER / EMAIL_PASS  # Gmail app password for /api/send-email + newsletter dispatch (500/day free)
NEXT_PUBLIC_SITE_URL=https://gourabmondal.vercel.app
NEXT_PUBLIC_GA_ID=G-8LVL1N08S6
```
Vercel needs `NEXT_PUBLIC_GA_ID`, `CRON_SECRET`, `STUDIO_SECRET`, `MONGODB_URI`, `EMAIL_USER`, `EMAIL_PASS` set in dashboard; redeploy after changing `NEXT_PUBLIC_*`.

## 5. Docs Before Code

- AI UX: `docs/ai-ux/llms-txt.md`, `docs/ai-ux/markdown-content-negotiation.md`
- Newsletter: `docs/newsletter/newsletter-architecture.md`
- Offline: `docs/offline/pwa-and-offline-caching.md`
- Analytics: `docs/analytics/event-tracking.md` (7 events)
- Data: `docs/data/github-integration.md` (ISR 3600, pinned repos, fallback)
- SEO: `docs/seo/search-engine-optimization.md`
- API: `docs/api/contact-email.md`

## 6. Common Pitfalls

- Deleting the `BEGIN:nextjs-agent-rules` block — `next dev` re-creates it as an uncommitted diff; keep it.
- Creating `middleware.ts` instead of `proxy.ts` — breaks on Next 16.
- Forgetting `Vary: Accept` on rewritten/markdown responses — breaks edge cache correctness.
- Registering SW in development — breaks HMR; guard with `NODE_ENV === "production"`.
- Hardcoding GA ID or exposing `MONGODB_URI`/`CRON_SECRET` in client code.
- Missing `x-internal-render` check — infinite rewrite loop for markdown route.
