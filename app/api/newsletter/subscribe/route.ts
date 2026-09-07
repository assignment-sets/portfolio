import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { subscribeUser } from "@/lib/newsletter";

const SubscribeSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = SubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await subscribeUser(parsed.data.email);

    return NextResponse.json({
      success: true,
      message: result.message,
      status: result.status,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to process subscription";

    // If MongoDB is not yet configured in environment variables
    if (message.includes("MONGODB_URI")) {
      return NextResponse.json(
        {
          error:
            "Database is currently being configured. Please check back shortly!",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
