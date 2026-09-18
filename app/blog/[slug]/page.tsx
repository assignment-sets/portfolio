import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogShareButton from "@/components/BlogShareButton";
import BlogEditButton from "@/components/BlogEditButton";
import {
  getCachedBlogPostBySlug,
  getPublishedBlogSlugs,
  formatBlogDate,
  toIsoDateString,
} from "@/lib/blog";
import { getFeaturedProjects } from "@/lib/github";
import { ArrowLeft, Clock, Calendar } from "lucide-react";

export const revalidate = 86400; // 24-hour ISR edge cache fallback

export async function generateStaticParams() {
  const slugs = await getPublishedBlogSlugs().catch(() => []);
  return slugs.map((slug) => ({ slug }));
}

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedBlogPostBySlug(slug);

  if (!post || post.status !== "published") {
    return {
      title: "Post Not Found | Gourab Mondal",
    };
  }

  const title = `${post.title} | Gourab Mondal`;
  const description =
    post.description ||
    `Read ${post.title} on Gourab Mondal's technical engineering blog.`;

  const publishedIso = toIsoDateString(post.publishedAt || post.createdAt);

  return {
    title,
    description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: publishedIso,
      authors: ["Gourab Mondal"],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getCachedBlogPostBySlug(slug);

  // If post does not exist or is in draft state, return genuine 404
  if (!post || post.status !== "published") {
    notFound();
  }

  const projects = await getFeaturedProjects();

  const formattedDate = formatBlogDate(post.publishedAt || post.createdAt, "long");
  const isoDate = toIsoDateString(post.publishedAt || post.createdAt);

  return (
    <>
      <Navbar />
      <main className="wrap blog-post-wrap">
        <article className="blog-article">
          {/* Back Navigation & Share Button */}
          <div className="blog-back-nav">
            <Link href="/blog" className="blog-back-link">
              <ArrowLeft size={15} />
              <span>Back to all posts</span>
            </Link>
            <div className="blog-header-actions">
              <BlogEditButton slug={post.slug} />
              <BlogShareButton
                title={post.title}
                slug={post.slug}
                description={post.description}
                variant="header"
              />
            </div>
          </div>

          {/* Article Header */}
          <header className="blog-header">
            <h1 className="blog-title">{post.title}</h1>

            <div className="blog-meta-row">
              <div className="blog-meta-item">
                <Calendar size={14} />
                <time dateTime={isoDate}>{formattedDate}</time>
              </div>

              <span className="blog-meta-sep">&middot;</span>

              <div className="blog-meta-item">
                <Clock size={14} />
                <span>{post.readingTimeMinutes || 1} min read</span>
              </div>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="blog-tags-row">
                {post.tags.map((tag) => (
                  <span key={tag} className="blog-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {post.description && (
              <p className="blog-excerpt">{post.description}</p>
            )}
          </header>

          <hr className="blog-divider" />

          {/* Compiled Article Body */}
          <div
            className="blog-post-body"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          {/* Article End Share Action */}
          <div className="blog-article-footer-share">
            <BlogShareButton
              title={post.title}
              slug={post.slug}
              description={post.description}
              variant="footer"
            />
          </div>
        </article>
      </main>
      <Footer projects={projects} />
    </>
  );
}
