import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { Resend } from "resend";
import {
  getNewslettersCollection,
  dispatchNewsletter,
  Newsletter,
} from "@/lib/newsletter";
import { renderNewsletterEmail } from "@/lib/email-template";

export const maxDuration = 60;

async function checkAuth(req: NextRequest, bodySecret?: string): Promise<boolean> {
  const studioSecret = process.env.STUDIO_SECRET || process.env.CRON_SECRET;
  if (!studioSecret) return false;

  // 1. Check Bearer authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${studioSecret}`) return true;

  // 2. Check studio_session cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("studio_session")?.value;
  if (sessionToken === studioSecret) return true;

  // 3. Check body secret
  if (bodySecret && bodySecret === studioSecret) return true;

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isAuthorized = await checkAuth(req, body.secret);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized. Valid secret or session required." },
        { status: 401 }
      );
    }

    const { action, title, subject, markdown, scheduledFor, newsletterId } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    // ACTION: Compile Markdown to HTML for preview
    if (action === "render_preview") {
      if (!markdown) {
        return NextResponse.json({ error: "Markdown is required." }, { status: 400 });
      }
      const html = await renderNewsletterEmail(markdown, {
        title: title || "Newsletter Preview",
        unsubscribeUrl: "https://gourabmondal.vercel.app/api/newsletter/unsubscribe?token=sample-preview-token",
      });
      return NextResponse.json({ success: true, html });
    }

    // ACTION: Send single test email to author
    if (action === "test_send") {
      const resendApiKey = process.env.RESEND_API_KEY;
      const emailFrom = process.env.EMAIL_FROM || "Gourab Mondal <onboarding@resend.dev>";
      const authorEmail = body.authorEmail || "mondalgourab140@gmail.com";

      if (!resendApiKey) {
        return NextResponse.json(
          { error: "RESEND_API_KEY is not configured." },
          { status: 500 }
        );
      }

      if (!subject || !markdown) {
        return NextResponse.json(
          { error: "Subject and markdown are required for test send." },
          { status: 400 }
        );
      }

      const emailHtml = await renderNewsletterEmail(markdown, {
        title: title || subject,
        unsubscribeUrl: "https://gourabmondal.vercel.app/api/newsletter/unsubscribe?token=preview-test-token",
        previewText: `[TEST] ${subject}`,
      });

      const resend = new Resend(resendApiKey);
      const { data, error } = await resend.emails.send({
        from: emailFrom,
        to: [authorEmail],
        subject: `[PREVIEW] ${subject}`,
        html: emailHtml,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Test email successfully dispatched to ${authorEmail}.`,
        messageId: data?.id,
      });
    }

    // ACTION: Unschedule (revert scheduled edition to draft)
    if (action === "unschedule") {
      if (!newsletterId) {
        return NextResponse.json(
          { error: "newsletterId is required to unschedule." },
          { status: 400 }
        );
      }

      const newslettersCol = await getNewslettersCollection();
      const existing = await newslettersCol.findOne({ _id: new ObjectId(newsletterId) });
      if (!existing) {
        return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
      }

      if (existing.status === "sent") {
        return NextResponse.json(
          { error: "Cannot unschedule an edition that has already been sent." },
          { status: 400 }
        );
      }

      const updateFields: Record<string, unknown> = {
        status: "draft",
        updatedAt: new Date(),
      };
      if (title) updateFields.title = title;
      if (subject) updateFields.subject = subject;
      if (markdown) {
        updateFields.contentText = markdown;
        updateFields.contentHtml = await renderNewsletterEmail(markdown, {
          title: title || subject || existing.title,
        });
      }

      await newslettersCol.updateOne(
        { _id: new ObjectId(newsletterId) },
        {
          $set: updateFields,
          $unset: {
            scheduledFor: "",
          },
        }
      );

      return NextResponse.json({
        success: true,
        action: "unschedule",
        newsletterId,
        message: "Newsletter unscheduled! Status reverted to draft.",
      });
    }

    // ACTION: Save Draft or Schedule
    if (action === "save_draft" || action === "schedule") {
      if (!subject || !markdown) {
        return NextResponse.json(
          { error: "Subject and markdown are required." },
          { status: 400 }
        );
      }

      const newslettersCol = await getNewslettersCollection();
      const contentHtml = await renderNewsletterEmail(markdown, {
        title: title || subject,
      });

      const isSchedule = action === "schedule";
      const status = isSchedule ? "scheduled" : "draft";
      const scheduledDate = isSchedule ? new Date() : undefined;

      if (newsletterId) {
        if (isSchedule) {
          await newslettersCol.updateOne(
            { _id: new ObjectId(newsletterId) },
            {
              $set: {
                title: title || subject,
                subject,
                contentHtml,
                contentText: markdown,
                status,
                scheduledFor: scheduledDate,
                updatedAt: new Date(),
              },
            }
          );
        } else {
          await newslettersCol.updateOne(
            { _id: new ObjectId(newsletterId) },
            {
              $set: {
                title: title || subject,
                subject,
                contentHtml,
                contentText: markdown,
                status,
                updatedAt: new Date(),
              },
              $unset: {
                scheduledFor: "",
              },
            }
          );
        }

        return NextResponse.json({
          success: true,
          action,
          newsletterId,
          message: isSchedule ? "Newsletter scheduled successfully!" : "Draft updated successfully!",
        });
      }

      const newIssue: Newsletter = {
        title: title || subject,
        subject,
        contentHtml,
        contentText: markdown,
        status,
        scheduledFor: scheduledDate,
        deliveredEmails: [],
        deliveryStats: { success: 0, failed: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await newslettersCol.insertOne(newIssue);

      return NextResponse.json({
        success: true,
        action,
        newsletterId: result.insertedId.toString(),
        message: isSchedule ? "Newsletter scheduled successfully!" : "Draft saved successfully!",
      });
    }

    // ACTION: Dispatch immediately to all subscribers
    if (action === "dispatch_now") {
      if (!subject || !markdown) {
        return NextResponse.json(
          { error: "Subject and markdown are required for dispatch." },
          { status: 400 }
        );
      }

      const contentHtml = await renderNewsletterEmail(markdown, {
        title: title || subject,
      });

      const result = await dispatchNewsletter({
        newsletterId,
        title: title || subject,
        subject,
        contentHtml,
        contentText: markdown,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal studio error";
    console.error("Studio API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
