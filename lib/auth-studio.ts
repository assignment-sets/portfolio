import crypto from "node:crypto";
import { getDb } from "./mongodb";

export const STUDIO_COOKIE_NAME = "studio_session";
export const MAX_SESSION_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
export const STUDIO_COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours in seconds

export const STUDIO_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: STUDIO_COOKIE_MAX_AGE_SECONDS,
};

// ---------------------------------------------------------------------------
// Password Hashing & Verification (scrypt + timingSafeEqual)
// ---------------------------------------------------------------------------

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const storedKey = Buffer.from(hash, "hex");
    if (derivedKey.length !== storedKey.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, storedKey);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// HMAC Signed Session Tokens (username.timestamp.signature)
// ---------------------------------------------------------------------------

function getSessionSecret(): string {
  const secret = process.env.STUDIO_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("STUDIO_SECRET is not configured in environment variables.");
    }
    return "dev-studio-secret-fallback-key-min32chars";
  }
  return secret;
}

export function createSessionToken(username: string): string {
  const timestamp = Date.now().toString();
  const secret = getSessionSecret();
  const payload = `${username}.${timestamp}`;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

export function verifySessionToken(token: string | null | undefined): {
  valid: boolean;
  username?: string;
} {
  if (!token || typeof token !== "string") {
    return { valid: false };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false };
  }

  const [username, timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return { valid: false };
  }

  const now = Date.now();
  // Reject if expired (older than 8 hours) or set far in the future (> 1 minute clock drift)
  if (now - timestamp > MAX_SESSION_AGE_MS || timestamp > now + 60 * 1000) {
    return { valid: false };
  }

  try {
    const secret = getSessionSecret();
    const payload = `${username}.${timestampStr}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false };
    }

    return { valid: true, username };
  } catch {
    return { valid: false };
  }
}

import { cookies } from "next/headers";

export async function checkStudioAuth(req?: Request): Promise<boolean> {
  const studioSecret = process.env.STUDIO_SECRET;

  // 1. Check Bearer authorization header (CLI / script automation)
  if (req && studioSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader === `Bearer ${studioSecret}`) {
      return true;
    }
  }

  // 2. Check studio_session cookie (browser sessions)
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(STUDIO_COOKIE_NAME)?.value;
    if (sessionToken) {
      const session = verifySessionToken(sessionToken);
      if (session.valid) {
        return true;
      }
    }
  } catch {
    // If called outside request context or cookies fail
    return false;
  }

  return false;
}

// ---------------------------------------------------------------------------
// MongoDB Schemas & Collections
// ---------------------------------------------------------------------------

export interface StudioUserDocument {
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: Date;
  updatedAt?: Date;
}

import type { AuthenticatorTransport } from "@simplewebauthn/server";

export interface StudioPasskeyDocument {
  credentialID: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransport[];
  deviceName?: string;
  username: string;
  createdAt: Date;
}

export interface StudioChallengeDocument {
  challenge: string;
  username?: string;
  purpose: "register" | "login";
  createdAt: Date;
}

export async function getStudioUsersCollection() {
  const db = await getDb();
  const col = db.collection<StudioUserDocument>("studio_users");
  return col;
}

export async function getStudioPasskeysCollection() {
  const db = await getDb();
  const col = db.collection<StudioPasskeyDocument>("studio_passkeys");
  return col;
}

export async function getStudioChallengesCollection() {
  const db = await getDb();
  const col = db.collection<StudioChallengeDocument>("studio_challenges");
  // Ensure TTL index so challenges automatically expire after 300 seconds (5 minutes)
  col.createIndex({ createdAt: 1 }, { expireAfterSeconds: 300 }).catch(() => {});
  return col;
}

// ---------------------------------------------------------------------------
// WebAuthn / Passkey Relying Party Configuration
// ---------------------------------------------------------------------------

export function getRpConfig(req: Request) {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    (process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host
      : "localhost:3000");

  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  const hostname = host.split(":")[0];
  const origin = `${proto}://${host}`;

  return {
    rpName: "Gourab Portfolio Studio",
    rpID: hostname,
    origin,
  };
}

