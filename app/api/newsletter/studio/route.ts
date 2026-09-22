import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";
import { z } from "zod";
import {
  getNewslettersCollection,
  dispatchNewsletter,
  Newsletter,
} from "@/lib/newsletter";
import { renderNewsletterEmail } from "@/lib/email-template";
import { escapeRegex } from "@/lib/sanitize";

export const maxDuration = 60;

const searchSchema = z.object({
  query: z.string().max(100, "Search query cannot exceed 100 characters").optional(),
});

const renderPreviewSchema = z.object({
  title: z.string().trim().max(200).optional(),
  markdown: z.string().min(1, "Markdown is required").max(150000, "Markdown content exceeds 150KB limit"),
});

const testSendSchema = z.object({
  title: z.string().trim().max(200).optional(),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject cannot exceed 200 characters"),
  markdown: z.string().min(1, "Markdown is required").max(150000, "Markdown content exceeds 150KB limit"),
  authorEmail: z.string().trim().email("Invalid author email format").max(200).optional(),
});

const unscheduleSchema = z.object({
  newsletterId: z.string().refine((val) => ObjectId.isValid(val), "Valid newsletterId is required"),
  title: z.string().trim().max(200).optional(),
  subject: z.string().trim().max(200).optional(),
  markdown: z.string().max(150000).optional(),
});

const deleteSchema = z.object({
  newsletterId: z.string().refine((val) => ObjectId.isValid(val), "Valid newsletterId is required to delete"),
});

const saveNewsletterSchema = z.object({
  newsletterId: z.string().refine((val) => ObjectId.isValid(val), "Invalid newsletterId").optional(),
  title: z.string().trim().max(200).optional(),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject cannot exceed 200 characters"),
  markdown: z.string().min(1, "Markdown is required").max(150000, "Markdown content exceeds 150KB limit"),
});

const dispatchNowSchema = z.object({
  newsletterId: z.string().refine((val) => ObjectId.isValid(val), "Invalid newsletterId").optional(),
  title: z.string().trim().max(200).optional(),
  subject: z.string().trim().min(1, "Subject is required for dispatch").max(200, "Subject cannot exceed 200 characters"),
  markdown: z.string().min(1, "Markdown is required for dispatch").max(150000, "Markdown content exceeds 150KB limit"),
});

import { checkStudioAuth } from "@/lib/auth-studio";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isAuthorized = await checkStudioAuth(req);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized. Valid secret or session required." },
        { status: 401 }
      );
    }

    const { action } = body;

    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "Valid action is required." }, { status: 400 });
    }

    // ACTION: Search editions with native MongoDB regex search (limit 10)
    if (action === "search") {
      const parsed = searchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const query = parsed.data.query?.trim() || "";
      const newslettersCol = await getNewslettersCollection();

      let filter: Record<string, unknown> = {};
      if (query) {
        const escaped = escapeRegex(query);
        filter = {
          $or: [
            { title: { $regex: escaped, $options: "i" } },
            { subject: { $regex: escaped, $options: "i" } },
            { contentText: { $regex: escaped, $options: "i" } },
          ],
        };
      }

      const rawDocs = await newslettersCol
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      const formattedIssues = rawDocs.map((doc) => ({
        id: doc._id!.toString(),
        title: doc.title || doc.subject,
        subject: doc.subject,
        status: doc.status,
        scheduledFor: doc.scheduledFor ? doc.scheduledFor.toISOString() : undefined,
        sentAt: doc.sentAt ? doc.sentAt.toISOString() : undefined,
        stats: doc.deliveryStats,
        deliveredCount: doc.deliveredEmails ? doc.deliveredEmails.length : 0,
        createdAt: doc.createdAt.toISOString(),
        markdownText: doc.contentText,
      }));

      return NextResponse.json({ success: true, issues: formattedIssues });
    }

    // ACTION: Compile Markdown to HTML for preview
    if (action === "render_preview") {
      const parsed = renderPreviewSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const { title, markdown } = parsed.data;
      const html = await renderNewsletterEmail(markdown, {
        title: title || "Newsletter Preview",
        unsubscribeUrl: "https://gourabmondal.vercel.app/api/newsletter/unsubscribe?token=sample-preview-token",
      });
      return NextResponse.json({ success: true, html });
    }

    // ACTION: Send single test email to author via Gmail SMTP
    if (action === "test_send") {
      const parsed = testSendSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const { title, subject, markdown } = parsed.data;
      const gmailUser = process.env.EMAIL_USER;
      const gmailPass = process.env.EMAIL_PASS;
      const authorEmail = parsed.data.authorEmail || "mondalgourab140@gmail.com";

      if (!gmailUser || !gmailPass) {
        return NextResponse.json(
          { error: "EMAIL_USER or EMAIL_PASS is not configured." },
          { status: 500 }
        );
      }

      const emailHtml = await renderNewsletterEmail(markdown, {
        title: title || subject,
        unsubscribeUrl: "https://gourabmondal.vercel.app/api/newsletter/unsubscribe?token=preview-test-token",
        previewText: `[TEST] ${subject}`,
      });

      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: gmailUser, pass: gmailPass },
        });

        const info = await transporter.sendMail({
          from: `Gourab Mondal <${gmailUser}>`,
          to: authorEmail,
          subject: `[PREVIEW] ${subject}`,
          html: emailHtml,
        });

        return NextResponse.json({
          success: true,
          message: `Test email successfully dispatched to ${authorEmail}.`,
          messageId: info.messageId,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to send test email";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    // ACTION: Unschedule (revert scheduled edition to draft)
    if (action === "unschedule") {
      const parsed = unscheduleSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const { newsletterId, title, subject, markdown } = parsed.data;
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

    // ACTION: Delete Edition permanently
    if (action === "delete") {
      const parsed = deleteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const { newsletterId } = parsed.data;
      const newslettersCol = await getNewslettersCollection();
      const res = await newslettersCol.deleteOne({ _id: new ObjectId(newsletterId) });

      if (res.deletedCount === 0) {
        return NextResponse.json({ error: "Edition not found." }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        action: "delete",
        newsletterId,
        message: "Edition deleted permanently.",
      });
    }

    // ACTION: Save Draft or Schedule
    if (action === "save_draft" || action === "schedule") {
      const parsed = saveNewsletterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const { newsletterId, title, subject, markdown } = parsed.data;
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
      const parsed = dispatchNowSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const { newsletterId, title, subject, markdown } = parsed.data;
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
