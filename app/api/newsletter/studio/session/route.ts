import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const studioSecret = process.env.STUDIO_SECRET || process.env.CRON_SECRET;
  if (!studioSecret) {
    return NextResponse.json({ error: "STUDIO_SECRET not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const key = body.key;

  if (key !== studioSecret) {
    return NextResponse.json({ error: "Invalid secret key" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("studio_session", studioSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return NextResponse.json({ success: true, message: "Session established" });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("studio_session");
  return NextResponse.json({ success: true, message: "Session cleared" });
}
