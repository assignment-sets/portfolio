import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("studio_session")?.value;
  const studioSecret = process.env.STUDIO_SECRET;
  const authenticated = Boolean(studioSecret) && sessionToken === studioSecret;
  return NextResponse.json({ authenticated });
}

// POST /api/newsletter/studio/session with key is removed in favor of /api/auth/studio/*

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("studio_session");
  return NextResponse.json({ success: true, message: "Session cleared" });
}
