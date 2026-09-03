import { portfolioData, pinnedRepoNames } from "@/data/portfolio";
import type { Project } from "@/data/portfolio";

export interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  topics: string[];
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  pushed_at: string;
  archived: boolean;
  fork: boolean;
  license: {
    key: string;
    name: string;
    spdx_id: string;
    url: string | null;
  } | null;
}

const GITHUB_USERNAME = "assignment-sets";
const GITHUB_API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`;

/**
 * Friendly title overrides for core portfolio repositories.
 */
const TITLE_MAP: Record<string, string> = {
  "annotator-cli": "Annotator CLI",
  secretman: "Secrets Manager",
  "road-surface-damage-monitoring": "Road Damage Monitoring",
  "error-monitoring-agent-n8n": "N8N MCP Self-Healer",
  docagentai: "DocUtil AI",
  "general-medical-rag": "Medical RAG",
};

/**
 * Common technology casing normalizer for GitHub topics.
 */
const TAG_CASING: Record<string, string> = {
  python: "Python",
  fastapi: "FastAPI",
  yolov8: "YOLOv8",
  rdd2020: "RDD2020",
  ultralytics: "Ultralytics",
  n8n: "N8N",
  mcp: "MCP",
  "mcp-client": "MCP Client",
  elasticsearch: "Elasticsearch",
  filebeat: "Filebeat",
  "agentic-workflow": "Agent",
  langchain: "LangChain",
  langgraph: "LangGraph",
  pineconedb: "Pinecone",
  pinecone: "Pinecone",
  "gemini-api": "Gemini API",
  gemini: "Gemini",
  reactjs: "React",
  react: "React",
  redis: "Redis",
  docker: "Docker",
  celery: "Celery",
  "s3-storage": "AWS S3",
  boto3: "Boto3",
  fernet: "Fernet",
  pbkdf2: "PBKDF2",
  "python-dotenv": "python-dotenv",
  setuptools: "Setuptools",
  pathspec: "Pathspec",
  pytest: "Pytest",
  ruff: "Ruff",
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  "spring-boot": "Spring Boot",
  "rag-chatbot": "RAG",
};

function formatTag(tag: string): string {
  const lower = tag.toLowerCase();
  if (TAG_CASING[lower]) return TAG_CASING[lower];
  return tag
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function autoTitleCase(slug: string): string {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseLicense(license: GitHubRepoResponse["license"]): string | null {
  if (!license) return null;
  if (license.spdx_id && license.spdx_id !== "NOASSERTION") {
    return license.spdx_id;
  }
  if (license.name && !license.name.includes("Other")) {
    return license.name;
  }
  return null;
}

function formatPushedDate(dateString?: string): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

/**
 * Transforms a raw GitHub repository API object into a typed portfolio Project.
 */
function transformRepoToProject(
  repo: GitHubRepoResponse,
  fallbackProject?: Project
): Project {
  const lowerName = repo.name.toLowerCase();
  const title = TITLE_MAP[lowerName] || autoTitleCase(repo.name);

  // Use GitHub description, or fallback to static description if empty
  const description =
    repo.description?.trim() ||
    fallbackProject?.description ||
    "No repository description provided.";

  // Synthesize tags: topics + language, with fallback to curated static tags
  let tags: string[] = [];
  if (repo.topics && repo.topics.length > 0) {
    tags = repo.topics.map(formatTag);
    if (
      repo.language &&
      !tags.some((t) => t.toLowerCase() === repo.language?.toLowerCase())
    ) {
      tags.unshift(repo.language);
    }
  } else if (fallbackProject?.tags && fallbackProject.tags.length > 0) {
    tags = fallbackProject.tags;
  } else if (repo.language) {
    tags = [repo.language];
  }

  return {
    title,
    description,
    tags,
    githubUrl: repo.html_url,
    language: repo.language || fallbackProject?.language || null,
    license: parseLicense(repo.license) || fallbackProject?.license || null,
    pushedAt:
      formatPushedDate(repo.pushed_at || repo.updated_at) ||
      fallbackProject?.pushedAt ||
      null,
  };
}

/**
 * Fetches pinned projects from GitHub REST API with Next.js ISR caching (1 hour).
 * Automatically and silently falls back to static portfolio data on network/API failure.
 */
export async function getFeaturedProjects(): Promise<Project[]> {
  try {
    const res = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "gourabmondal-portfolio",
      },
      next: {
        revalidate: 3600, // Revalidate in background every 1 hour (ISR)
        tags: ["github-repos"],
      },
    });

    if (!res.ok) {
      console.warn(
        `[GitHub API] Returned HTTP ${res.status}, using static fallback data.`
      );
      return portfolioData.projects;
    }

    const repos: GitHubRepoResponse[] = await res.json();
    if (!Array.isArray(repos) || repos.length === 0) {
      return portfolioData.projects;
    }

    const repoMap = new Map<string, GitHubRepoResponse>();
    for (const repo of repos) {
      repoMap.set(repo.name.toLowerCase(), repo);
    }

    const dynamicProjects: Project[] = [];

    for (const pinnedName of pinnedRepoNames) {
      const lowerPinned = pinnedName.toLowerCase();
      const repo = repoMap.get(lowerPinned);

      const fallback = portfolioData.projects.find((p) =>
        p.githubUrl.toLowerCase().endsWith(`/${lowerPinned}`)
      );

      if (repo) {
        dynamicProjects.push(transformRepoToProject(repo, fallback));
      } else if (fallback) {
        dynamicProjects.push(fallback);
      }
    }

    return dynamicProjects.length > 0 ? dynamicProjects : portfolioData.projects;
  } catch (error) {
    console.error(
      "[GitHub API] Fetch failed, falling back to static portfolio data:",
      error
    );
    return portfolioData.projects;
  }
}
