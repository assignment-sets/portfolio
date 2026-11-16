import Link from "next/link";
import type { BlogPost } from "@/lib/blog";
import { formatBlogDate, toIsoDateString } from "@/lib/blog-utils";

interface FeaturedBlogsProps {
  posts: BlogPost[];
}

export default function FeaturedBlogs({ posts }: FeaturedBlogsProps) {
  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <section id="writing">
      <h2>Latest Writing</h2>
      <div className="featured-blogs-grid">
        {posts.map((post) => {
          const dateValue = post.publishedAt || post.createdAt;
          const isoDate = toIsoDateString(dateValue);
          const formattedDate = formatBlogDate(dateValue, "short");

          return (
            <article className="featured-blog-card" key={post.slug}>
              <div className="featured-blog-meta">
                <time dateTime={isoDate}>{formattedDate}</time>
                <span aria-hidden="true">&middot;</span>
                <span>{post.readingTimeMinutes || 1} min read</span>
              </div>

              <h3>
                <Link
                  href={`/blog/${post.slug}`}
                  className="featured-blog-title-link"
                >
                  {post.title}
                </Link>
              </h3>

              {post.description && (
                <p className="featured-blog-desc">{post.description}</p>
              )}

              <div className="featured-blog-footer">
                <Link
                  href={`/blog/${post.slug}`}
                  className="featured-blog-read-link"
                  aria-label={`Read ${post.title}`}
                >
                  Read post &rarr;
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      <p className="section-more-link">
        <Link href="/blog">read all posts &rarr;</Link>
      </p>
    </section>
  );
}
