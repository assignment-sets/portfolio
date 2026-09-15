import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import BlogStudioClient from "./BlogStudioClient";
import { getBlogsCollection } from "@/lib/blog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog Studio",
  robots: {
    index: false,
    follow: false,
  },
};

interface BlogStudioPageProps {
  searchParams: Promise<{ key?: string }>;
}

export default async function BlogStudioPage({ searchParams }: BlogStudioPageProps) {
  const { key } = await searchParams;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("studio_session")?.value;
  const studioSecret = process.env.STUDIO_SECRET || process.env.CRON_SECRET;

  const isAuthorized =
    Boolean(studioSecret) &&
    ((Boolean(key) && key === studioSecret) ||
      (Boolean(sessionCookie) && sessionCookie === studioSecret));

  // 404 Cloaking: Return native Not Found page to scanners, bots, and unauthorized visitors
  if (!isAuthorized || !studioSecret) {
    notFound();
  }

  let initialBlogs: Array<{
    id: string;
    title: string;
    slug: string;
    description: string;
    status: string;
    tags: string[];
    readingTimeMinutes: number;
    coverImage: string;
    content: string;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
  }> = [];

  try {
    const blogsCol = await getBlogsCollection();
    const rawDocs = await blogsCol
      .find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(10)
      .toArray();

    initialBlogs = rawDocs.map((doc) => ({
      id: doc._id!.toString(),
      title: doc.title,
      slug: doc.slug,
      description: doc.description || "",
      status: doc.status,
      tags: doc.tags || [],
      readingTimeMinutes: doc.readingTimeMinutes || 1,
      coverImage: doc.coverImage || "",
      content: doc.content,
      publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : undefined,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }));
  } catch (err) {
    console.error("Failed to fetch initial blog studio data:", err);
  }

  return (
    <BlogStudioClient
      initialBlogs={initialBlogs}
      initialKey={key}
    />
  );
}
