import { NextRequest, NextResponse } from "next/server";
import { dispatchNewsletter, getNewslettersCollection } from "@/lib/newsletter";

// Allow max duration on Vercel Hobby/Pro to ensure multi-batch completion
export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface DispatchBody {
  newsletterId?: string;
  title?: string;
  subject?: string;
  contentHtml?: string;
  html?: string;
  contentText?: string;
  text?: string;
}

async function handleDispatch(req: NextRequest, bodyPayload?: DispatchBody) {
  // Verify Bearer token authorization
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "Server CRON_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized. Valid Bearer token required." },
      { status: 401 }
    );
  }

  try {
    const body: DispatchBody = bodyPayload || (await req.json().catch(() => ({})));

    let newsletterId = body.newsletterId;
    let title = body.title;
    let subject = body.subject;
    let contentHtml = body.contentHtml || body.html;
    let contentText = body.contentText || body.text;

    // If no direct payload and no newsletterId provided, search MongoDB for scheduled or partially sent issue
    if (!newsletterId && (!subject || !contentHtml)) {
      const newslettersCollection = await getNewslettersCollection();
      const pendingIssue = await newslettersCollection.findOne(
        {
          $or: [
            { status: "scheduled", scheduledFor: { $lte: new Date() } },
            { status: "partially_sent" },
          ],
        },
        { sort: { scheduledFor: 1, createdAt: 1 } }
      );

      if (!pendingIssue) {
        return NextResponse.json({
          success: true,
          message:
            "Cron verified. No scheduled or partially sent newsletter ready for dispatch.",
        });
      }

      newsletterId = pendingIssue._id.toString();
      title = pendingIssue.title;
      subject = pendingIssue.subject;
      contentHtml = pendingIssue.contentHtml;
      contentText = pendingIssue.contentText;
    }

    const result = await dispatchNewsletter({
      newsletterId,
      title: title || subject,
      subject,
      contentHtml,
      contentText,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Dispatch failed";
    console.error("Newsletter dispatch error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Vercel Cron Jobs invoke routes using HTTP GET requests.
 */
export async function GET(req: NextRequest) {
  return handleDispatch(req);
}

/**
 * Manual / programmatic dispatches can also invoke via HTTP POST with payload.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return handleDispatch(req, body);
}
