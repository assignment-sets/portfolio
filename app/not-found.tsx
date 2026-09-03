import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NotFoundVisual from "@/components/NotFoundVisual";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="wrap">
        <div className="not-found-wrap">
          <span className="not-found-badge">404 // Page Not Found</span>
          <NotFoundVisual />
          <h1 className="not-found-title">Lost in the source tree.</h1>
          <p className="not-found-desc">
            The page you requested doesn&apos;t exist, has been moved, or is
            temporarily unreachable. Let&apos;s get you back on track.
          </p>
          <div className="not-found-actions">
            <Link href="/" className="primary-btn">
              <ArrowLeft size={14} />
              Return Home
            </Link>
            <Link href="/#projects">
              <Compass size={14} />
              Explore Projects
            </Link>
            <Link href="/#contact">Get in Touch &rarr;</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
