import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import {
  getAvailabilityStatus,
  setAvailabilityStatus,
  toggleAvailabilityStatus,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

const availabilityPostSchema = z.object({
  available: z.boolean().optional(),
});

import { checkStudioAuth } from "@/lib/auth-studio";

export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await checkStudioAuth(req);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized. Valid studio secret or session required." },
        { status: 401 }
      );
    }

    const available = await getAvailabilityStatus();
    return NextResponse.json({
      success: true,
      available,
      statusText: available ? "Available for work" : "Not looking for work",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = availabilityPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const isAuthorized = await checkStudioAuth(req);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized. Valid studio secret or session required." },
        { status: 401 }
      );
    }

    let newStatus: boolean;

    if (typeof parsed.data.available === "boolean") {
      newStatus = await setAvailabilityStatus(parsed.data.available);
    } else {
      newStatus = await toggleAvailabilityStatus();
    }

    // Instantly purge ISR cache and tags so changes appear on homepage immediately
    try {
      revalidateTag("availability", "max");
      revalidatePath("/");
      revalidatePath("/llms.txt");
    } catch {
      // Revalidation in route handlers
    }

    return NextResponse.json({
      success: true,
      available: newStatus,
      message: newStatus
        ? "Availability status updated to: Available for work (badge visible)."
        : "Availability status updated to: Not looking for work (badge hidden).",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
