import { createHmac } from "node:crypto";

/**
 * Invisible Zero-Width Unicode Alphabet (Quaternary / Base-4 mapping)
 */
const ZWC_00 = "\u200B"; // Zero Width Space
const ZWC_01 = "\u200C"; // Zero Width Non-Joiner
const ZWC_10 = "\u200D"; // Zero Width Joiner
const ZWC_11 = "\uFEFF"; // Zero Width No-Break Space
const SENTINEL = "\u2060"; // Word Joiner (Boundary delimiter)

const CHAR_TO_VAL: Record<string, number> = {
  [ZWC_00]: 0,
  [ZWC_01]: 1,
  [ZWC_10]: 2,
  [ZWC_11]: 3,
};

const VAL_TO_CHAR: Record<number, string> = {
  0: ZWC_00,
  1: ZWC_01,
  2: ZWC_10,
  3: ZWC_11,
};

/**
 * Encodes an ASCII/UTF-8 string into an invisible Zero-Width sequence wrapped in sentinels.
 */
export function encodeZeroWidth(payload: string): string {
  const bytes = Buffer.from(payload, "utf8");
  let encoded = SENTINEL;

  for (const byte of bytes) {
    // 8 bits per byte -> four 2-bit pairs
    const p0 = (byte >> 6) & 0x03;
    const p1 = (byte >> 4) & 0x03;
    const p2 = (byte >> 2) & 0x03;
    const p3 = byte & 0x03;

    encoded += VAL_TO_CHAR[p0] + VAL_TO_CHAR[p1] + VAL_TO_CHAR[p2] + VAL_TO_CHAR[p3];
  }

  encoded += SENTINEL;
  return encoded;
}

/**
 * Extracts and decodes all zero-width payload strings found within a body of text.
 */
export function decodeZeroWidth(text: string): string[] {
  const payloads: string[] = [];
  const parts = text.split(SENTINEL);

  // Sentinels delimit payloads: parts at odd indices (1, 3, 5...) are payloads
  for (let i = 1; i < parts.length; i += 2) {
    const rawZwc = parts[i];
    const bytes: number[] = [];
    let currentByte = 0;
    let bitCount = 0;

    for (const char of rawZwc) {
      const val = CHAR_TO_VAL[char];
      if (val !== undefined) {
        currentByte = (currentByte << 2) | val;
        bitCount += 2;

        if (bitCount === 8) {
          bytes.push(currentByte);
          currentByte = 0;
          bitCount = 0;
        }
      }
    }

    if (bytes.length > 0) {
      try {
        const decoded = Buffer.from(bytes).toString("utf8");
        if (decoded) payloads.push(decoded);
      } catch {
        // Skip corrupted chunks
      }
    }
  }

  return payloads;
}

/**
 * Generates an HMAC-SHA256 signature for a slug and timestamp.
 */
function generateHmac(slug: string, timestamp: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`gm:${slug}:${timestamp}`)
    .digest("hex")
    .slice(0, 16); // 16 hex chars (64 bits) is compact and collision-resistant
}

function getSecret(explicit?: string): string {
  const secret = explicit || process.env.WATERMARK_SECRET || process.env.STUDIO_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WATERMARK_SECRET or STUDIO_SECRET is required in production.");
    }
    return "dev-watermark-secret-fallback-32chars";
  }
  return secret;
}

/**
 * Creates a signed compact watermark payload string.
 */
export function createSignedPayload(
  slug: string,
  timestamp: number = Math.floor(Date.now() / 1000),
  secret?: string
): string {
  const key = getSecret(secret);
  const hmac = generateHmac(slug, timestamp, key);
  return `gm:${slug}:${timestamp}:${hmac}`;
}

export interface VerificationResult {
  valid: boolean;
  author: string;
  slug: string;
  timestamp?: number;
  date?: string;
  signature?: string;
  occurrences: number;
}

/**
 * Decodes and cryptographically verifies watermarks found inside suspected text.
 */
export function verifyTextWatermark(
  text: string,
  secret?: string
): VerificationResult | null {
  const key = getSecret(secret);
  const rawPayloads = decodeZeroWidth(text);
  if (rawPayloads.length === 0) return null;

  for (const raw of rawPayloads) {
    const parts = raw.split(":");
    if (parts.length === 4 && parts[0] === "gm") {
      const [, slug, tsStr, signature] = parts;
      const timestamp = parseInt(tsStr, 10);

      if (!isNaN(timestamp)) {
        const expectedHmac = generateHmac(slug, timestamp, key);
        const valid = expectedHmac === signature;

        return {
          valid,
          author: "Gourab Mondal",
          slug,
          timestamp,
          date: new Date(timestamp * 1000).toISOString(),
          signature,
          occurrences: rawPayloads.filter((p) => p === raw).length,
        };
      }
    }
  }

  return null;
}

/**
 * Injects the watermark at 3-4 dynamic sentence positions in markdown text.
 * Strictly avoids code blocks (``` / ~~~) and tables (| ... |).
 */
export function injectDynamicWatermark(
  markdown: string,
  slug: string,
  timestamp: number = Math.floor(Date.now() / 1000),
  secret?: string
): string {
  if (!markdown || !slug) return markdown;

  const key = getSecret(secret);

  // If already watermarked with this slug, don't duplicate
  const existing = verifyTextWatermark(markdown, key);
  if (existing?.valid && existing.slug === slug) {
    return markdown;
  }

  const payload = createSignedPayload(slug, timestamp, key);
  const invisiblePayload = encodeZeroWidth(payload);

  const lines = markdown.split("\n");
  let inCodeBlock = false;
  const eligibleLineIndices: number[] = [];

  // Identify lines that are eligible for watermarking (prose only)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("```") || line.startsWith("~~~")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) continue;

    // Skip tables, empty lines, HTML tags, headings, and horizontal rules
    if (
      !line ||
      line.startsWith("|") ||
      line.startsWith("#") ||
      line.startsWith("---") ||
      line.startsWith("<")
    ) {
      continue;
    }

    // Must be a prose line with reasonable length (at least 30 chars and a sentence ending)
    if (line.length >= 30 && /[.!?]/.test(line)) {
      eligibleLineIndices.push(i);
    }
  }

  if (eligibleLineIndices.length === 0) {
    // Fallback: append invisibly at the end if no prose lines were qualified
    return markdown + invisiblePayload;
  }

  // Select up to 4 dynamic targets spaced across the eligible lines
  const targetCount = Math.min(4, Math.max(2, Math.floor(eligibleLineIndices.length / 3)));
  const step = Math.floor(eligibleLineIndices.length / targetCount);
  const chosenIndices = new Set<number>();

  for (let t = 0; t < targetCount; t++) {
    const candidateIdx = eligibleLineIndices[Math.min(t * step + Math.floor(step / 2), eligibleLineIndices.length - 1)];
    chosenIndices.add(candidateIdx);
  }

  // Inject invisible payload right after the first sentence-ending period in chosen lines
  const watermarkedLines = lines.map((line, idx) => {
    if (chosenIndices.has(idx)) {
      const match = line.match(/([.!?])(\s+|$)/);
      if (match && match.index !== undefined) {
        const insertPos = match.index + 1;
        return line.slice(0, insertPos) + invisiblePayload + line.slice(insertPos);
      }
      return line + invisiblePayload;
    }
    return line;
  });

  return watermarkedLines.join("\n");
}
