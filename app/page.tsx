import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Skills from "@/components/Skills";
import Projects from "@/components/Projects";
import FeaturedBlogs from "@/components/FeaturedBlogs";
import Experience from "@/components/Experience";
import Education from "@/components/Education";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { getFeaturedProjects } from "@/lib/github";
import { getCachedAvailabilityStatus } from "@/lib/settings";
import { getCachedPublishedBlogPosts } from "@/lib/blog";

export default async function Home() {
  const [projects, isAvailable, blogFeed] = await Promise.all([
    getFeaturedProjects(),
    getCachedAvailabilityStatus(),
    getCachedPublishedBlogPosts({ page: 1, limit: 3 }).catch(() => null),
  ]);

  return (
    <>
      <Navbar />
      <main className="wrap" id="main-content">
        <Hero isAvailable={isAvailable} />
        <Skills />
        <Projects projects={projects} />
        <FeaturedBlogs posts={blogFeed?.posts ?? []} />
        <Experience />
        <Education />
        <Contact />
      </main>
      <Footer projects={projects} />
    </>
  );
}
