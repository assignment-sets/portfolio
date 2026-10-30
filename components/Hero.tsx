import { portfolioData } from "@/data/portfolio";
import { SparkIdCard } from "@/components/spark-id-card";

interface HeroProps {
  isAvailable?: boolean;
}

export default function Hero({ isAvailable = true }: HeroProps) {
  const firstName = portfolioData.name.split(" ")[0] || "Gourab";

  return (
    <section id="hero">
      <div className="hero-grid">
        <div className="hero-main">
          {isAvailable && (
            <div className="avail-badge">&#x25CF;&nbsp; Available for work</div>
          )}
          <h1>{portfolioData.name}</h1>
          <p className="hero-role">{portfolioData.role}</p>
          <p className="hero-location">{portfolioData.location}</p>
          <p className="hero-bio">{portfolioData.bio}</p>
          <div className="hero-links">
            <a
              href={`mailto:${portfolioData.email}`}
              aria-label={`Send email to ${portfolioData.email}`}
              data-track-event="email_click"
              data-track-params={JSON.stringify({ location: "hero" })}
            >
              Email
            </a>
            <a
              href={portfolioData.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Gourab Mondal's GitHub profile"
              data-track-event="social_click"
              data-track-params={JSON.stringify({
                platform: "github",
                location: "hero",
              })}
            >
              GitHub
            </a>
            <a
              href={portfolioData.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Gourab Mondal's LinkedIn profile"
              data-track-event="social_click"
              data-track-params={JSON.stringify({
                platform: "linkedin",
                location: "hero",
              })}
            >
              LinkedIn
            </a>
            <a
              href={portfolioData.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-primary"
              aria-label="Download Gourab Mondal's resume PDF"
              data-track-event="resume_click"
              data-track-params={JSON.stringify({ location: "hero" })}
            >
              Resume &darr;
            </a>
          </div>
        </div>

        <div className="hero-card-col" aria-hidden="true">
          <SparkIdCard name={firstName} />
        </div>
      </div>
    </section>
  );
}
