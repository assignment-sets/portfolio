import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getStudioUsersCollection,
  hashPassword,
  createSessionToken,
  STUDIO_COOKIE_NAME,
  STUDIO_COOKIE_OPTIONS,
} from "@/lib/auth-studio";
import { checkFirewallRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username cannot exceed 32 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain alphanumeric characters, hyphens, and underscores"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters"),
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
    const parseResult = registerSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 }
      );
    }

    const { username, password } = parseResult.data;
    const usersCol = await getStudioUsersCollection();
    const existingCount = await usersCol.countDocuments();

    if (existingCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Registration is closed. An administrator account is already configured.",
        },
        { status: 403 }
      );
    }

    const { hash, salt } = hashPassword(password);
    const normalizedUsername = username.trim().toLowerCase();

    await usersCol.insertOne({
      username: normalizedUsername,
      passwordHash: hash,
      salt,
      createdAt: new Date(),
    });

    const token = createSessionToken(normalizedUsername);
    const response = NextResponse.json({
      success: true,
      message: "Admin registered successfully",
      username: normalizedUsername,
    });

    response.cookies.set(STUDIO_COOKIE_NAME, token, STUDIO_COOKIE_OPTIONS);
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error during registration." },
      { status: 500 }
    );
  }
}
