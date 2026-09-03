import { NodeHtmlMarkdown } from "node-html-markdown";

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

    // Clean out non-semantic and interactive elements to maximize token efficiency
    contentHtml = contentHtml
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<button[\s\S]*?<\/button>/gi, "")
      .replace(/<form[\s\S]*?<\/form>/gi, "");

    const nhm = new NodeHtmlMarkdown({
      bulletMarker: "-",
      codeBlockStyle: "fenced",
      emDelimiter: "*",
      strongDelimiter: "**",
    });

    const rawMarkdown = nhm.translate(contentHtml);

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
