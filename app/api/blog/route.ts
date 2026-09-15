import { NextRequest, NextResponse } from "next/server";
import { getPublishedBlogPosts } from "@/lib/blog";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10)
    );
    const tag = searchParams.get("tag") || undefined;

    const data = await getPublishedBlogPosts({
      page,
      limit,
      tag,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
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
