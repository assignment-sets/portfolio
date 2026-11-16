import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { incrementBlogPostViews } from "@/lib/blog";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9-]+$/i, "Invalid blog slug");

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    if (req.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json(
        { error: "Cross-site requests are forbidden." },
        { status: 403 }
      );
    }

    const { slug } = await context.params;
    const parsed = slugSchema.safeParse(slug);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid slug" },
        { status: 400 }
      );
    }

    const views = await incrementBlogPostViews(parsed.data);
    if (views === null) {
      return NextResponse.json(
        { error: "Published blog post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, views },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to record view";

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
