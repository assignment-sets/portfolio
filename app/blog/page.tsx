import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogCardLink from "@/components/BlogCardLink";
import { getPublishedBlogPosts } from "@/lib/blog";
import { getFeaturedProjects } from "@/lib/github";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blogs | Gourab Mondal",
  description:
    "Technical essays and engineering notes on distributed systems, backend architectures, performance, and AI agents.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blogs | Gourab Mondal",
    description:
      "Technical essays and engineering notes on distributed systems, backend architectures, performance, and AI agents.",
    type: "website",
    url: "https://gourabmondal.vercel.app/blog",
  },
};

export const dynamic = "force-dynamic";

interface BlogIndexPageProps {
  searchParams?: Promise<{ page?: string }>;
}

export default async function BlogIndexPage({
  searchParams,
}: BlogIndexPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = Math.max(
    1,
    parseInt(resolvedSearchParams?.page || "1", 10) || 1
  );
  const pageSize = 10;

  const [data, projects] = await Promise.all([
    getPublishedBlogPosts({ page: currentPage, limit: pageSize }),
    getFeaturedProjects(),
  ]);

  const { posts, totalPages, hasNextPage, hasPrevPage } = data;

  return (
    <>
      <Navbar />
      <main className="wrap blog-index-wrap">
        <header className="blog-index-header">
          <h1 className="blog-index-title">Blogs</h1>
        </header>

        <section className="blog-list-section">
          {posts.length === 0 ? (
            <div className="blog-empty-card">
              <p className="blog-empty-title">
                {currentPage > 1
                  ? "No more articles on this page."
                  : "No articles published yet."}
              </p>
              <p className="blog-empty-desc">
                {currentPage > 1 ? (
                  <Link href="/blog" className="blog-empty-back-link">
                    &larr; Return to page 1
                  </Link>
                ) : (
                  "Articles are currently in draft or being written. Check back soon or subscribe to the newsletter below."
                )}
              </p>
            </div>
          ) : (
            <div className="blog-cards-grid">
              {posts.map((post) => {
                const formattedDate = post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : new Date(post.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                return (
                  <article key={post.slug} className="blog-card">
                    <div className="blog-card-meta">
                      <time
                        dateTime={
                          post.publishedAt?.toISOString() ||
                          post.createdAt.toISOString()
                        }
                      >
                        {formattedDate}
                      </time>
                      <span className="blog-card-dot">&middot;</span>
                      <span>{post.readingTimeMinutes || 1} min read</span>
                    </div>

                    <h2 className="blog-card-title">
                      <BlogCardLink
                        href={`/blog/${post.slug}`}
                        title={post.title}
                        slug={post.slug}
                        location="card_title"
                        className="blog-card-link"
                      >
                        {post.title}
                      </BlogCardLink>
                    </h2>

                    {post.description && (
                      <p className="blog-card-excerpt">{post.description}</p>
                    )}

                    {post.tags && post.tags.length > 0 && (
                      <div className="blog-card-tags">
                        {post.tags.map((tag) => (
                          <span key={tag} className="blog-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="blog-card-footer">
                      <BlogCardLink
                        href={`/blog/${post.slug}`}
                        title={post.title}
                        slug={post.slug}
                        location="read_more"
                        className="blog-read-more"
                      >
                        <span>Read article</span>
                        <ArrowRight size={13} />
                      </BlogCardLink>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="blog-pagination">
              {hasPrevPage ? (
                <Link
                  href={
                    currentPage - 1 === 1
                      ? "/blog"
                      : `/blog?page=${currentPage - 1}`
                  }
                  className="blog-pagination-btn"
                >
                  <ArrowLeft size={13} />
                  <span>Previous</span>
                </Link>
              ) : (
                <span className="blog-pagination-btn disabled">
                  <ArrowLeft size={13} />
                  <span>Previous</span>
                </span>
              )}

              <span className="blog-pagination-info">
                Page {currentPage} of {totalPages}
              </span>

              {hasNextPage ? (
                <Link
                  href={`/blog?page=${currentPage + 1}`}
                  className="blog-pagination-btn"
                >
                  <span>Next</span>
                  <ArrowRight size={13} />
                </Link>
              ) : (
                <span className="blog-pagination-btn disabled">
                  <span>Next</span>
                  <ArrowRight size={13} />
                </span>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer projects={projects} />
    </>
  );
}
