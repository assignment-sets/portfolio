import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { preferredType, appendVaryAccept } from "@/lib/accept";

export function proxy(req: NextRequest) {
  // If this is an internal SSR render initiated by the markdown converter, pass through
  if (req.headers.get("x-internal-render") === "true") {
    return NextResponse.next();
  }

  const pathname = req.nextUrl.pathname;

  // Explicit .md extension requested (e.g. /index.md or /blog/post.md)
  if (pathname.endsWith(".md")) {
    const cleanPath = pathname.slice(0, -3) || "/";
    const url = req.nextUrl.clone();
    url.pathname = `/markdown${cleanPath === "/" ? "" : cleanPath}`;
    const res = NextResponse.rewrite(url);
    appendVaryAccept(res.headers);
    return res;
  }

  const acceptHeader = req.headers.get("accept");
  const chosen = preferredType(acceptHeader);

  // Content negotiation: client prefers raw markdown
  if (chosen === "text/markdown") {
    const url = req.nextUrl.clone();
    url.pathname = `/markdown${pathname === "/" ? "" : pathname}`;
    const res = NextResponse.rewrite(url);
    appendVaryAccept(res.headers);
    return res;
  }

  // 406 Not Acceptable if client explicitly rejects both text/html and text/markdown
  if (chosen === null && acceptHeader && !acceptHeader.includes("*/*")) {
    return new Response(
      "Not Acceptable\n\nAvailable representations: text/html, text/markdown\n",
      {
        status: 406,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          Vary: "Accept",
        },
      }
    );
  }

  // Default: serve standard visual HTML representation
  const res = NextResponse.next();
  appendVaryAccept(res.headers);
  return res;
}

export const config = {
  matcher: [
    // Apply to public pages, skip Next internals, API routes, static assets, and txt endpoints
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt|markdown|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
