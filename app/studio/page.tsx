import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import StudioClient from "./StudioClient";
import {
  getSubscribersCollection,
  getNewslettersCollection,
} from "@/lib/newsletter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio",
  robots: {
    index: false,
    follow: false,
  },
};

interface StudioPageProps {
  searchParams: Promise<{ key?: string }>;
}

export default async function StudioPage({ searchParams }: StudioPageProps) {
  const { key } = await searchParams;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("studio_session")?.value;
  const studioSecret = process.env.STUDIO_SECRET || process.env.CRON_SECRET;

  const isAuthorized =
    Boolean(studioSecret) &&
    ((Boolean(key) && key === studioSecret) ||
      (Boolean(sessionCookie) && sessionCookie === studioSecret));

  // 404 Cloaking: Return native Not Found page to scanners, bots, and public
  if (!isAuthorized || !studioSecret) {
    notFound();
  }

  // Fetch metrics and recent issues for author overview
  let activeSubscribers = 0;
  let recentIssues: Array<{
    id: string;
    title: string;
    subject: string;
    status: string;
    scheduledFor?: string;
    sentAt?: string;
    stats?: { success: number; failed: number };
    deliveredCount: number;
    createdAt: string;
    markdownText?: string;
  }> = [];

  try {
    const subscribersCol = await getSubscribersCollection();
    activeSubscribers = await subscribersCol.countDocuments({ status: "active" });

    const newslettersCol = await getNewslettersCollection();
    const rawIssues = await newslettersCol
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    recentIssues = rawIssues.map((doc) => ({
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
  } catch (err) {
    console.error("Failed to fetch initial studio data:", err);
  }

  return (
    <StudioClient
      activeSubscribers={activeSubscribers}
      initialIssues={recentIssues}
      initialKey={key}
      authorEmail="mondalgourab140@gmail.com"
    />
  );
}
