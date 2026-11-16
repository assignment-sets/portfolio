import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBlogViewsBySlugs } from "@/lib/blog";

const slugsQuerySchema = z.object({
  slugs: z
    .string()
    .trim()
    .min(1)
    .max(5000)
    .transform((val) =>
      Array.from(
        new Set(
          val
            .split(",")
            .map((s) => s.trim())
            .filter((s) => /^[a-z0-9-]+$/i.test(s))
        )
      ).slice(0, 50)
    ),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = slugsQuerySchema.safeParse({
      slugs: searchParams.get("slugs") ?? "",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid slugs parameter" },
        { status: 400 }
      );
    }

    const views = await getBlogViewsBySlugs(parsed.data.slugs);

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
      error instanceof Error ? error.message : "Failed to fetch views";

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
