import { ObjectId } from "mongodb";
import { marked } from "marked";
import { unstable_cache } from "next/cache";
import { getDb } from "./mongodb";

export interface BlogPost {
  _id?: ObjectId | string;
  title: string;
  slug: string;
  description?: string;
  content: string;
  contentHtml: string;
  status: "draft" | "published";
  tags: string[];
  coverImage?: string;
  readingTimeMinutes: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Normalizes title into a clean, URL-safe slug.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/&/g, "-and-") // Replace & with 'and'
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

export {
  calculateReadingTime,
  calculateReadingTimeDetails,
  type ReadingTimeStats,
} from "./reading-time";

/**
 * Safely converts Date | string | null to an ISO-8601 string.
 */
export function toIsoDateString(date?: Date | string | null): string {
  if (!date) return "";
  if (typeof date === "string") return date;
  if (date instanceof Date) return date.toISOString();
  return new Date(date).toISOString();
}

/**
 * Safely formats Date | string | null to human-readable format.
 */
export function formatBlogDate(
  date?: Date | string | null,
  format: "short" | "long" = "short"
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: format === "long" ? "long" : "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Returns the MongoDB `blogs` collection with unique slug and status indexes.
 */
export async function getBlogsCollection() {
  const db = await getDb();
  const collection = db.collection<BlogPost>("blogs");
  await collection.createIndex({ slug: 1 }, { unique: true }).catch(() => {});
  await collection.createIndex({ status: 1, publishedAt: -1 }).catch(() => {});
  return collection;
}

/**
 * Renders Markdown content into safe, semantic HTML.
 */
export async function renderBlogMarkdown(content: string): Promise<string> {
  marked.setOptions({
    gfm: true,
    breaks: true,
  });
  return marked.parse(content);
}

/**
 * Retrieves all published blog slugs for static generation (SSG) and dynamic sitemaps.
 */
export async function getPublishedBlogSlugs(): Promise<string[]> {
  try {
    const collection = await getBlogsCollection();
    const docs = await collection
      .find({ status: "published" }, { projection: { slug: 1 } })
      .toArray();
    return docs.map((d) => d.slug).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Cached version of getPublishedBlogSlugs with 24-hour fallback TTL.
 */
export const getCachedPublishedBlogSlugs = unstable_cache(
  async () => getPublishedBlogSlugs(),
  ["published-blog-slugs"],
  {
    tags: ["blogs", "blog-slugs"],
    revalidate: 86400,
  }
);

/**
 * Retrieves a single blog post by slug.
 * If not previewing a draft, only returns published posts.
 */
export async function getBlogPostBySlug(
  slug: string,
  includeDraft: boolean = false
): Promise<BlogPost | null> {
  const collection = await getBlogsCollection();
  const query: Record<string, unknown> = { slug };
  if (!includeDraft) {
    query.status = "published";
  }
  return collection.findOne(query);
}

/**
 * Cached version of getBlogPostBySlug with on-demand tag invalidation.
 */
export const getCachedBlogPostBySlug = unstable_cache(
  async (slug: string): Promise<BlogPost | null> => {
    const doc = await getBlogPostBySlug(slug, false);
    if (!doc) return null;
    return {
      ...doc,
      _id: doc._id?.toString(),
      publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : undefined,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
    };
  },
  ["blog-post-by-slug"],
  {
    tags: ["blogs", "blog-posts"],
    revalidate: 86400,
  }
);

export interface PaginatedBlogPosts {
  posts: BlogPost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Retrieves paginated published blog posts with optional tag filtering and Atlas native Lucene search.
 * Uses MongoDB Atlas Search ($search) with compound fuzzy text matching across title, tags, description, and content.
 */
export async function getPublishedBlogPosts(options?: {
  tag?: string;
  query?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedBlogPosts> {
  const collection = await getBlogsCollection();
  const page = Math.max(1, options?.page || 1);
  const limit = options?.limit && options.limit > 0 ? options.limit : 10;
  const skip = (page - 1) * limit;
  const trimmedQuery = options?.query?.trim() || "";

  if (trimmedQuery) {
    // --- MongoDB Atlas Search Native Lucene Aggregation Pipeline ($search) ---
    const searchStage: Record<string, unknown> = {
      $search: {
        index: "default",
        compound: {
          should: [
            {
              text: {
                query: trimmedQuery,
                path: "title",
                score: { boost: { value: 5 } },
                fuzzy: { maxEdits: 1 },
              },
            },
            {
              text: {
                query: trimmedQuery,
                path: "tags",
                score: { boost: { value: 3 } },
                fuzzy: { maxEdits: 1 },
              },
            },
            {
              text: {
                query: trimmedQuery,
                path: "description",
                score: { boost: { value: 2 } },
                fuzzy: { maxEdits: 1 },
              },
            },
            {
              text: {
                query: trimmedQuery,
                path: "content",
                fuzzy: { maxEdits: 1 },
              },
            },
          ],
          minimumShouldMatch: 1,
          filter: [
            {
              text: {
                query: "published",
                path: "status",
              },
            },
            ...(options?.tag
              ? [
                  {
                    text: {
                      query: options.tag,
                      path: "tags",
                    },
                  },
                ]
              : []),
          ],
        },
        count: {
          type: "total",
        },
      },
    };

    const pipeline = [
      searchStage,
      {
        $facet: {
          metadata: [{ $replaceWith: "$$SEARCH_META" }, { $limit: 1 }],
          docs: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    try {
      const result = await collection.aggregate(pipeline).toArray();
      const firstFacet = result[0] as
        | {
            metadata?: Array<{ count?: { total?: number } }>;
            docs?: BlogPost[];
          }
        | undefined;

      const total = firstFacet?.metadata?.[0]?.count?.total || 0;
      const posts = (firstFacet?.docs || []) as BlogPost[];
      const totalPages = Math.max(1, Math.ceil(total / limit));

      return {
        posts,
        total,
        page,
        pageSize: limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };
    } catch {
      return {
        posts: [],
        total: 0,
        page,
        pageSize: limit,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    }
  }

  // --- Standard non-search paginated query ---
  const query: Record<string, unknown> = { status: "published" };
  if (options?.tag) {
    query.tags = options.tag;
  }

  const [total, posts] = await Promise.all([
    collection.countDocuments(query),
    collection
      .find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    posts: posts.map((p) => ({
      ...p,
      _id: p._id?.toString(),
    })),
    total,
    page,
    pageSize: limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

const getCachedPublishedBlogPostsInternal = unstable_cache(
  async (page: number, limit: number, tag?: string): Promise<PaginatedBlogPosts> => {
    const res = await getPublishedBlogPosts({ page, limit, tag });
    return {
      ...res,
      posts: res.posts.map((p) => ({
        ...p,
        _id: p._id?.toString(),
        publishedAt: p.publishedAt ? new Date(p.publishedAt) : undefined,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      })),
    };
  },
  ["published-blog-posts-feed"],
  {
    tags: ["blogs", "blog-feed"],
    revalidate: 3600,
  }
);

/**
 * Cached version of getPublishedBlogPosts.
 * Bypasses cache when a search query is active to ensure instant live Lucene search results.
 */
export async function getCachedPublishedBlogPosts(options?: {
  tag?: string;
  query?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedBlogPosts> {
  // If search query is present, bypass cache and run live Atlas search
  if (options?.query?.trim()) {
    return getPublishedBlogPosts(options);
  }

  const page = Math.max(1, options?.page || 1);
  const limit = options?.limit && options.limit > 0 ? options.limit : 10;
  const tag = options?.tag?.trim() || undefined;

  return getCachedPublishedBlogPostsInternal(page, limit, tag);
}
