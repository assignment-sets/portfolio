import { readFileSync } from "node:fs";
import { verifyTextWatermark, decodeZeroWidth } from "../lib/watermark";

/**
 * CLI Tool to verify digital text watermarks on suspected text, files, or arguments.
 * Usage:
 *   npx tsx scripts/verify-watermark.ts "some copied text"
 *   npx tsx scripts/verify-watermark.ts --file path/to/article.md
 */
async function main() {
  const args = process.argv.slice(2);
  const secret = process.env.STUDIO_SECRET || "portfolio-salt";

  if (args.length === 0) {
    console.log("Usage:");
    console.log("  npx tsx scripts/verify-watermark.ts \"<text-to-verify>\"");
    console.log("  npx tsx scripts/verify-watermark.ts --file <path-to-file>");
    process.exit(1);
  }

  let textToVerify = "";

  if (args[0] === "--file" && args[1]) {
    try {
      textToVerify = readFileSync(args[1], "utf8");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to read file: ${msg}`);
      process.exit(1);
    }
  } else {
    textToVerify = args.join(" ");
  }

  const rawDecoded = decodeZeroWidth(textToVerify);

  console.log("\n=======================================================");
  console.log(" 🔍 DIGITAL TEXT WATERMARK VERIFICATION REPORT");
  console.log("=======================================================\n");

  if (rawDecoded.length === 0) {
    console.log("❌ NO DIGITAL WATERMARK FOUND");
    console.log("The analyzed text contains zero invisible fingerprint sequences.");
    console.log("=======================================================\n");
    process.exit(0);
  }

  const result = verifyTextWatermark(textToVerify, secret);

  if (result && result.valid) {
    console.log("✅ AUTHENTIC DIGITAL SIGNATURE VERIFIED!");
    console.log("-------------------------------------------------------");
    console.log(`Author:       ${result.author}`);
    console.log(`Article Slug: ${result.slug}`);
    console.log(`Published:    ${result.date || "Unknown"}`);
    console.log(`Signature:    ${result.signature} (VALID HMAC-SHA256)`);
    console.log(`Occurrences:  Found in ${result.occurrences} separate segments`);
    console.log("-------------------------------------------------------");
    console.log("Conclusion:   This text is cryptographically proven to originate");
    console.log("              from Gourab Mondal's portfolio blog.");
  } else if (result) {
    console.log("⚠️ TAMPERED OR INVALID SIGNATURE DETECTED");
    console.log("-------------------------------------------------------");
    console.log(`Slug Found:   ${result.slug}`);
    console.log(`Timestamp:    ${result.date || "Unknown"}`);
    console.log("Signature:    INVALID (HMAC mismatch against STUDIO_SECRET)");
  } else {
    console.log("⚠️ UNRECOGNIZED WATERMARK FORMAT");
    console.log(`Raw Payloads: ${JSON.stringify(rawDecoded)}`);
  }

  console.log("=======================================================\n");
}

main().catch(console.error);
