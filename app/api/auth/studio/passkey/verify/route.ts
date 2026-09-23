import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  type AuthenticatorTransport,
} from "@simplewebauthn/server";
import {
  getRpConfig,
  getStudioPasskeysCollection,
  getStudioChallengesCollection,
  verifySessionToken,
  createSessionToken,
  STUDIO_COOKIE_NAME,
  STUDIO_COOKIE_OPTIONS,
} from "@/lib/auth-studio";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, response: authResponse, deviceName } = body;
    const { rpID, origin } = getRpConfig(req);
    const challengesCol = await getStudioChallengesCollection();
    const passkeysCol = await getStudioPasskeysCollection();

    if (action === "register") {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get(STUDIO_COOKIE_NAME)?.value;
      const session = verifySessionToken(sessionCookie);

      if (!session.valid || !session.username) {
        return NextResponse.json(
          { success: false, error: "Authentication required to enroll passkeys." },
          { status: 401 }
        );
      }

      const challengeDoc = await challengesCol.findOne(
        { username: session.username, purpose: "register" },
        { sort: { createdAt: -1 } }
      );

      if (!challengeDoc) {
        return NextResponse.json(
          { success: false, error: "Passkey challenge expired or not found. Please try again." },
          { status: 400 }
        );
      }

      const origins = Array.from(
        new Set(
          [
            origin,
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            process.env.NEXT_PUBLIC_SITE_URL,
          ].filter(Boolean) as string[]
        )
      );

      const verification = await verifyRegistrationResponse({
        response: authResponse,
        expectedChallenge: challengeDoc.challenge,
        expectedOrigin: origins,
        expectedRPID: rpID,
        requireUserVerification: false,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return NextResponse.json(
          { success: false, error: "Passkey verification failed." },
          { status: 400 }
        );
      }

      const { credential } = verification.registrationInfo;
      const publicKeyBase64 = Buffer.from(credential.publicKey).toString("base64");

      await passkeysCol.insertOne({
        credentialID: credential.id,
        publicKey: publicKeyBase64,
        counter: credential.counter,
        transports: credential.transports as AuthenticatorTransport[] | undefined,
        deviceName: deviceName || "Security Key / Passkey",
        username: session.username,
        createdAt: new Date(),
      });

      // Clear used challenge
      await challengesCol.deleteOne({ _id: challengeDoc._id });

      return NextResponse.json({
        success: true,
        message: "Passkey registered successfully",
      });
    } else if (action === "login") {
      const challengeDoc = await challengesCol.findOne(
        { purpose: "login" },
        { sort: { createdAt: -1 } }
      );

      if (!challengeDoc) {
        return NextResponse.json(
          { success: false, error: "Passkey challenge expired or not found. Please try again." },
          { status: 400 }
        );
      }

      const passkey = await passkeysCol.findOne({ credentialID: authResponse.id });
      if (!passkey) {
        return NextResponse.json(
          { success: false, error: "Unrecognized passkey credential." },
          { status: 401 }
        );
      }

      const origins = Array.from(
        new Set(
          [
            origin,
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            process.env.NEXT_PUBLIC_SITE_URL,
          ].filter(Boolean) as string[]
        )
      );

      const verification = await verifyAuthenticationResponse({
        response: authResponse,
        expectedChallenge: challengeDoc.challenge,
        expectedOrigin: origins,
        expectedRPID: rpID,
        credential: {
          id: passkey.credentialID,
          publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64")),
          counter: passkey.counter,
          transports: passkey.transports as AuthenticatorTransport[] | undefined,
        },
        requireUserVerification: false,
      });

      if (!verification.verified) {
        return NextResponse.json(
          { success: false, error: "Passkey authentication failed." },
          { status: 401 }
        );
      }

      // Update counter in DB
      await passkeysCol.updateOne(
        { credentialID: passkey.credentialID },
        { $set: { counter: verification.authenticationInfo.newCounter } }
      );

      // Clear used challenge
      await challengesCol.deleteOne({ _id: challengeDoc._id });

      const token = createSessionToken(passkey.username);
      const res = NextResponse.json({
        success: true,
        username: passkey.username,
      });

      res.cookies.set(STUDIO_COOKIE_NAME, token, STUDIO_COOKIE_OPTIONS);
      return res;
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'register' or 'login'." },
        { status: 400 }
      );
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[Passkey Verify Error]:", error?.message || err);
    return NextResponse.json(
      { success: false, error: error?.message || "Passkey verification failed." },
      { status: 400 }
    );
  }
}
