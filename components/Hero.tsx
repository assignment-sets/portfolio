"use client";

import { portfolioData } from "@/data/portfolio";
import { trackEvent } from "@/lib/analytics";

export default function Hero() {
  return (
    <section id="hero">
      <div className="avail-badge">&#x25CF;&nbsp; Available for work</div>
      <h1>{portfolioData.name}</h1>
      <p className="hero-role">{portfolioData.role}</p>
      <p className="hero-location">{portfolioData.location}</p>
      <p className="hero-bio">{portfolioData.bio}</p>
      <div className="hero-links">
        <a
          href={`mailto:${portfolioData.email}`}
          aria-label={`Send email to ${portfolioData.email}`}
          onClick={() => trackEvent("email_click", { location: "hero" })}
        >
          Email
        </a>
        <a
          href={portfolioData.github}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Gourab Mondal's GitHub profile"
          onClick={() =>
            trackEvent("social_click", {
              platform: "github",
              location: "hero",
            })
          }
        >
          GitHub
        </a>
        <a
          href={portfolioData.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Gourab Mondal's LinkedIn profile"
          onClick={() =>
            trackEvent("social_click", {
              platform: "linkedin",
              location: "hero",
            })
          }
        >
          LinkedIn
        </a>
        <a
          href={portfolioData.resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download Gourab Mondal's resume PDF"
          onClick={() => trackEvent("resume_click", { location: "hero" })}
        >
          Resume &darr;
        </a>
      </div>
    </section>
  );
}
