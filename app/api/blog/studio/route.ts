import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  getBlogsCollection,
  renderBlogMarkdown,
  slugify,
  calculateReadingTime,
  toIsoDateString,
  BlogPost,
} from "@/lib/blog";
import { escapeRegex } from "@/lib/sanitize";

export const maxDuration = 60;

const searchSchema = z.object({
  query: z.string().max(100, "Search query cannot exceed 100 characters").optional(),
});

const renderPreviewSchema = z.object({
  markdown: z.string().min(1, "Markdown is required").max(150000, "Markdown content exceeds 150KB limit"),
});

const deleteSchema = z.object({
  blogId: z.string().refine((val) => ObjectId.isValid(val), "Valid blogId is required"),
});

const saveBlogSchema = z.object({
  blogId: z.string().refine((val) => ObjectId.isValid(val), "Invalid blogId").optional(),
  title: z.string().trim().min(1, "Title is required").max(200, "Title cannot exceed 200 characters"),
  slug: z
    .string()
    .trim()
    .max(100, "Slug cannot exceed 100 characters")
    .regex(/^[a-z0-9-_]*$/i, "Slug can only contain letters, numbers, hyphens, and underscores")
    .optional(),
  description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional(),
  markdown: z.string().min(1, "Markdown is required").max(150000, "Markdown content exceeds 150KB limit"),
  tags: z
    .union([
      z.array(z.string().trim().max(50, "Tag cannot exceed 50 characters")),
      z.string().max(500, "Tags string cannot exceed 500 characters"),
    ])
    .optional(),
  coverImage: z
    .string()
    .trim()
    .max(1000, "Cover image URL cannot exceed 1000 characters")
    .refine(
      (val) => !val || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/"),
      "Cover image must be a valid HTTP(S) URL or absolute path"
    )
    .optional(),
  status: z.enum(["draft", "published"]).optional(),
});

async function checkAuth(req: NextRequest, bodySecret?: string): Promise<boolean> {
  const studioSecret = process.env.STUDIO_SECRET;
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

    const { action } = body;

    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "Valid action is required." }, { status: 400 });
    }

    const blogsCol = await getBlogsCollection();

    // ACTION: Search or list recent blog posts
    if (action === "search" || action === "list") {
      const parsed = searchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const q = parsed.data.query?.trim() || "";
      let filter: Record<string, unknown> = {};

      if (q) {
        const escaped = escapeRegex(q);
        filter = {
          $or: [
            { title: { $regex: escaped, $options: "i" } },
            { slug: { $regex: escaped, $options: "i" } },
            { description: { $regex: escaped, $options: "i" } },
            { content: { $regex: escaped, $options: "i" } },
            { tags: { $regex: escaped, $options: "i" } },
          ],
        };
      }

      const rawDocs = await blogsCol
        .find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(10)
        .toArray();

      const formatted = rawDocs.map((doc) => ({
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

      return NextResponse.json({ success: true, blogs: formatted });
    }

    // ACTION: Compile Markdown to HTML preview
    if (action === "render_preview") {
      const parsed = renderPreviewSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const html = await renderBlogMarkdown(parsed.data.markdown);
      return NextResponse.json({ success: true, html });
    }

    // ACTION: Delete Blog Post permanently
    if (action === "delete") {
      const parsed = deleteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const { blogId } = parsed.data;
      const existing = await blogsCol.findOne({ _id: new ObjectId(blogId) });
      if (!existing) {
        return NextResponse.json({ error: "Blog post not found." }, { status: 404 });
      }

      await blogsCol.deleteOne({ _id: new ObjectId(blogId) });

      // Synchronously invalidate edge cache and sitemap
      try {
        revalidateTag("blogs", "max");
        revalidatePath("/blog");
        if (existing.slug) {
          revalidatePath(`/blog/${existing.slug}`);
        }
        revalidatePath("/sitemap.xml");
      } catch (cacheErr) {
        console.error("Failed to revalidate cache on delete:", cacheErr);
      }

      return NextResponse.json({
        success: true,
        action: "delete",
        blogId,
        message: "Blog post permanently deleted.",
      });
    }

    // ACTION: Save Draft or Publish
    if (action === "save_draft" || action === "publish") {
      const parsed = saveBlogSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const {
        blogId,
        title,
        slug: customSlug,
        description,
        markdown,
        tags,
        coverImage,
        status: requestedStatus,
      } = parsed.data;

      const isPublish = action === "publish" || requestedStatus === "published";
      const status: "draft" | "published" = isPublish ? "published" : "draft";

      // Determine clean slug
      let finalSlug = slugify(customSlug || title);
      if (!finalSlug) {
        finalSlug = `post-${Date.now()}`;
      }

      // Ensure slug uniqueness across other documents
      const existingSlug = await blogsCol.findOne({
        slug: finalSlug,
        ...(blogId ? { _id: { $ne: new ObjectId(blogId) } } : {}),
      });

      if (existingSlug) {
        finalSlug = `${finalSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const contentHtml = await renderBlogMarkdown(markdown);
      const readingTimeMinutes = calculateReadingTime(markdown);
      const parsedTags = Array.isArray(tags)
        ? tags.map((t) => String(t).trim()).filter(Boolean)
        : typeof tags === "string"
        ? tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      if (blogId) {
        const existing = await blogsCol.findOne({ _id: new ObjectId(blogId) });
        const publishedAt = isPublish
          ? existing?.publishedAt || new Date()
          : undefined;

        await blogsCol.updateOne(
          { _id: new ObjectId(blogId) },
          {
            $set: {
              title,
              slug: finalSlug,
              description: description || "",
              content: markdown,
              contentHtml,
              status,
              tags: parsedTags,
              coverImage: coverImage || "",
              readingTimeMinutes,
              ...(isPublish && { publishedAt }),
              updatedAt: new Date(),
            },
            ...(!isPublish && { $unset: { publishedAt: "" } }),
          }
        );

        // Synchronously invalidate edge cache and sitemap
        try {
          revalidateTag("blogs", "max");
          revalidatePath("/blog");
          revalidatePath(`/blog/${finalSlug}`);
          if (existing?.slug && existing.slug !== finalSlug) {
            revalidatePath(`/blog/${existing.slug}`);
          }
          revalidatePath("/sitemap.xml");
        } catch (cacheErr) {
          console.error("Failed to revalidate cache on update:", cacheErr);
        }

        return NextResponse.json({
          success: true,
          action,
          blogId,
          slug: finalSlug,
          message: isPublish ? "Blog post published successfully!" : "Draft saved successfully!",
        });
      }

      // Create new blog document
      const newPost: BlogPost = {
        title,
        slug: finalSlug,
        description: description || "",
        content: markdown,
        contentHtml,
        status,
        tags: parsedTags,
        coverImage: coverImage || "",
        readingTimeMinutes,
        publishedAt: isPublish ? new Date() : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertResult = await blogsCol.insertOne(newPost);

      // Synchronously invalidate edge cache and sitemap
      try {
        revalidateTag("blogs", "max");
        revalidatePath("/blog");
        revalidatePath(`/blog/${finalSlug}`);
        revalidatePath("/sitemap.xml");
      } catch (cacheErr) {
        console.error("Failed to revalidate cache on insert:", cacheErr);
      }

      return NextResponse.json({
        success: true,
        action,
        blogId: insertResult.insertedId.toString(),
        slug: finalSlug,
        message: isPublish ? "Blog post published successfully!" : "Draft created successfully!",
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Blog studio API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
