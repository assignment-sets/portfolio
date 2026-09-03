import { portfolioData, type Project } from "@/data/portfolio";
import { getFeaturedProjects } from "@/lib/github";

function generateLlmsTxt(projects: Project[]): string {
  const lines: string[] = [];

  // Title & Bio
  lines.push(`# ${portfolioData.name}`);
  lines.push("");
  lines.push(
    `> ${portfolioData.role} based in ${portfolioData.location}. ${portfolioData.bio}`
  );
  lines.push("");
  lines.push("Status: Available for work.");
  lines.push("");

  // Contact & Profiles
  lines.push("## Contact & Profiles");
  lines.push("");
  lines.push(`- Email: ${portfolioData.email}`);
  lines.push(`- GitHub: ${portfolioData.github}`);
  lines.push(`- LinkedIn: ${portfolioData.linkedin}`);
  lines.push(`- Resume: ${portfolioData.resumeUrl}`);
  lines.push("");

  // Skills
  lines.push("## Skills");
  lines.push("");
  for (const skill of portfolioData.skills) {
    lines.push(`- **${skill.label}**: ${skill.value}`);
  }
  lines.push("");

  // Featured Projects
  lines.push("## Featured Projects");
  lines.push("");
  for (const project of projects) {
    lines.push(`### [${project.title}](${project.githubUrl})`);
    lines.push("");
    lines.push(project.description);
    lines.push("");
    lines.push(`- **Stack**: ${project.tags.join(", ")}`);
    lines.push(`- **Repository**: ${project.githubUrl}`);
    if (project.license) {
      lines.push(`- **License**: ${project.license}`);
    }
    lines.push("");
  }

  // Education
  lines.push("## Education");
  lines.push("");
  for (const edu of portfolioData.education) {
    lines.push(
      `- **${edu.period}**: ${edu.degree} — ${edu.institution} (${edu.grade})`
    );
  }
  lines.push("");

  return lines.join("\n");
}

export async function GET() {
  const projects = await getFeaturedProjects();
  const content = generateLlmsTxt(projects);

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate",
    },
  });
}
