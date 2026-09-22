import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCachedPublishedBlogPosts } from "@/lib/blog";

const blogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  tag: z.string().trim().max(50).optional(),
  q: z.string().trim().max(100).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = blogQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      tag: searchParams.get("tag") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { page, limit, tag, q } = parsed.data;

    const data = await getCachedPublishedBlogPosts({
      page,
      limit,
      tag: tag || undefined,
      query: q || undefined,
    });

    const isSearch = Boolean(q?.trim());
    const cacheControl = isSearch
      ? "private, no-cache, no-store, max-age=0, must-revalidate"
      : "public, s-maxage=3600, stale-while-revalidate=86400";

    return NextResponse.json(
      {
        success: true,
        ...data,
      },
      {
        headers: {
          "Cache-Control": cacheControl,
          "CDN-Cache-Control": cacheControl,
          "Vercel-CDN-Cache-Control": cacheControl,
        },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch blog posts";

    if (message.includes("MONGODB_URI")) {
      return NextResponse.json(
        { error: "Database configuration error." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
