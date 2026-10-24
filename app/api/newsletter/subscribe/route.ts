import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { subscribeUser } from "@/lib/newsletter";
import { checkFirewallRateLimit } from "@/lib/rate-limit";

const SubscribeSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  hp_field: z.string().optional(), // Honeypot field to trap automated bots
});

export async function POST(req: NextRequest) {
  // 1. CSRF Defense via Sec-Fetch-Site metadata
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return NextResponse.json(
      { error: "Cross-site requests not permitted" },
      { status: 403 }
    );
  }

  // 2. Rate Limiting via Vercel Firewall (5 req / 3600s per IP)
  const rateLimit = await checkFirewallRateLimit(req);
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error:
          rateLimit.error ||
          "Too many subscription attempts from this IP. Please try again later.",
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = SubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // 2. Honeypot check: If the hidden honeypot field is filled, silently discard without DB insertion
    if (parsed.data.hp_field && parsed.data.hp_field.trim() !== "") {
      return NextResponse.json({
        success: true,
        message: "Thank you for subscribing! Please check your inbox.",
      });
    }

    await subscribeUser(parsed.data.email);

    // 3. Anti-Enumeration: Always return identical success response regardless of existing status
    return NextResponse.json({
      success: true,
      message: "Thank you for subscribing! Please check your inbox.",
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
