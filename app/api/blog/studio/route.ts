import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { ObjectId } from "mongodb";
import {
  getBlogsCollection,
  renderBlogMarkdown,
  slugify,
  calculateReadingTime,
  toIsoDateString,
  BlogPost,
} from "@/lib/blog";

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

    const {
      action,
      blogId,
      title,
      slug: customSlug,
      description,
      markdown,
      tags,
      coverImage,
      status: requestedStatus,
      query,
    } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    const blogsCol = await getBlogsCollection();

    // ACTION: Search or list recent blog posts
    if (action === "search" || action === "list") {
      const q = typeof query === "string" ? query.trim() : "";
      let filter: Record<string, unknown> = {};

      if (q) {
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      if (!markdown) {
        return NextResponse.json({ error: "Markdown content is required." }, { status: 400 });
      }
      const html = await renderBlogMarkdown(markdown);
      return NextResponse.json({ success: true, html });
    }

    // ACTION: Delete Blog Post permanently
    if (action === "delete") {
      if (!blogId || !ObjectId.isValid(blogId)) {
        return NextResponse.json({ error: "Valid blogId is required." }, { status: 400 });
      }

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
      if (!title || !markdown) {
        return NextResponse.json(
          { error: "Title and markdown content are required." },
          { status: 400 }
        );
      }

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
        ...(blogId && ObjectId.isValid(blogId) ? { _id: { $ne: new ObjectId(blogId) } } : {}),
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

      if (blogId && ObjectId.isValid(blogId)) {
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
