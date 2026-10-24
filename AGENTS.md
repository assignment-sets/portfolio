<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Portfolio — Agent Guide

> Next.js 16 (App Router) + React 19 + Tailwind CSS v4. Single-page portfolio with AI/LLM UX, blog, newsletter, studio, offline PWA, and security subsystems.

## 1. Commands & Verification

```bash
npm run dev              # next dev (Turbopack)
npm run build            # next build — verify after layout, proxy, or config changes
npm run lint             # eslint (next/core-web-vitals + typescript flat config)
npm run newsletter:sync  # tsx scripts/newsletter-sync.ts — upsert newsletters/issue-01.md
npm run newsletter:test  # tsx scripts/newsletter-sync.ts --test — send preview via Gmail SMTP
```

Verify changes via `npm run lint` and `npm run build`.

## 2. Project Layout

```
app/                      # App Router
  layout.tsx              # RootLayout + metadataBase + jsonLd + GA + ThemeInit + SW
  page.tsx                # Home — composes Navbar/Hero/Skills/Projects/Experience/Education/Contact/Footer
  globals.css             # CSS-vars light/dark, hand-rolled classes, no Tailwind utilities in JSX
  sitemap.ts / robots.ts / manifest.ts / opengraph-image.tsx
  llms.txt/route.ts       # AI summary, CORS: *, CORP: cross-origin, cache 3600/86400
  markdown/[[...slug]]/route.ts  # SSR DOM-to-markdown, SSRF-guarded, CORS: *, cache 3600/86400
  studio/                 # force-dynamic admin control hub & passkey manager
    login/ + register/    # Password + WebAuthn passkey sign-in & single-admin bootstrap
    newsletter/ + blog/   # Newsletter dispatch & blog authoring studio
    blog/verify/          # In-browser steganographic watermark verifier
  blog/ + blog/[slug]/    # Public paginated blog feed & article reader
  api/
    availability/route.ts # Work availability toggle with ISR tag revalidation
    send-email/route.ts   # Zod + rate-limit + Sec-Fetch CSRF guard + nodemailer
    auth/studio/          # Register, login, logout (Clear-Site-Data), passkey, 2FA
    newsletter/           # Subscribe (Sec-Fetch guard), unsubscribe, cron dispatch
    blog/ + blog/studio/  # Public blog query API & authenticated blog CRUD
components/               # Client & server UI components (Navbar, Hero, ThemeToggle, etc.)
lib/                      # auth-studio, watermark, mongodb, newsletter, blog, rate-limit, accept
data/portfolio.ts         # Source of truth — pinned repos, skills, experience, education
public/sw.js              # Vanilla SW (portfolio-cache-v2) — Network-First HTML, SWR assets
proxy.ts                  # Next.js 16 Proxy (NOT middleware.ts) — RFC 9110 Accept content negotiation
docs/                     # In-depth architectural documentation
```

## 3. Critical Boundaries & Conventions (Do Not Break)

- **Prioritize ripgrep**: Use `rg` first before `grep`.
- **Next.js 16 Proxy**: File is `proxy.ts` (not `middleware.ts`). Matcher skips `api`, `_next/*`, `llms.txt`, `markdown`, static assets. Respect `x-internal-render: true` bypass before rewriting.
- **Content Negotiation (RFC 9110)**: `lib/accept.ts` parses `Accept` with `q` specificity. Rewrites to `/markdown/*` when `text/markdown` wins or path ends `.md`; returns 406 if both HTML and markdown rejected. Always set `Vary: Accept` (`appendVaryAccept`).
- **Markdown Route SSRF Defense**: In `app/markdown/[[...slug]]/route.ts`, sanitize leading slashes (`rawPath.replace(/^[/\\]+/, "/")`) and assert `targetUrl.origin === expectedOrigin`.
- **Styling**: `@tailwindcss/postcss` in `globals.css` with hand-rolled class names (`.skill-row`, `.project-card`). Do not add Tailwind utility classes in JSX without checking existing pattern.
- **Theme**: FOUC-free via `components/ThemeInitScript.tsx` inline IIFE (`localStorage` + `prefers-color-scheme`).
- **Offline SW**: Registers only when `NODE_ENV === "production"`. `/sw.js` headers: strict `no-cache` and `script-src 'self'`.

## 4. Security & Caching Architecture

- **Security Headers (`next.config.ts`)**: Global CSP (GA4, ImageKit, GitHub avatars, WebAuthn), `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `Permissions-Policy` (disables hardware, allows `publickey-credentials-*=(self)`), `X-Frame-Options: DENY`, `nosniff`, `HSTS preload`.
- **Route Cache Isolation**: `/studio/(.*)` and `/api/auth/(.*)` must strictly serve `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` and `Pragma: no-cache`.
- **AI Endpoints Access**: `/llms.txt` and `/markdown/(.*)` explicitly serve `Access-Control-Allow-Origin: *` and `Cross-Origin-Resource-Policy: cross-origin`.
- **Session Logout**: `POST /api/auth/studio/logout` sets `Clear-Site-Data: "cookies", "storage"`.
- **CSRF Defense**: Mutating endpoints (`POST /api/send-email`, `POST /api/newsletter/subscribe`) inspect `sec-fetch-site` and reject `cross-site` requests with 403.
- **Secret Isolation**: `STUDIO_SECRET` (admin session signing & TOTP encryption) is strictly isolated from `CRON_SECRET` (Vercel cron bearer).
- **Watermarking**: `lib/watermark.ts` injects invisible zero-width HMAC fingerprints into author blog content; verified at `/studio/blog/verify`.

## 5. Environment Variables

Required in `.env.local` and Vercel Dashboard:
```
MONGODB_URI / MONGODB_DB=portfoliodb
STUDIO_SECRET            # Admin session HMAC signing, TOTP key derivation, CLI Bearer
CRON_SECRET              # Vercel Cron dispatch bearer token
EMAIL_USER / EMAIL_PASS  # Gmail SMTP app password for contact form & newsletter delivery
NEXT_PUBLIC_SITE_URL=https://gourabmondal.vercel.app
NEXT_PUBLIC_GA_ID=G-8LVL1N08S6
```

## 6. Architecture Docs Reference

- Security & Headers: `docs/security/http-headers-and-transport-security.md`
- Caching & Revalidation: `docs/caching/caching-and-revalidation.md`
- AI UX & Markdown: `docs/ai-ux/llms-txt.md`, `docs/ai-ux/markdown-content-negotiation.md`
- Newsletter: `docs/newsletter/newsletter-architecture.md`
- Blog: `docs/blog/blog-architecture.md`
- Offline / PWA: `docs/offline/pwa-and-offline-caching.md`
- Analytics: `docs/analytics/event-tracking.md`
- Dynamic GitHub Data: `docs/data/github-integration.md`
- SEO: `docs/seo/search-engine-optimization.md`
- Contact API: `docs/api/contact-email.md`
