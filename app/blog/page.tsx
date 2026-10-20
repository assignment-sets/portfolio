import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogFeedClient from "@/components/BlogFeedClient";
import BlogSearchBar from "@/components/BlogSearchBar";
import { getCachedPublishedBlogPosts } from "@/lib/blog";
import { getFeaturedProjects } from "@/lib/github";

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

export default async function BlogIndexPage() {
  const [data, projects] = await Promise.all([
    getCachedPublishedBlogPosts({
      page: 1,
      limit: 10,
    }),
    getFeaturedProjects(),
  ]);

  return (
    <>
      <Navbar />
      <main className="wrap blog-index-wrap">
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
