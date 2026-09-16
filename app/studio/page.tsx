import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import StudioHubClient from "./StudioHubClient";
import {
  getSubscribersCollection,
  getNewslettersCollection,
} from "@/lib/newsletter";
import { getBlogsCollection } from "@/lib/blog";
import { getAvailabilityStatus } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Control Center",
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

  // Fetch summary stats concurrently for the dashboard hub
  let available = true;
  let activeSubscribers = 0;
  let totalNewsletters = 0;
  let totalBlogs = 0;
  let publishedBlogs = 0;
  let draftBlogs = 0;

  try {
    const [availStatus, subCol, newsCol, blogsCol] = await Promise.all([
      getAvailabilityStatus(),
      getSubscribersCollection().catch(() => null),
      getNewslettersCollection().catch(() => null),
      getBlogsCollection().catch(() => null),
    ]);

    available = availStatus;

    if (subCol) {
      activeSubscribers = await subCol.countDocuments({ status: "active" });
    }

    if (newsCol) {
      totalNewsletters = await newsCol.countDocuments({});
    }

    if (blogsCol) {
      totalBlogs = await blogsCol.countDocuments({});
      publishedBlogs = await blogsCol.countDocuments({ status: "published" });
      draftBlogs = await blogsCol.countDocuments({ status: "draft" });
    }
  } catch (err) {
    console.error("Failed to fetch studio hub stats:", err);
  }

  return (
    <StudioHubClient
      initialStats={{
        available,
        activeSubscribers,
        totalNewsletters,
        totalBlogs,
        publishedBlogs,
        draftBlogs,
      }}
      initialKey={key}
    />
  );
}
