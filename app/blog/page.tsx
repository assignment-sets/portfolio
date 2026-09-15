import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogCardLink from "@/components/BlogCardLink";
import BlogSearchBar from "@/components/BlogSearchBar";
import { getPublishedBlogPosts } from "@/lib/blog";
import { getFeaturedProjects } from "@/lib/github";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";

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
  searchParams?: Promise<{ page?: string; q?: string; tag?: string }>;
}

export default async function BlogIndexPage({
  searchParams,
}: BlogIndexPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = Math.max(
    1,
    parseInt(resolvedSearchParams?.page || "1", 10) || 1
  );
  const searchQuery = (resolvedSearchParams?.q || "").trim();
  const tagFilter = (resolvedSearchParams?.tag || "").trim();
  const pageSize = 10;

  const [data, projects] = await Promise.all([
    getPublishedBlogPosts({
      page: currentPage,
      limit: pageSize,
      query: searchQuery || undefined,
      tag: tagFilter || undefined,
    }),
    getFeaturedProjects(),
  ]);

  const { posts, total, totalPages, hasNextPage, hasPrevPage } = data;

  const buildPaginationUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (tagFilter) params.set("tag", tagFilter);
    if (pageNumber > 1) params.set("page", pageNumber.toString());
    const queryStr = params.toString();
    return queryStr ? `/blog?${queryStr}` : "/blog";
  };

  return (
    <>
      <Navbar />
      <main className="wrap blog-index-wrap">
        <header className="blog-index-header">
          <h1 className="blog-index-title">Blogs</h1>
        </header>

        <div className="blog-search-container">
          <BlogSearchBar initialQuery={searchQuery} />
        </div>

        {searchQuery && (
          <div className="blog-search-status">
            <span>
              Showing {total} {total === 1 ? "result" : "results"} for{" "}
              <strong>&ldquo;{searchQuery}&rdquo;</strong>
            </span>
          </div>
        )}

        <section className="blog-list-section">
          {posts.length === 0 ? (
            <div className="blog-empty-card">
              <div className="blog-empty-icon-wrap">
                <Search size={24} className="blog-empty-icon" />
              </div>
              <p className="blog-empty-title">
                {searchQuery
                  ? `No articles matching "${searchQuery}"`
                  : currentPage > 1
                  ? "No more articles on this page."
                  : "No articles published yet."}
              </p>
              <p className="blog-empty-desc">
                {searchQuery ? (
                  <>
                    Try searching with different keywords, check for spelling, or{" "}
                    <Link href="/blog" className="blog-empty-back-link">
                      browse all articles
                    </Link>
                    .
                  </>
                ) : currentPage > 1 ? (
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
                  href={buildPaginationUrl(currentPage - 1)}
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
                  href={buildPaginationUrl(currentPage + 1)}
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
