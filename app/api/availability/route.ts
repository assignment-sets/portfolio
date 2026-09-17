import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  getAvailabilityStatus,
  setAvailabilityStatus,
  toggleAvailabilityStatus,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

async function checkAuth(req: NextRequest, bodySecret?: string): Promise<boolean> {
  const studioSecret = process.env.STUDIO_SECRET || process.env.CRON_SECRET;
  if (!studioSecret) return false;

  // 1. Check URL query parameter (?key=...)
  const { searchParams } = new URL(req.url);
  const queryKey = searchParams.get("key");
  if (queryKey && queryKey === studioSecret) return true;

  // 2. Check Bearer authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${studioSecret}`) return true;

  // 3. Check studio_session cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("studio_session")?.value;
  if (sessionToken === studioSecret) return true;

  // 4. Check body secret
  if (bodySecret && bodySecret === studioSecret) return true;

  return false;
}

export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await checkAuth(req);
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
    const isAuthorized = await checkAuth(req, body.secret);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized. Valid studio secret or session required." },
        { status: 401 }
      );
    }

    let newStatus: boolean;

    if (typeof body.available === "boolean") {
      newStatus = await setAvailabilityStatus(body.available);
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
