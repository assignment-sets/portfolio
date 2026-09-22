import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

import {
  verifySessionToken,
  STUDIO_COOKIE_NAME,
  getStudioPasskeysCollection,
} from "@/lib/auth-studio";

export default async function StudioPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(STUDIO_COOKIE_NAME)?.value;
  const session = verifySessionToken(sessionCookie);

  if (!session.valid || !session.username) {
    redirect("/studio/login");
  }

  // Fetch summary stats concurrently for the dashboard hub
  let available = true;
  let activeSubscribers = 0;
  let totalNewsletters = 0;
  let totalBlogs = 0;
  let publishedBlogs = 0;
  let draftBlogs = 0;
  let initialPasskeys: Array<{ id: string; deviceName: string; createdAt: string }> = [];

  try {
    const [availStatus, subCol, newsCol, blogsCol, passkeysCol] = await Promise.all([
      getAvailabilityStatus(),
      getSubscribersCollection().catch(() => null),
      getNewslettersCollection().catch(() => null),
      getBlogsCollection().catch(() => null),
      getStudioPasskeysCollection().catch(() => null),
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

    if (passkeysCol) {
      const docs = await passkeysCol
        .find({ username: session.username })
        .project({ credentialID: 1, deviceName: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .toArray();

      initialPasskeys = docs.map((d) => ({
        id: d.credentialID,
        deviceName: d.deviceName || "Security Key",
        createdAt: d.createdAt.toISOString(),
      }));
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
      initialPasskeys={initialPasskeys}
    />
  );
}
