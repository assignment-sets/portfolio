import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getStudioUsersCollection,
  verify2FATempToken,
  decryptTotpSecret,
  verifyTotpCode,
  hashRecoveryCode,
  createSessionToken,
  STUDIO_COOKIE_NAME,
  STUDIO_COOKIE_OPTIONS,
} from "@/lib/auth-studio";
import { checkFirewallRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const verifySchema = z.object({
  tempToken: z.string().min(1, "Temporary token is required"),
  code: z.string().min(1, "Verification code is required"),
});

export async function POST(req: Request) {
  const rateLimit = await checkFirewallRateLimit(req);
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: rateLimit.error },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = verifySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid payload",
        },
        { status: 400 }
      );
    }

    const { tempToken, code } = parseResult.data;
    const tokenVerification = verify2FATempToken(tempToken);

    if (!tokenVerification.valid || !tokenVerification.username) {
      return NextResponse.json(
        {
          success: false,
          error: "2FA authentication session expired or invalid. Please sign in again.",
        },
        { status: 401 }
      );
    }

    const username = tokenVerification.username;
    const usersCol = await getStudioUsersCollection();
    const user = await usersCol.findOne({ username });

    if (!user || !user.totpEnabled) {
      return NextResponse.json(
        { success: false, error: "User not found or 2FA is not active." },
        { status: 401 }
      );
    }

    const cleanCode = code.trim();
    let isAuthorized = false;
    let usedRecoveryCode = false;

    // 1. Attempt standard 6-digit TOTP verification
    if (user.totpSecret && user.totpIv && user.totpTag) {
      const decryptedSecret = decryptTotpSecret(user.totpSecret, user.totpIv, user.totpTag);
      if (decryptedSecret) {
        isAuthorized = verifyTotpCode(decryptedSecret, cleanCode);
      }
    }

    // 2. If TOTP failed and recovery codes exist, check if code matches an emergency recovery code
    if (!isAuthorized && user.recoveryCodes && user.recoveryCodes.length > 0) {
      const hashedAttempt = hashRecoveryCode(cleanCode);
      if (user.recoveryCodes.includes(hashedAttempt)) {
        isAuthorized = true;
        usedRecoveryCode = true;
        // Atomically consume the one-time recovery code
        await usersCol.updateOne(
          { username },
          {
            $pull: { recoveryCodes: hashedAttempt },
            $set: { updatedAt: new Date() },
          }
        );
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Invalid authenticator or recovery code." },
        { status: 401 }
      );
    }

    // Set 8-hour session cookie
    const token = createSessionToken(username);
    const response = NextResponse.json({
      success: true,
      username,
      usedRecoveryCode,
    });

    response.cookies.set(STUDIO_COOKIE_NAME, token, STUDIO_COOKIE_OPTIONS);
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error during 2FA verification." },
      { status: 500 }
    );
  }
}
