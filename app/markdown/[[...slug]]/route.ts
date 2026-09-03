import { NodeHtmlMarkdown } from "node-html-markdown";

/**
 * Preprocesses raw SSR HTML into clean semantic markup before Markdown compilation.
 * Fixes missing whitespace/separators between inline tags (spans, links, skill rows).
 */
function preprocessHtmlForMarkdown(html: string): string {
  let cleaned = html;

  // 1. Clean out non-semantic and interactive elements
  cleaned = cleaned
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "");

  // 2. Hero links: Insert middle-dot separators between adjacent <a> tags
  cleaned = cleaned.replace(
    /<div class="hero-links"[^>]*>([\s\S]*?)<\/div>/gi,
    (_, linksHtml) => {
      const links: string[] = [];
      const aMatches = linksHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi);
      for (const a of aMatches) {
        links.push(`<a ${a[1]}>${a[2].trim()}</a>`);
      }
      return `<p>${links.join(" · ")}</p>`;
    }
  );

  // 3. Skills rows: Convert skill rows into structured bullet items
  cleaned = cleaned.replace(
    /<div class="skill-row"[^>]*>\s*<span class="skill-label"[^>]*>([\s\S]*?)<\/span>\s*<span class="skill-value"[^>]*>([\s\S]*?)<\/span>\s*<\/div>/gi,
    (_, label, val) => `<li><strong>${label.trim()}</strong>: ${val.trim()}</li>`
  );
  cleaned = cleaned.replace(
    /<div class="skills-block"[^>]*>([\s\S]*?)<\/div>/gi,
    (_, inner) => `<ul>${inner}</ul>`
  );

  // 4. Project card headers: append license if present
  cleaned = cleaned.replace(
    /<div class="project-card-header"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?(?:<span class="project-license-badge"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<\/span>)?[\s\S]*?<\/div>/gi,
    (_, title, license) => {
      const cleanTitle = title.trim();
      if (license && license.trim()) {
        return `<h3>${cleanTitle} <code>${license.trim()}</code></h3>`;
      }
      return `<h3>${cleanTitle}</h3>`;
    }
  );

  // 5. Project tags: Convert inline spans into space-delimited backtick code pills
  cleaned = cleaned.replace(
    /<div class="project-tags"[^>]*>([\s\S]*?)<\/div>/gi,
    (_, tagsHtml) => {
      const tags: string[] = [];
      const spanMatches = tagsHtml.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi);
      for (const match of spanMatches) {
        const tag = match[1].trim();
        if (tag) tags.push(`<code>${tag}</code>`);
      }
      return tags.length > 0 ? `<p>${tags.join(" ")}</p>` : tagsHtml;
    }
  );

  // 6. Project card footers: Join GitHub link and Updated timestamp with middle-dot
  cleaned = cleaned.replace(
    /<div class="project-card-footer"[^>]*>([\s\S]*?)<\/div>/gi,
    (_, footerHtml) => {
      const aMatch = footerHtml.match(
        /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i
      );
      const dateMatch = footerHtml.match(
        /<span class="project-updated-label"[^>]*>([\s\S]*?)<\/span>/i
      );
      const parts: string[] = [];
      if (aMatch) parts.push(`<a href="${aMatch[1]}">${aMatch[2].trim()}</a>`);
      if (dateMatch) parts.push(`<em>${dateMatch[1].trim()}</em>`);
      return `<p>${parts.join(" · ")}</p>`;
    }
  );

  // 7. Education list: Structure into semantic bullet points
  cleaned = cleaned.replace(
    /<div class="edu-list"[^>]*>([\s\S]*?)<\/div>\s*<\/section>/gi,
    (match, eduHtml) => {
      const items: string[] = [];
      const itemMatches = eduHtml.matchAll(
        /<div class="edu-item"[^>]*>[\s\S]*?<span class="edu-year"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<h3>([\s\S]*?)<\/h3>[\s\S]*?<p class="inst"[^>]*>([\s\S]*?)<\/p>[\s\S]*?<p class="grade"[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/div>/gi
      );
      for (const it of itemMatches) {
        items.push(
          `<li><strong>${it[1].trim()}</strong>: ${it[2].trim()} — ${it[3].trim()} (${it[4].trim()})</li>`
        );
      }
      return items.length > 0 ? `<ul>${items.join("\n")}</ul></section>` : match;
    }
  );

  return cleaned;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug = [] } = await params;
  const targetPath = slug.length === 0 ? "/" : `/${slug.join("/")}`;

  // Build target URL for internal SSR fetch
  const reqUrl = new URL(req.url);
  const targetUrl = new URL(targetPath, reqUrl.origin);

  try {
    const htmlResponse = await fetch(targetUrl.toString(), {
      headers: {
        Accept: "text/html",
        "x-internal-render": "true",
      },
      cache: "no-store",
    });

    if (!htmlResponse.ok) {
      return new Response(
        `Error ${htmlResponse.status}: Unable to retrieve content for ${targetPath}\n`,
        {
          status: htmlResponse.status,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            Vary: "Accept",
          },
        }
      );
    }

    const html = await htmlResponse.text();

    // Extract content within <main> or fallback to <body>
    let contentHtml = html;
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) {
      contentHtml = mainMatch[1];
    } else {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        contentHtml = bodyMatch[1];
      }
    }

    // Apply semantic DOM preprocessor
    const preprocessedHtml = preprocessHtmlForMarkdown(contentHtml);

    const nhm = new NodeHtmlMarkdown({
      bulletMarker: "-",
      codeBlockStyle: "fenced",
      emDelimiter: "*",
      strongDelimiter: "**",
    });

    const rawMarkdown = nhm.translate(preprocessedHtml);

    // Clean up excessive blank lines
    const markdown = rawMarkdown.replace(/\n{3,}/g, "\n\n").trim() + "\n";

    return new Response(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        Vary: "Accept",
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate",
      },
    });
  } catch (error) {
    return new Response(
      `Internal Server Error during markdown conversion: ${String(error)}\n`,
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          Vary: "Accept",
        },
      }
    );
  }
}
