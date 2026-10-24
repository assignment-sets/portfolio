# Gourab Mondal — Portfolio & Engineering Platform

Personal portfolio and web platform built with **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS v4**. Engineered with first-class AI/LLM UX, blogging engine, newsletter system, offline PWA capabilities, and defensive security headers.

- **Live Site**: [gourabmondal.vercel.app](https://gourabmondal.vercel.app)
- **AI Feed**: [gourabmondal.vercel.app/llms.txt](https://gourabmondal.vercel.app/llms.txt)

---

## Features

- **AI / LLM UX**: Machine-readable `/llms.txt` and RFC 9110 content negotiation (`Accept: text/markdown` or `.md` URL extension).
- **Personal Blog**: MongoDB Atlas full-text search, Shiki syntax highlighting, and invisible cryptographic steganographic watermarking.
- **Admin Studio (`/studio`)**: Password + WebAuthn Passkeys, 2FA (TOTP), blog editor, watermark verifier, and newsletter dispatch.
- **Newsletter**: Self-hosted delivery via Gmail SMTP with one-click unsubscribe and Vercel Cron integration.
- **Offline / PWA**: Native Service Worker (`portfolio-cache-v2`) providing network-first caching and offline support.
- **Defensive Security**: Scoped CSP, COOP (`same-origin-allow-popups`), Permissions-Policy, HSTS preload, Sec-Fetch CSRF mitigation, and SSRF guards.

---

## Tech Stack

- **Framework**: Next.js 16 (Turbopack, App Router, `proxy.ts`)
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4 & custom CSS-variable themes
- **Database**: MongoDB Atlas (`lib/mongodb.ts`)
- **Authentication**: WebAuthn Passkeys (`@simplewebauthn`), scrypt password hashing, TOTP 2FA
- **Analytics**: Google Analytics 4 (`@next/third-parties/google`)
- **Hosting**: Vercel Edge Network

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/assignment-sets/portfolio.git
cd portfolio
npm install
```

### 2. Environment Variables

Create a `.env.local` file with the following variables:

```bash
MONGODB_URI=mongodb+srv://...
MONGODB_DB=portfoliodb
STUDIO_SECRET=your-32-char-random-secret
CRON_SECRET=your-cron-secret-token
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scripts

```bash
npm run dev              # Start Turbopack dev server
npm run build            # Create production build
npm run lint             # Run ESLint checks
npm run newsletter:sync  # Upsert newsletters/issue-01.md
npm run newsletter:test  # Send preview newsletter via SMTP
```

---

## Architecture & Documentation

In-depth technical documentation is available in the [`docs/`](docs/) directory:

- [Engineering Docs Index](docs/README.md)
- [HTTP Security Headers & Defensive Architecture](docs/security/http-headers-and-transport-security.md)
- [Caching & Revalidation Architecture](docs/caching/caching-and-revalidation.md)
- [AI UX & Markdown Content Negotiation](docs/ai-ux/markdown-content-negotiation.md)
- [Blog Architecture & Watermarking](docs/blog/blog-architecture.md)
- [Newsletter Architecture](docs/newsletter/newsletter-architecture.md)
- [Offline Architecture & PWA](docs/offline/pwa-and-offline-caching.md)
