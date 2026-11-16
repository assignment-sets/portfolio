import Link from "next/link";
import type { BlogPostSummary } from "@/lib/blog";
import { formatBlogDate, toIsoDateString } from "@/lib/blog-utils";

interface RelatedBlogsProps {
  posts: BlogPostSummary[];
}

export default function RelatedBlogs({ posts }: RelatedBlogsProps) {
  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <section className="related-blogs-section" aria-labelledby="related-blogs-heading">
      <div className="related-blogs-header">
        <h2 id="related-blogs-heading" className="related-blogs-heading">
          More to Read
        </h2>
        <Link href="/blog" className="related-blogs-all-link">
          All posts &rarr;
        </Link>
      </div>

      <div className="related-blogs-grid">
        {posts.map((post) => {
          const dateValue = post.publishedAt || post.createdAt;
          const isoDate = toIsoDateString(dateValue);
          const formattedDate = formatBlogDate(dateValue, "short");

          return (
            <article className="related-blog-card" key={post.slug}>
              <div className="related-blog-meta">
                <time dateTime={isoDate}>{formattedDate}</time>
                <span aria-hidden="true">&middot;</span>
                <span>{post.readingTimeMinutes || 1} min read</span>
              </div>

              <h3 className="related-blog-title">
                <Link
                  href={`/blog/${post.slug}`}
                  className="related-blog-link"
                >
                  {post.title}
                </Link>
              </h3>

              {post.description && (
                <p className="related-blog-desc">{post.description}</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
