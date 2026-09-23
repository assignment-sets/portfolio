import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  checkStudioAuth,
  verifySessionToken,
  STUDIO_COOKIE_NAME,
  getStudioUsersCollection,
  verifyTotpCode,
  encryptTotpSecret,
  hashRecoveryCode,
} from "@/lib/auth-studio";

export const dynamic = "force-dynamic";

const enableSchema = z.object({
  secret: z.string().min(16, "Secret is required"),
  code: z.string().min(6, "6-digit code is required"),
  recoveryCodes: z.array(z.string()).min(1, "Recovery codes are required"),
});

export async function POST(req: Request) {
  try {
    const isAuthed = await checkStudioAuth(req);
    if (!isAuthed) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = enableSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid payload",
        },
        { status: 400 }
      );
    }

    const { secret, code, recoveryCodes } = parseResult.data;

    // Verify confirmation code against the pending secret
    const isValid = verifyTotpCode(secret, code);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid 6-digit authenticator code. Check the time on your device and try again." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(STUDIO_COOKIE_NAME)?.value;
    const session = verifySessionToken(sessionCookie);
    const username = session.username;

    if (!username) {
      return NextResponse.json(
        { success: false, error: "Invalid session user" },
        { status: 401 }
      );
    }

    const usersCol = await getStudioUsersCollection();
    const user = await usersCol.findOne({ username });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Admin user not found" },
        { status: 404 }
      );
    }

    // Encrypt the TOTP secret at rest with AES-256-GCM
    const { encrypted, iv, tag } = encryptTotpSecret(secret);
    const hashedRecoveryCodes = recoveryCodes.map(hashRecoveryCode);

    await usersCol.updateOne(
      { username },
      {
        $set: {
          totpEnabled: true,
          totpSecret: encrypted,
          totpIv: iv,
          totpTag: tag,
          recoveryCodes: hashedRecoveryCodes,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Two-Factor Authentication activated successfully.",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error activating 2FA." },
      { status: 500 }
    );
  }
}
