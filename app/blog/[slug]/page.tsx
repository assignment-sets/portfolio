import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogShareButton from "@/components/BlogShareButton";
import { getBlogPostBySlug } from "@/lib/blog";
import { getFeaturedProjects } from "@/lib/github";
import { ArrowLeft, Clock, Calendar } from "lucide-react";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post || post.status !== "published") {
    return {
      title: "Post Not Found | Gourab Mondal",
    };
  }

  const title = `${post.title} | Gourab Mondal`;
  const description =
    post.description ||
    `Read ${post.title} on Gourab Mondal's technical engineering blog.`;

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
      publishedTime: post.publishedAt?.toISOString(),
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
  const post = await getBlogPostBySlug(slug);

  // If post does not exist or is in draft state, return genuine 404
  if (!post || post.status !== "published") {
    notFound();
  }

  const projects = await getFeaturedProjects();

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : new Date(post.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

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
            <BlogShareButton
              title={post.title}
              slug={post.slug}
              description={post.description}
              variant="header"
            />
          </div>

          {/* Article Header */}
          <header className="blog-header">
            <h1 className="blog-title">{post.title}</h1>

            <div className="blog-meta-row">
              <div className="blog-meta-item">
                <Calendar size={14} />
                <time dateTime={post.publishedAt?.toISOString() || post.createdAt.toISOString()}>
                  {formattedDate}
                </time>
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
