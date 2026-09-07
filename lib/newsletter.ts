import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { Resend } from "resend";
import { getDb } from "./mongodb";

export interface Subscriber {
  _id?: ObjectId;
  email: string;
  status: "active" | "unsubscribed";
  subscribedAt: Date;
  unsubscribedAt?: Date;
  unsubscribeToken: string;
}

export interface Newsletter {
  _id?: ObjectId;
  title: string;
  subject: string;
  contentHtml: string;
  contentText?: string;
  status:
    | "draft"
    | "scheduled"
    | "sending"
    | "sent"
    | "partially_sent"
    | "failed";
  scheduledFor?: Date;
  sentAt?: Date;
  recipientCount?: number;
  deliveredEmails: string[];
  deliveryStats: {
    success: number;
    failed: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export async function getSubscribersCollection() {
  const db = await getDb();
  const collection = db.collection<Subscriber>("subscribers");
  // Ensure unique indexes
  await collection.createIndex({ email: 1 }, { unique: true }).catch(() => {});
  await collection.createIndex({ unsubscribeToken: 1 }).catch(() => {});
  return collection;
}

export async function getNewslettersCollection() {
  const db = await getDb();
  const collection = db.collection<Newsletter>("newsletters");
  await collection.createIndex({ status: 1 }).catch(() => {});
  return collection;
}

export async function subscribeUser(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const collection = await getSubscribersCollection();

  const existing = await collection.findOne({ email });

  if (existing) {
    if (existing.status === "active") {
      return {
        status: "already_subscribed",
        message: "You are already subscribed!",
      };
    }
    // Re-activate previously unsubscribed user
    await collection.updateOne(
      { email },
      {
        $set: {
          status: "active",
          subscribedAt: new Date(),
        },
        $unset: {
          unsubscribedAt: "",
        },
      }
    );
    return {
      status: "resubscribed",
      message: "Welcome back! You have been resubscribed.",
    };
  }

  // Create new subscriber
  const unsubscribeToken = crypto.randomUUID();
  await collection.insertOne({
    email,
    status: "active",
    subscribedAt: new Date(),
    unsubscribeToken,
  });

  return { status: "subscribed", message: "Thank you for subscribing!" };
}

export async function unsubscribeUser(token: string) {
  if (!token) return false;
  const collection = await getSubscribersCollection();
  const res = await collection.updateOne(
    { unsubscribeToken: token, status: "active" },
    {
      $set: {
        status: "unsubscribed",
        unsubscribedAt: new Date(),
      },
    }
  );
  return res.modifiedCount > 0;
}

export async function dispatchNewsletter({
  newsletterId,
  title,
  subject,
  contentHtml,
  contentText,
}: {
  newsletterId?: string;
  title?: string;
  subject?: string;
  contentHtml?: string;
  contentText?: string;
}) {
  const newslettersCollection = await getNewslettersCollection();
  const subscribersCollection = await getSubscribersCollection();

  // 1. Resolve or initialize the newsletter campaign document
  let campaign: Newsletter | null = null;

  if (newsletterId) {
    campaign = await newslettersCollection.findOne({
      _id: new ObjectId(newsletterId),
    });
    if (!campaign) {
      throw new Error(
        `Newsletter campaign with ID ${newsletterId} not found.`
      );
    }
  } else {
    if (!subject || !contentHtml) {
      throw new Error(
        "Subject and contentHtml are required when no newsletterId is provided."
      );
    }

    const insertResult = await newslettersCollection.insertOne({
      title: title || subject,
      subject,
      contentHtml,
      contentText,
      status: "sending",
      deliveredEmails: [],
      deliveryStats: {
        success: 0,
        failed: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    campaign = await newslettersCollection.findOne({
      _id: insertResult.insertedId,
    });
  }

  if (!campaign || !campaign._id) {
    throw new Error("Failed to resolve campaign document from database.");
  }

  // 2. Fetch all active subscribers who have NOT yet received this newsletter
  const alreadyDelivered = new Set(campaign.deliveredEmails || []);

  const pendingSubscribers = await subscribersCollection
    .find({
      status: "active",
      email: { $nin: Array.from(alreadyDelivered) },
    })
    .toArray();

  const totalActiveSubscribers = await subscribersCollection.countDocuments({
    status: "active",
  });

  // Keep total target recipient count synced
  await newslettersCollection.updateOne(
    { _id: campaign._id },
    {
      $set: {
        recipientCount: totalActiveSubscribers,
        updatedAt: new Date(),
      },
    }
  );

  // If no subscribers are pending, mark sent and return cleanly
  if (pendingSubscribers.length === 0) {
    await newslettersCollection.updateOne(
      { _id: campaign._id },
      {
        $set: {
          status: "sent",
          sentAt: campaign.sentAt || new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return {
      success: true,
      campaignId: campaign._id.toString(),
      totalActive: totalActiveSubscribers,
      previouslyDelivered: alreadyDelivered.size,
      newlyDelivered: 0,
      pending: 0,
      status: "sent",
      message:
        alreadyDelivered.size > 0
          ? "All active subscribers have already received this newsletter."
          : "No active subscribers found.",
    };
  }

  // 3. Verify Resend Configuration
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom =
    process.env.EMAIL_FROM || "Gourab Mondal <onboarding@resend.dev>";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://gourabmondal.vercel.app";

  if (!resendApiKey) {
    await newslettersCollection.updateOne(
      { _id: campaign._id },
      { $set: { status: "draft", updatedAt: new Date() } }
    );
    return {
      success: false,
      campaignId: campaign._id.toString(),
      pending: pendingSubscribers.length,
      message:
        "RESEND_API_KEY is not configured yet. Saved campaign as draft in database.",
    };
  }

  const resend = new Resend(resendApiKey);

  // 4. Batch Dispatch in Chunks of 50 (respects rate limit & memory)
  const BATCH_SIZE = 50;
  let newlyDeliveredCount = 0;
  let batchFailCount = 0;

  for (let i = 0; i < pendingSubscribers.length; i += BATCH_SIZE) {
    const chunk = pendingSubscribers.slice(i, i + BATCH_SIZE);

    const batchPayload = chunk.map((sub) => {
      const unsubscribeUrl = `${siteUrl}/api/newsletter/unsubscribe?token=${sub.unsubscribeToken}`;
      const personalizedHtml = `
        ${campaign!.contentHtml}
        <hr style="margin-top: 32px; border: none; border-top: 1px solid #eaeaea;" />
        <footer style="font-size: 12px; color: #888; margin-top: 16px;">
          <p>You received this because you subscribed to Gourab Mondal's newsletter.</p>
          <p><a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe with one click</a></p>
        </footer>
      `;

      return {
        from: emailFrom,
        to: [sub.email],
        subject: campaign!.subject,
        html: personalizedHtml,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
        },
      };
    });

    try {
      const result = await resend.batch.send(batchPayload);

      if (result.error) {
        console.error("Resend batch send error for chunk:", result.error);
        batchFailCount += chunk.length;
        await newslettersCollection.updateOne(
          { _id: campaign._id },
          {
            $inc: { "deliveryStats.failed": chunk.length },
            $set: { updatedAt: new Date() },
          }
        );
      } else if (result.data) {
        const successfulEmails = chunk.map((c) => c.email);
        newlyDeliveredCount += successfulEmails.length;

        // ATOMIC STATE UPDATE: Immediately record delivered emails in MongoDB
        await newslettersCollection.updateOne(
          { _id: campaign._id },
          {
            $addToSet: { deliveredEmails: { $each: successfulEmails } },
            $inc: { "deliveryStats.success": successfulEmails.length },
            $set: { updatedAt: new Date() },
          }
        );
      }
    } catch (err) {
      console.error("Batch send exception:", err);
      batchFailCount += chunk.length;
      await newslettersCollection.updateOne(
        { _id: campaign._id },
        {
          $inc: { "deliveryStats.failed": chunk.length },
          $set: { updatedAt: new Date() },
        }
      );
    }

    // Safety pause: 500ms between batches to respect Resend 10 req/s rate limits
    if (i + BATCH_SIZE < pendingSubscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // 5. Final State Transition
  const totalDeliveredNow = alreadyDelivered.size + newlyDeliveredCount;
  const isComplete =
    totalDeliveredNow >= totalActiveSubscribers && batchFailCount === 0;

  await newslettersCollection.updateOne(
    { _id: campaign._id },
    {
      $set: {
        status: isComplete ? "sent" : "partially_sent",
        sentAt: isComplete ? new Date() : undefined,
        updatedAt: new Date(),
      },
    }
  );

  return {
    success: newlyDeliveredCount > 0,
    campaignId: campaign._id.toString(),
    totalActive: totalActiveSubscribers,
    previouslyDelivered: alreadyDelivered.size,
    newlyDelivered: newlyDeliveredCount,
    failed: batchFailCount,
    status: isComplete ? "sent" : "partially_sent",
  };
}
