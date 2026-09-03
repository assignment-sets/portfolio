# AI UX: Root `/llms.txt` Endpoint

## Overview

The `/llms.txt` file is an emerging web standard (spearheaded by Answer.AI) designed to provide Large Language Models (LLMs), AI coding agents, and search scrapers with clean, concise, token-efficient Markdown representations of a website.

Rather than forcing LLM crawlers to fetch bloated HTML files, execute JavaScript hydration, or parse CSS layouts, `/llms.txt` provides direct plain-text information in a predictable Markdown format at the root domain.

---

## Architectural Design

### Single Source of Truth
Instead of serving a static text file in `public/llms.txt` (which would require manual updates whenever a skill or project changes), the endpoint is implemented as an **App Router Route Handler** in [`app/llms.txt/route.ts`](../../app/llms.txt/route.ts).

```
                 Incoming Request: GET /llms.txt
                                │
                                ▼
                      app/llms.txt/route.ts
                                │
                                ▼
                       data/portfolio.ts
            (bio, skills, projects, links, education)
                                │
                                ▼
                    Dynamic Markdown Synthesizer
                                │
                                ▼
              Response (text/plain; charset=utf-8)
         Header: Cache-Control: public, max-age=3600...
```

Whenever projects, skills, or bios are updated in [`data/portfolio.ts`](../../data/portfolio.ts), `/llms.txt` is automatically in sync with zero maintenance.

---

## Technical Implementation

### 1. Route Handler: [`app/llms.txt/route.ts`](../../app/llms.txt/route.ts)
- **Path**: Serves at `https://gourabmondal.vercel.app/llms.txt` (root URL, not under `/api/`).
- **Headers**:
  - `Content-Type: text/plain; charset=utf-8`
  - `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate`
- **Sections generated**:
  1. `# Gourab Mondal` (Title)
  2. `> Full Stack Developer based in Kolkata, India...` (Bio & availability)
  3. `## Contact & Profiles` (Email, GitHub, LinkedIn, Resume PDF)
  4. `## Skills` (Languages, Backend, Frontend, GenAI, Databases, Infra, Tooling)
  5. `## Featured Projects` (Each project with title, GitHub URL, summary, and stack)
  6. `## Education` (Degree, institutions, timeline, grades)

### 2. Search Engine & Discovery Integration
- **XML Sitemap ([`app/sitemap.ts`](../../app/sitemap.ts))**:
  ```ts
  {
    url: "https://gourabmondal.vercel.app/llms.txt",
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }
  ```
- **HTML Head Discovery ([`app/layout.tsx`](../../app/layout.tsx))**:
  ```html
  <link rel="alternate" type="text/plain" href="/llms.txt" title="LLMs.txt" />
  ```

---

## Verification & Testing

### Request Command
```bash
curl -s -i http://localhost:3000/llms.txt
```

### Expected Response
- **Status**: `200 OK`
- **Content-Type**: `text/plain; charset=utf-8`
- **Sample Output**:
  ```markdown
  # Gourab Mondal

  > Full Stack Developer based in Kolkata, India. B.Tech CS student. Interested mainly in backend and GenAI applications. Currently trying to get better at software stuff.

  Status: Available for work.

  ## Contact & Profiles
  - Email: gourab.m099@gmail.com
  - GitHub: https://github.com/assignment-sets
  - LinkedIn: https://linkedin.com/in/gourab-mondal-gm2004
  - Resume: https://my-resumes-788125169240-ap-south-1-an.s3.ap-south-1.amazonaws.com/resume.pdf

  ## Skills
  - **Languages**: Python, Java, JavaScript
  ...
  ```
