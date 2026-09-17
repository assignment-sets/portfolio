import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Skills from "@/components/Skills";
import Projects from "@/components/Projects";
import Experience from "@/components/Experience";
import Education from "@/components/Education";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { getFeaturedProjects } from "@/lib/github";
import { getCachedAvailabilityStatus } from "@/lib/settings";

export default async function Home() {
  const [projects, isAvailable] = await Promise.all([
    getFeaturedProjects(),
    getCachedAvailabilityStatus(),
  ]);

  return (
    <>
      <Navbar />
      <main className="wrap">
        <Hero isAvailable={isAvailable} />
        <Skills />
        <Projects projects={projects} />
        <Experience />
        <Education />
        <Contact />
      </main>
      <Footer projects={projects} />
    </>
  );
}
