import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  checkStudioAuth,
  verifySessionToken,
  STUDIO_COOKIE_NAME,
  getStudioUsersCollection,
  verifyPassword,
} from "@/lib/auth-studio";

export const dynamic = "force-dynamic";

const disableSchema = z.object({
  password: z.string().min(1, "Current password is required to disable 2FA"),
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
    const parseResult = disableSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid payload",
        },
        { status: 400 }
      );
    }

    const { password } = parseResult.data;

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

    const isPasswordValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect password. Cannot disable 2FA." },
        { status: 403 }
      );
    }

    await usersCol.updateOne(
      { username },
      {
        $set: {
          totpEnabled: false,
          updatedAt: new Date(),
        },
        $unset: {
          totpSecret: "",
          totpIv: "",
          totpTag: "",
          recoveryCodes: "",
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Two-Factor Authentication has been disabled.",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error disabling 2FA." },
      { status: 500 }
    );
  }
}
