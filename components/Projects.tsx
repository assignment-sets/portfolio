import { portfolioData } from "@/data/portfolio";

export default function Projects() {
  return (
    <section id="projects">
      <h2>Featured Projects</h2>
      <div className="projects-grid">
        {portfolioData.projects.map((project) => (
          <div className="project-card" key={project.title}>
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            <div className="project-tags">
              {project.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub &rarr;
            </a>
          </div>
        ))}
      </div>
      <p style={{ marginTop: "20px", fontSize: "0.85rem" }}>
        <a
          href={`${portfolioData.github}?tab=repositories`}
          target="_blank"
          rel="noopener noreferrer"
        >
          see more on GitHub &rarr;
        </a>
      </p>
    </section>
  );
}
