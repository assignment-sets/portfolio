import fs from "node:fs";
import path from "node:path";
import { Resend } from "resend";
import { getNewslettersCollection, Newsletter } from "../lib/newsletter";
import { renderNewsletterEmail } from "../lib/email-template";

// Load environment variables for standalone CLI usage
if (typeof (process as unknown as { loadEnvFile?: (path?: string) => void }).loadEnvFile === "function") {
  for (const envFile of [".env.local", ".env"]) {
    const envPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      try {
        (process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(envPath);
      } catch {}
    }
  }
}

// Simple frontmatter parser without external dependencies
function parseMarkdownWithFrontmatter(fileContent: string) {
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return {
      metadata: {} as Record<string, string>,
      content: fileContent.trim(),
    };
  }

  const rawMeta = match[1];
  const content = match[2].trim();
  const metadata: Record<string, string> = {};

  for (const line of rawMeta.split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > -1) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
      metadata[key] = val;
    }
  }

  return { metadata, content };
}

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes("--test");
  const fileArg = args.find((a) => a.endsWith(".md")) || "newsletters/issue-01.md";

  const filePath = path.resolve(process.cwd(), fileArg);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    console.log("Usage: npx tsx scripts/newsletter-sync.ts [newsletters/issue-01.md] [--test]");
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const { metadata, content } = parseMarkdownWithFrontmatter(raw);

  const title = metadata.title || "Untitled Newsletter Issue";
  const subject = metadata.subject || title;
  const status = (metadata.status as Newsletter["status"]) || "scheduled";
  const authorEmail = process.env.AUTHOR_EMAIL || "mondalgourab140@gmail.com";
  const emailFrom = process.env.EMAIL_FROM || "Gourab Mondal <onboarding@resend.dev>";

  console.log(`\n========================================`);
  console.log(`Newsletter Issue: "${title}"`);
  console.log(`Target Status:    ${status}`);
  console.log(`Source File:      ${fileArg}`);
  console.log(`========================================\n`);

  const compiledHtml = await renderNewsletterEmail(content, {
    title,
    unsubscribeUrl: "https://gourabmondal.vercel.app/api/newsletter/unsubscribe?token=cli-test-token",
  });

  if (isTest) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("Error: RESEND_API_KEY is not set in environment.");
      process.exit(1);
    }
    console.log(`Dispatching preview email to ${authorEmail} via Resend...`);
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: [authorEmail],
      subject: `[CLI TEST] ${subject}`,
      html: compiledHtml,
    });

    if (error) {
      console.error("Resend error:", error);
      process.exit(1);
    }

    console.log(`Preview email successfully sent! Message ID: ${data?.id}`);
    process.exit(0);
  }

  // Sync to MongoDB
  console.log("Connecting to MongoDB Atlas to schedule issue...");
  const col = await getNewslettersCollection();

  const existing = await col.findOne({ title });
  if (existing) {
    await col.updateOne(
      { _id: existing._id },
      {
        $set: {
          subject,
          contentHtml: compiledHtml,
          contentText: content,
          status,
          updatedAt: new Date(),
        },
      }
    );
    console.log(`Updated existing newsletter issue (${existing._id}) in database.`);
  } else {
    const doc: Newsletter = {
      title,
      subject,
      contentHtml: compiledHtml,
      contentText: content,
      status,
      deliveredEmails: [],
      deliveryStats: { success: 0, failed: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const res = await col.insertOne(doc);
    console.log(`Successfully created new newsletter issue (${res.insertedId}) with status "${status}".`);
  }

  console.log("\nDone! Vercel Cron will pick up and dispatch scheduled issues automatically.");
  process.exit(0);
}

main().catch((err) => {
  console.error("CLI error:", err);
  process.exit(1);
});
