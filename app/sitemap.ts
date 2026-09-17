import type { MetadataRoute } from "next";
import { getCachedPublishedBlogSlugs } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogSlugs = await getCachedPublishedBlogSlugs().catch(() => []);
  const blogUrls: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `https://gourabmondal.vercel.app/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: "https://gourabmondal.vercel.app",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://gourabmondal.vercel.app/blog",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://gourabmondal.vercel.app/llms.txt",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...blogUrls,
  ];
}
