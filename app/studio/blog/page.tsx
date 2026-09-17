import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ObjectId } from "mongodb";
import BlogStudioClient from "./BlogStudioClient";
import { getBlogsCollection, toIsoDateString } from "@/lib/blog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog Studio",
  robots: {
    index: false,
    follow: false,
  },
};

interface BlogStudioPageProps {
  searchParams: Promise<{ key?: string; edit?: string }>;
}

export default async function BlogStudioPage({ searchParams }: BlogStudioPageProps) {
  const { key, edit } = await searchParams;
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

  let initialSelectedBlog: (typeof initialBlogs)[0] | null = null;

  try {
    const blogsCol = await getBlogsCollection();
    const rawDocs = await blogsCol
      .find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(20)
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
      publishedAt: doc.publishedAt ? toIsoDateString(doc.publishedAt) : undefined,
      createdAt: toIsoDateString(doc.createdAt),
      updatedAt: toIsoDateString(doc.updatedAt),
    }));

    if (edit) {
      const trimmedEdit = edit.trim();
      const matched = initialBlogs.find(
        (b) => b.slug === trimmedEdit || b.id === trimmedEdit
      );

      if (matched) {
        initialSelectedBlog = matched;
      } else {
        const queryFilter = ObjectId.isValid(trimmedEdit)
          ? { _id: new ObjectId(trimmedEdit) }
          : { slug: trimmedEdit };
        const singleDoc = await blogsCol.findOne(queryFilter);
        if (singleDoc) {
          initialSelectedBlog = {
            id: singleDoc._id!.toString(),
            title: singleDoc.title,
            slug: singleDoc.slug,
            description: singleDoc.description || "",
            status: singleDoc.status,
            tags: singleDoc.tags || [],
            readingTimeMinutes: singleDoc.readingTimeMinutes || 1,
            coverImage: singleDoc.coverImage || "",
            content: singleDoc.content,
            publishedAt: singleDoc.publishedAt
              ? toIsoDateString(singleDoc.publishedAt)
              : undefined,
            createdAt: toIsoDateString(singleDoc.createdAt),
            updatedAt: toIsoDateString(singleDoc.updatedAt),
          };
          // Prepend to list if not present
          if (!initialBlogs.some((b) => b.id === initialSelectedBlog!.id)) {
            initialBlogs.unshift(initialSelectedBlog);
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch initial blog studio data:", err);
  }

  return (
    <BlogStudioClient
      initialBlogs={initialBlogs}
      initialSelectedBlog={initialSelectedBlog}
      initialKey={key}
    />
  );
}
