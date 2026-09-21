"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, ArrowLeft, ArrowRight } from "lucide-react";
import BlogSearchBar from "@/components/BlogSearchBar";
import BlogCardLink from "@/components/BlogCardLink";
import type { PaginatedBlogPosts } from "@/lib/blog";
import { formatBlogDate, toIsoDateString } from "@/lib/blog-utils";

interface BlogFeedClientProps {
  initialData: PaginatedBlogPosts;
}

export default function BlogFeedClient({ initialData }: BlogFeedClientProps) {
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const searchQuery = (searchParams?.get("q") || "").trim();
  const tagFilter = (searchParams?.get("tag") || "").trim();
  const currentPage = Math.max(
    1,
    parseInt(searchParams?.get("page") || "1", 10) || 1
  );

  const isDefaultFeed = !searchQuery && !tagFilter && currentPage === 1;
  const queryKey = `${searchQuery}:${tagFilter}:${currentPage}`;
  const [loadedKey, setLoadedKey] = useState(queryKey);
  const [feedData, setFeedData] = useState<PaginatedBlogPosts>(initialData);
  const isLoading = !isDefaultFeed && loadedKey !== queryKey;

  // Sync client feed data when URL parameters (search query, tag, page) change
  useEffect(() => {
    // If on default page 1 with no search or tag filter, active feed is initialData directly
    if (isDefaultFeed) {
      return;
    }

    let isCancelled = false;

    const params = new URLSearchParams();
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (searchQuery) params.set("q", searchQuery);
    if (tagFilter) params.set("tag", tagFilter);
    params.set("limit", "10");

    fetch(`/api/blog?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isCancelled) return;
        if (data && data.success) {
          startTransition(() => {
            setFeedData({
              posts: data.posts || [],
              total: data.total || 0,
              page: data.page || currentPage,
              pageSize: data.pageSize || 10,
              totalPages: data.totalPages || 1,
              hasNextPage: Boolean(data.hasNextPage),
              hasPrevPage: Boolean(data.hasPrevPage),
            });
            setLoadedKey(queryKey);
          });
        } else {
          setLoadedKey(queryKey);
        }
      })
      .catch(() => {
        if (!isCancelled) setLoadedKey(queryKey);
      });

    return () => {
      isCancelled = true;
    };
  }, [searchQuery, tagFilter, currentPage, isDefaultFeed, queryKey]);

  const activeFeed = isDefaultFeed ? initialData : feedData;
  const { posts, total, totalPages, hasNextPage, hasPrevPage } = activeFeed;

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

      <section
        className="blog-list-section"
        style={{
          opacity: isLoading ? 0.6 : 1,
          transition: "opacity 0.15s ease",
        }}
      >
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
              const formattedDate = formatBlogDate(
                post.publishedAt || post.createdAt,
                "short"
              );
              const isoDate = toIsoDateString(
                post.publishedAt || post.createdAt
              );

              return (
                <article key={post.slug} className="blog-card">
                  <div className="blog-card-meta">
                    <time dateTime={isoDate}>{formattedDate}</time>
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
    </>
  );
}
