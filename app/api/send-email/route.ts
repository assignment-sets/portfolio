import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Zod Validation Schema
const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, "Name cannot exceed 100 characters.")
    .nullish()
    .transform((val) => val || "Anonymous"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Invalid email format.")
    .max(200, "Email cannot exceed 200 characters."),
  subject: z
    .string()
    .trim()
    .max(200, "Subject cannot exceed 200 characters.")
    .nullish()
    .transform((val) => val || "(No Subject)"),
  message: z
    .string()
    .trim()
    .min(1, "Please type a message.")
    .max(5000, "Message cannot exceed 5000 characters."),
});

// Helper to escape HTML characters to prevent XSS in email clients
function escapeHtml(str: string): string {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#039;";
      default:
        return m;
    }
  });
}

export async function POST(req: Request) {
  // 1. In-memory Rate Limiting (5 requests per hour per IP)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(clientIp, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: "Too many requests from this IP. Please try again later.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateLimit.reset.toString(),
          "Retry-After": Math.max(
            1,
            rateLimit.reset - Math.floor(Date.now() / 1000)
          ).toString(),
        },
      }
    );
  }

  // 2. Parse & Validate Payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const result = contactSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0]?.message || "Validation failed.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { name, email, subject, message } = result.data;

  // 3. Environment variables verification
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.error(
      "Missing EMAIL_USER or EMAIL_PASS in environment variables."
    );
    return NextResponse.json(
      { error: "Email service is not configured. Please contact directly." },
      { status: 500 }
    );
  }

  // 4. Sanitize inputs for email template
  const escapedName = escapeHtml(name);
  const escapedEmail = escapeHtml(email);
  const escapedSubject = escapeHtml(subject);
  const escapedMessage = escapeHtml(message);

  // 5. Send email via Nodemailer
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const replySubject = encodeURIComponent(`Re: ${subject}`);
    const mailOptions = {
      from: `"${escapedName}" <${emailUser}>`,
      to: emailUser,
      replyTo: email, // Directly allows hitting Reply in Gmail to respond to the visitor
      subject: `[Portfolio] ${escapedName} \u2014 ${escapedSubject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e5e5; border-radius: 10px; overflow: hidden; background: #ffffff;">
          <!-- Header -->
          <div style="background: #111111; color: #ffffff; padding: 24px 30px;">
            <h2 style="margin: 0; font-size: 1.2rem; font-weight: 600; letter-spacing: -0.01em;">Portfolio Message</h2>
            <p style="margin: 4px 0 0; font-size: 0.82rem; color: #888888;">New inquiry from contact form</p>
          </div>

          <!-- Body Content -->
          <div style="padding: 26px 30px; background: #fafafa; color: #222222;">
            <!-- Metadata Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 0.9rem;">
              <tbody>
                <tr>
                  <td style="padding: 6px 0; color: #71717a; width: 85px; font-weight: 500;">Sender</td>
                  <td style="padding: 6px 0; color: #18181b; font-weight: 600;">${escapedName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #71717a; font-weight: 500;">Email</td>
                  <td style="padding: 6px 0;">
                    <a href="mailto:${escapedEmail}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${escapedEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #71717a; font-weight: 500;">Subject</td>
                  <td style="padding: 6px 0; color: #18181b; font-weight: 600;">${escapedSubject}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #71717a; font-weight: 500;">Received</td>
                  <td style="padding: 6px 0; color: #71717a; font-size: 0.82rem;">${new Date().toUTCString()} &middot; IP: ${clientIp}</td>
                </tr>
              </tbody>
            </table>

            <!-- Message Card -->
            <div style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; padding: 22px 24px; margin-bottom: 24px;">
              <p style="margin: 0 0 10px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: #a1a1aa; font-weight: 700;">Message</p>
              <div style="white-space: pre-wrap; font-size: 1.02rem; line-height: 1.7; color: #1c1917; font-family: Georgia, serif;">${escapedMessage}</div>
            </div>

            <!-- Quick Reply Button -->
            <div style="text-align: left;">
              <a href="mailto:${escapedEmail}?subject=${replySubject}" style="display: inline-block; background: #111111; color: #ffffff; padding: 10px 22px; border-radius: 6px; text-decoration: none; font-size: 0.88rem; font-weight: 500;">
                Reply to ${escapedName} &rarr;
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f4f4f5; text-align: center; padding: 14px 20px; font-size: 0.78rem; color: #71717a; border-top: 1px solid #e4e4e7;">
            <span>Gourab Mondal Portfolio &middot; Kolkata, India &middot; &copy; ${new Date().getFullYear()}</span>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json(
      { success: true, message: "Email sent successfully!" },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Nodemailer send error:", err);
    const errorObj = err as { code?: string };

    if (errorObj.code === "EAUTH" || errorObj.code === "ENOAUTH") {
      return NextResponse.json(
        {
          error:
            "Email authentication failed. Please check SMTP configuration.",
        },
        { status: 401 }
      );
    }

    if (
      ["ECONNECTION", "ETIMEDOUT", "EDNS", "ESOCKET"].includes(
        errorObj.code || ""
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Email server is temporarily unreachable. Please try again later.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error while sending email." },
      { status: 500 }
    );
  }
}
