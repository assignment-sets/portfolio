import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogFeedClient from "@/components/BlogFeedClient";
import BlogSearchBar from "@/components/BlogSearchBar";
import { getCachedPublishedBlogPosts } from "@/lib/blog";
import { getFeaturedProjects } from "@/lib/github";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blogs | Gourab Mondal",
  description:
    "Technical essays and engineering notes on distributed systems, backend architectures, performance, and AI agents.",
  alternates: {
    canonical: "/blog",
    types: {
      "text/markdown": "/blog.md",
    },
  },
  openGraph: {
    title: "Blogs | Gourab Mondal",
    description:
      "Technical essays and engineering notes on distributed systems, backend architectures, performance, and AI agents.",
    type: "website",
    url: `${SITE_URL}/blog`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Blogs | Gourab Mondal",
    description:
      "Technical essays and engineering notes on distributed systems, backend architectures, performance, and AI agents.",
  },
};

export const revalidate = 3600; // 1-hour ISR edge cache fallback

function BlogFeedFallback() {
  return (
    <>
      <div className="blog-search-container">
        <BlogSearchBar initialQuery="" />
      </div>
      <div className="blog-list-section" style={{ minHeight: "300px" }} />
    </>
  );
}

interface BlogIndexPageProps {
  searchParams: Promise<{
    page?: string;
    tag?: string;
    q?: string;
  }>;
}

export default async function BlogIndexPage({
  searchParams,
}: BlogIndexPageProps) {
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams?.page || "1", 10) || 1);
  const tag = resolvedParams?.tag?.trim() || undefined;
  const query = resolvedParams?.q?.trim() || undefined;

  const [data, projects] = await Promise.all([
    getCachedPublishedBlogPosts({
      page,
      limit: 10,
      tag,
      query,
    }),
    getFeaturedProjects(),
  ]);

  return (
    <>
      <Navbar />
      <main className="wrap blog-index-wrap" id="main-content">
        <header className="blog-index-header">
          <h1 className="blog-index-title">Blogs</h1>
        </header>

        <Suspense fallback={<BlogFeedFallback />}>
          <BlogFeedClient initialData={data} />
        </Suspense>
      </main>
      <Footer projects={projects} />
    </>
  );
}
