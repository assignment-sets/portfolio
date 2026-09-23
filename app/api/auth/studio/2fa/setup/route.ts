import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  checkStudioAuth,
  verifySessionToken,
  STUDIO_COOKIE_NAME,
  generateTotpSetup,
} from "@/lib/auth-studio";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const isAuthed = await checkStudioAuth(req);
    if (!isAuthed) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(STUDIO_COOKIE_NAME)?.value;
    const session = verifySessionToken(sessionCookie);

    const username = session.username || "admin";
    const setupData = await generateTotpSetup(username);

    return NextResponse.json({
      success: true,
      ...setupData,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error generating 2FA setup." },
      { status: 500 }
    );
  }
}
