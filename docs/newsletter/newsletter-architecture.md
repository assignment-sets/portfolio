# Newsletter & MongoDB Persistence Architecture

## Overview

The portfolio features a native, self-hosted newsletter platform integrated directly into Next.js 16 (App Router), backed by **MongoDB Atlas** for subscriber and campaign persistence, and powered by **Gmail SMTP via Nodemailer** for bulk email delivery (free, no domain verification — 500/day, ideal for ≤50 subscribers).

---

## Architecture Diagram

```mermaid
flowchart TD
    Visitor["Visitor"] -->|"Subscribe email"| SubRoute["POST /api/newsletter/subscribe"]
    SubRoute -->|"Validate (Zod) & Upsert"| MongoSub[("MongoDB: subscribers")]

    Cron["Vercel Cron / CLI curl"] -->|"Bearer CRON_SECRET"| DispatchRoute["POST /api/newsletter/dispatch"]
    DispatchRoute -->|"Query active list"| MongoSub
    DispatchRoute -->|"Sequential send (1 per subscriber, ≤50)"| GmailSMTP["Gmail SMTP (Nodemailer)"]
    GmailSMTP -->|"Deliver with 1-click Unsubscribe"| Inboxes["Subscriber Inboxes"]
    DispatchRoute -->|"Log status: sent"| MongoNews[("MongoDB: newsletters")]

    Recipient["Email Recipient"] -->|"Click Unsubscribe Link"| UnsubRoute["GET /api/newsletter/unsubscribe?token=..."]
    UnsubRoute -->|"status: unsubscribed"| MongoSub
```

---

## 1. MongoDB Connection Layer (`lib/mongodb.ts`)

- Uses the official `mongodb` native driver for Node.js.
- Implements the serverless connection caching pattern:
  - In development: Preserved on `global._mongoClientPromise` across Hot Module Replacement (HMR).
  - In production: Reuses the connection promise across serverless lambda invocations to prevent connection leaks.
- Automatically creates databases and collections lazily on first document write.

---

## 2. Collections & Schema

### `subscribers`
- `email`: Normalized lowercase string (indexed, unique).
- `status`: `"active" | "unsubscribed"`.
- `subscribedAt`: Timestamp of initial subscription.
- `unsubscribedAt`: Optional timestamp of cancellation.
- `unsubscribeToken`: Secure crypto UUID used for one-click unsubscribe links.

### `newsletters`
- `title`: Internal reference title.
- `subject`: Email subject line.
- `contentHtml`: HTML body content.
- `status`: `"draft" | "scheduled" | "sending" | "sent" | "partially_sent" | "failed"`.
- `sentAt`: Timestamp of completion.
- `recipientCount`: Total active recipients targeted.
- `deliveredEmails`: Array of subscriber emails that have received this issue (prevents duplicate deliveries on retries).
- `deliveryStats`: `{ success: number, failed: number }`.

---

## 3. Endpoints Specification

### `POST /api/newsletter/subscribe`
- Validates payload with Zod (`{ email: string }`).
- Prevents duplicates (returns `"already_subscribed"`).
- Automatically re-activates previously unsubscribed readers.

### `GET /api/newsletter/unsubscribe?token=<UUID>`
- One-click CAN-SPAM compliant unsubscribe link.
- Returns a clean, Georgia-serif styled confirmation page.

### `GET / POST /api/newsletter/dispatch`
- Protected by `Authorization: Bearer ${CRON_SECRET}` with `maxDuration = 60` for Vercel Hobby serverless timeout safety and `dynamic = "force-dynamic"`.
- Supports **`GET`** (invoked automatically by Vercel Cron according to `vercel.json`) and **`POST`** (manual/programmatic dispatch with body payload).
- Automatically queries and dispatches the oldest pending issue with `status: "scheduled"` or `status: "partially_sent"` in FIFO order. Once dispatched, status transitions to `"sent"`.
 - **Atomic State Machine** (cron-safe, resume-safe, once-per-subscriber):
  1. Queries only active subscribers not yet in `newsletter.deliveredEmails`.
  2. Sends sequentially one email per subscriber (≤50) via single Gmail SMTP transporter — each with personalized `unsubscribeToken` footer (no CC/BCC exposure).
  3. Immediately persists each success/failure to MongoDB via `$addToSet: { deliveredEmails: email }` / `$inc: { deliveryStats.success/failed }`.
  4. If interrupted or re-run (cron retry, timeout), automatically resumes without duplicate sends — `Vercel Cron` runs strictly once a week (`0 10 * * 1` Mondays 10:00 UTC) and re-queries `$nin deliveredEmails`.
  5. Total time for 50 subscribers ≈ 3–10s, well within `maxDuration 60s`.

---

## 4. Vercel Cron Configuration (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/newsletter/dispatch",
      "schedule": "0 10 * * 1"
    }
  ]
}
```

Zero tokens or secrets are committed to Git. Vercel automatically injects the `CRON_SECRET` into the `Authorization` header during scheduled execution.

---

## 5. Authoring & Publishing Workflow ("Stealth Studio")

To write, preview, and schedule weekly newsletters without exposing administrative interfaces on the public portfolio:

### 404 Cloaking Pattern (`app/studio/page.tsx`)
- Visiting `/studio` without valid authentication triggers Next.js's native `notFound()` function.
- Responds with an authentic **HTTP 404 Not Found** status and the portfolio's custom 404 page (`app/not-found.tsx`).
- Crawlers, scrapers, and unauthorized users cannot detect that the route exists.
- Disallowed from indexing in `app/robots.ts` (`disallow: ["/api/", "/studio/"]`).

### Studio Access & Authentication
- Unlock URL: `https://gourabmondal.vercel.app/studio?key=<STUDIO_SECRET>`
- Uses a dedicated high-entropy `STUDIO_SECRET` (isolated from the automated Vercel `CRON_SECRET`).
- Establishes a 30-day secure `httpOnly` session cookie (`studio_session`) via `POST /api/newsletter/studio/session`.
- Zero login forms or administrative links are present anywhere on the public portfolio.

### Studio Features
- **Markdown Composer**: Clean typography input with character count and GitHub Flavored Markdown support.
- **Live Email Preview**: Sandboxed iframe rendering the exact inline-styled HTML template generated by `lib/email-template.ts`.
 - **1-Click Test Send**: Dispatches a live preview copy to `mondalgourab140@gmail.com` via Gmail SMTP to verify mobile and desktop rendering before scheduling.
- **Schedule / Draft Persistence**: Writes directly to the `newsletters` MongoDB collection.
- **Campaign History & Metrics**: Overview of active subscriber count and delivery audit logs.

### Git-Native Markdown Alternative
For authoring directly in code editors:
- Draft in `newsletters/issue-XX.md` with YAML frontmatter.
- Preview test: `npm run newsletter:test`
- Schedule to MongoDB: `npm run newsletter:sync`

