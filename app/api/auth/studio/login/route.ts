import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getStudioUsersCollection,
  verifyPassword,
  createSessionToken,
  STUDIO_COOKIE_NAME,
  STUDIO_COOKIE_OPTIONS,
} from "@/lib/auth-studio";
import { checkFirewallRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
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
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid credentials",
        },
        { status: 400 }
      );
    }

    const { username, password } = parseResult.data;
    const normalizedUsername = username.trim().toLowerCase();

    const usersCol = await getStudioUsersCollection();
    const user = await usersCol.findOne({ username: normalizedUsername });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // If Two-Factor Authentication is enabled, return 2FA challenge instead of setting session cookie
    if (user.totpEnabled) {
      const { create2FATempToken } = await import("@/lib/auth-studio");
      const tempToken = create2FATempToken(normalizedUsername);
      return NextResponse.json({
        success: true,
        requires2FA: true,
        tempToken,
      });
    }

    const token = createSessionToken(normalizedUsername);
    const response = NextResponse.json({
      success: true,
      username: normalizedUsername,
    });

    response.cookies.set(STUDIO_COOKIE_NAME, token, STUDIO_COOKIE_OPTIONS);
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error during login." },
      { status: 500 }
    );
  }
}
