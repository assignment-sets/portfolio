import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getStudioPasskeysCollection,
  verifySessionToken,
  STUDIO_COOKIE_NAME,
} from "@/lib/auth-studio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(STUDIO_COOKIE_NAME)?.value;
    const session = verifySessionToken(sessionCookie);

    if (!session.valid || !session.username) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const passkeysCol = await getStudioPasskeysCollection();
    const passkeys = await passkeysCol
      .find({ username: session.username })
      .project({ credentialID: 1, deviceName: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      passkeys: passkeys.map((p) => ({
        id: p.credentialID,
        deviceName: p.deviceName || "Security Key",
        createdAt: p.createdAt,
      })),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to retrieve passkeys." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(STUDIO_COOKIE_NAME)?.value;
    const session = verifySessionToken(sessionCookie);

    if (!session.valid || !session.username) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { credentialID } = body;

    if (!credentialID) {
      return NextResponse.json(
        { success: false, error: "Credential ID is required." },
        { status: 400 }
      );
    }

    const passkeysCol = await getStudioPasskeysCollection();
    const deleteResult = await passkeysCol.deleteOne({
      credentialID,
      username: session.username,
    });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Passkey not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Passkey removed successfully.",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to remove passkey." },
      { status: 500 }
    );
  }
}
