"use client";

import Link from "next/link";
import {
  Mail,
  FileText,
  MapPin,
  Bot,
  Compass,
  ArrowUpRight,
  ArrowUp,
} from "lucide-react";
import { portfolioData } from "@/data/portfolio";
import type { Project } from "@/data/portfolio";
import { trackEvent } from "@/lib/analytics";
import NewsletterSubscribe from "@/components/NewsletterSubscribe";

interface FooterProps {
  projects?: Project[];
}

export default function Footer({
  projects = portfolioData.projects,
}: FooterProps) {
  const displayProjects =
    projects && projects.length > 0 ? projects : portfolioData.projects;
  return (
    <footer>
      <div className="footer-inner">
        <NewsletterSubscribe />
        <div className="footer-grid">
          {/* Brand & Social Column */}
          <div className="footer-brand-col">
            <span className="footer-brand-name">{portfolioData.name}</span>
            <span className="footer-brand-role">
              {portfolioData.role} &middot; {portfolioData.location}
            </span>
            <p className="footer-brand-desc">
              Interested mainly in backend systems, GenAI applications, and
              building reliable developer tools.
            </p>
            <div className="footer-social-row">
              <a
                href={portfolioData.github}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                aria-label="GitHub Profile"
                title="GitHub Profile"
                onClick={() =>
                  trackEvent("social_click", {
                    platform: "github",
                    location: "footer",
                  })
                }
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
              </a>
              <a
                href={portfolioData.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                aria-label="LinkedIn Profile"
                title="LinkedIn Profile"
                onClick={() =>
                  trackEvent("social_click", {
                    platform: "linkedin",
                    location: "footer",
                  })
                }
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
              <a
                href={`mailto:${portfolioData.email}`}
                className="footer-social-btn"
                aria-label="Email Me"
                title="Email Me"
                onClick={() =>
                  trackEvent("email_click", { location: "footer" })
                }
              >
                <Mail size={16} />
              </a>
              <a
                href={portfolioData.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                aria-label="Download Resume"
                title="Download Resume"
                onClick={() =>
                  trackEvent("resume_click", { location: "footer" })
                }
              >
                <FileText size={16} />
              </a>
            </div>
          </div>

          {/* Navigation Column */}
          <div>
            <h4 className="footer-col-title">Navigation</h4>
            <ul className="footer-links">
              <li>
                <Link href="/#hero" className="footer-link">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#skills" className="footer-link">
                  Skills
                </Link>
              </li>
              <li>
                <Link href="/#projects" className="footer-link">
                  Projects
                </Link>
              </li>
              <li>
                <Link href="/#experience" className="footer-link">
                  Experience
                </Link>
              </li>
              <li>
                <Link href="/#education" className="footer-link">
                  Education
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="footer-link">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Featured Code Column */}
          <div>
            <h4 className="footer-col-title">Featured Code</h4>
            <ul className="footer-links">
              {displayProjects.slice(0, 4).map((project) => (
                <li key={project.title}>
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                    onClick={() =>
                      trackEvent("project_click", {
                        project_name: project.title,
                        location: "footer",
                      })
                    }
                  >
                    <span>{project.title}</span>
                    <ArrowUpRight size={13} className="footer-link-icon" />
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={`${portfolioData.github}?tab=repositories`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link"
                  style={{ marginTop: "4px" }}
                  onClick={() =>
                    trackEvent("project_click", {
                      project_name: "all_repositories",
                      location: "footer",
                    })
                  }
                >
                  <span>All Repositories &rarr;</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Connect & Protocols Column */}
          <div>
            <h4 className="footer-col-title">Connect & Protocols</h4>
            <ul className="footer-links">
              <li>
                <a
                  href={`mailto:${portfolioData.email}`}
                  className="footer-link"
                  onClick={() =>
                    trackEvent("email_click", { location: "footer_text" })
                  }
                >
                  <Mail size={14} className="footer-link-icon" />
                  <span>{portfolioData.email}</span>
                </a>
              </li>
              <li>
                <span className="footer-link" style={{ cursor: "default" }}>
                  <MapPin size={14} className="footer-link-icon" />
                  <span>{portfolioData.location}</span>
                </span>
              </li>
              <li>
                <a
                  href="/llms.txt"
                  className="footer-link"
                  onClick={() =>
                    trackEvent("protocol_click", { target: "llms.txt" })
                  }
                >
                  <Bot size={14} className="footer-link-icon" />
                  <span>llms.txt (Agent Feed)</span>
                </a>
              </li>
              <li>
                <a
                  href="/sitemap.xml"
                  className="footer-link"
                  onClick={() =>
                    trackEvent("protocol_click", { target: "sitemap" })
                  }
                >
                  <Compass size={14} className="footer-link-icon" />
                  <span>Sitemap XML</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Sub-Footer Row */}
        <div className="footer-bottom">
          <span>&copy; 2026 {portfolioData.name}. All rights reserved.</span>
          <Link href="/#hero" className="footer-back-to-top">
            <span>Back to top</span>
            <ArrowUp size={13} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
