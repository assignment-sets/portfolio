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
  const secret = process.env.STUDIO_SECRET;
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
// Two-Factor Authentication (TOTP - RFC 6238 & Recovery Codes)
// ---------------------------------------------------------------------------

import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

function getEncryptionKey(): Buffer {
  const secret = getSessionSecret();
  return crypto.createHash("sha256").update(`totp-secret-enc:${secret}`).digest();
}

export function encryptTotpSecret(plainBase32: string): { encrypted: string; iv: string; tag: string } {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plainBase32, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return {
    encrypted,
    iv: iv.toString("hex"),
    tag,
  };
}

export function decryptTotpSecret(encrypted: string, ivHex: string, tagHex: string): string | null {
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

export async function generateTotpSetup(username: string) {
  const secret = new OTPAuth.Secret({ size: 20 });
  const base32Secret = secret.base32;

  const totp = new OTPAuth.TOTP({
    issuer: "Gourab Portfolio Studio",
    label: username,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secret,
  });

  const uri = totp.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(uri, {
    margin: 2,
    width: 240,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  const recoveryCodes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    recoveryCodes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }

  return {
    secret: base32Secret,
    uri,
    qrCodeDataUrl,
    recoveryCodes,
  };
}

export function verifyTotpCode(secretBase32: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: "Gourab Portfolio Studio",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });

    const cleanToken = token.replace(/\s+/g, "");
    const delta = totp.validate({ token: cleanToken, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.replace(/[\s-]+/g, "").toUpperCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function create2FATempToken(username: string): string {
  const timestamp = Date.now().toString();
  const secret = getSessionSecret();
  const payload = `${username}.${timestamp}.2fa`;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

export function verify2FATempToken(token: string | null | undefined): {
  valid: boolean;
  username?: string;
} {
  if (!token || typeof token !== "string") {
    return { valid: false };
  }

  const parts = token.split(".");
  if (parts.length !== 4) {
    return { valid: false };
  }

  const [username, timestampStr, type, signature] = parts;
  if (type !== "2fa") {
    return { valid: false };
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return { valid: false };
  }

  const now = Date.now();
  // Valid for 5 minutes
  if (now - timestamp > 5 * 60 * 1000 || timestamp > now + 60 * 1000) {
    return { valid: false };
  }

  try {
    const secret = getSessionSecret();
    const payload = `${username}.${timestampStr}.2fa`;
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

// ---------------------------------------------------------------------------
// MongoDB Schemas & Collections
// ---------------------------------------------------------------------------

export interface StudioUserDocument {
  username: string;
  passwordHash: string;
  salt: string;
  totpEnabled?: boolean;
  totpSecret?: string;
  totpIv?: string;
  totpTag?: string;
  recoveryCodes?: string[];
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
  col.createIndex({ username: 1 }, { unique: true }).catch(() => {});
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

