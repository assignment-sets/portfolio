"use client";

import { Scale } from "lucide-react";
import { portfolioData } from "@/data/portfolio";
import type { Project } from "@/data/portfolio";
import { trackEvent } from "@/lib/analytics";

interface ProjectsProps {
  projects?: Project[];
}

export default function Projects({
  projects = portfolioData.projects,
}: ProjectsProps) {
  const displayProjects =
    projects && projects.length > 0 ? projects : portfolioData.projects;

  return (
    <section id="projects">
      <h2>Featured Projects</h2>
      <div className="projects-grid">
        {displayProjects.map((project) => (
          <div className="project-card" key={project.title}>
            {/* Header: Title + License Badge */}
            <div className="project-card-header">
              <h3>{project.title}</h3>
              {project.license && (
                <span
                  className="project-license-badge"
                  title={`Open source license: ${project.license}`}
                >
                  <Scale size={11} />
                  <span>{project.license}</span>
                </span>
              )}
            </div>

            {/* Description */}
            <p>{project.description}</p>

            {/* Tags area */}
            <div className="project-tags">
              {project.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            {/* Card Footer: GitHub link + Last Updated */}
            <div className="project-card-footer">
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${project.title} source code on GitHub`}
                onClick={() =>
                  trackEvent("project_click", {
                    project_name: project.title,
                    url: project.githubUrl,
                  })
                }
              >
                GitHub &rarr;
              </a>
              {project.pushedAt && (
                <span
                  className="project-updated-label"
                  title={`Last active: ${project.pushedAt}`}
                >
                  Updated {project.pushedAt}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: "20px", fontSize: "0.85rem" }}>
        <a
          href={`${portfolioData.github}?tab=repositories`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View all public repositories on GitHub"
          onClick={() =>
            trackEvent("project_click", {
              project_name: "all_repositories",
              url: `${portfolioData.github}?tab=repositories`,
            })
          }
        >
          see more on GitHub &rarr;
        </a>
      </p>
    </section>
  );
}
