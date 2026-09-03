import { portfolioData } from "@/data/portfolio";

export default function Hero() {
  return (
    <section id="hero">
      <div className="avail-badge">&#x25CF;&nbsp; Available for work</div>
      <h1>{portfolioData.name}</h1>
      <p className="hero-role">{portfolioData.role}</p>
      <p className="hero-location">{portfolioData.location}</p>
      <p className="hero-bio">{portfolioData.bio}</p>
      <div className="hero-links">
        <a href={`mailto:${portfolioData.email}`}>Email</a>
        <a href={portfolioData.github} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <a href={portfolioData.linkedin} target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
        <a href={portfolioData.resumeUrl} target="_blank" rel="noopener noreferrer">
          Resume &darr;
        </a>
      </div>
    </section>
  );
}
