import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  type AuthenticatorTransport,
} from "@simplewebauthn/server";
import {
  getRpConfig,
  getStudioPasskeysCollection,
  getStudioChallengesCollection,
  verifySessionToken,
  STUDIO_COOKIE_NAME,
} from "@/lib/auth-studio";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action; // "register" | "login"
    const { rpName, rpID } = getRpConfig(req);
    const challengesCol = await getStudioChallengesCollection();
    const passkeysCol = await getStudioPasskeysCollection();

    if (action === "register") {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get(STUDIO_COOKIE_NAME)?.value;
      const session = verifySessionToken(sessionCookie);

      if (!session.valid || !session.username) {
        return NextResponse.json(
          { success: false, error: "Authentication required to register passkeys." },
          { status: 401 }
        );
      }

      const existingPasskeys = await passkeysCol
        .find({ username: session.username })
        .toArray();

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: session.username,
        userDisplayName: `Admin (${session.username})`,
        attestationType: "none",
        excludeCredentials: existingPasskeys.map((p) => ({
          id: p.credentialID,
          transports: p.transports as AuthenticatorTransport[] | undefined,
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
      });

      await challengesCol.insertOne({
        challenge: options.challenge,
        username: session.username,
        purpose: "register",
        createdAt: new Date(),
      });

      return NextResponse.json({ success: true, options });
    } else if (action === "login") {
      const existingPasskeys = await passkeysCol.find({}).toArray();

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: existingPasskeys.map((p) => ({
          id: p.credentialID,
          transports: p.transports as AuthenticatorTransport[] | undefined,
        })),
        userVerification: "preferred",
      });

      await challengesCol.insertOne({
        challenge: options.challenge,
        purpose: "login",
        createdAt: new Date(),
      });

      return NextResponse.json({ success: true, options });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'register' or 'login'." },
        { status: 400 }
      );
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[Passkey Generate Options Error]:", error?.message || err);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate passkey options." },
      { status: 500 }
    );
  }
}
