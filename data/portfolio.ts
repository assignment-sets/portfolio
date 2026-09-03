export interface SkillCategory {
  label: string;
  value: string;
}

export interface Project {
  title: string;
  description: string;
  tags: string[];
  githubUrl: string;
}

export interface EducationItem {
  period: string;
  degree: string;
  institution: string;
  grade: string;
}

export interface PortfolioData {
  name: string;
  role: string;
  location: string;
  bio: string;
  email: string;
  github: string;
  linkedin: string;
  resumeUrl: string;
  skills: SkillCategory[];
  projects: Project[];
  education: EducationItem[];
}

export const portfolioData: PortfolioData = {
  name: "Gourab Mondal",
  role: "Full Stack Developer",
  location: "Kolkata, India",
  bio: "B.Tech CS student. Interested mainly in backend and GenAI applications. Currently trying to get better at software stuff.",
  email: "gourab.m099@gmail.com",
  github: "https://github.com/assignment-sets",
  linkedin: "https://linkedin.com/in/gourab-mondal-gm2004",
  resumeUrl: "https://my-resumes-788125169240-ap-south-1-an.s3.ap-south-1.amazonaws.com/resume.pdf",

  skills: [
    { label: "Languages", value: "Python, Java, JavaScript" },
    { label: "Backend", value: "FastAPI, Spring Boot, Node.js" },
    { label: "Frontend", value: "React.js" },
    { label: "GenAI", value: "Langchain, LangGraph, RAG, MCP" },
    { label: "Databases", value: "PostgreSQL, MongoDB, Redis, Pinecone" },
    { label: "Infra", value: "Docker, Kubernetes, AWS, GCP" },
    { label: "Tooling", value: "Git, Bazel, Claude Code, Cursor" },
  ],

  projects: [
    {
      title: "Annotator CLI",
      description:
        "Python package CLI that prepends relative file paths as comments to project files for easier AI debugging and context sharing during manual copy pasting.",
      tags: ["Python", "Setuptools", "Pathspec", "Pytest", "Ruff"],
      githubUrl: "https://github.com/assignment-sets/annotator-cli",
    },
    {
      title: "Secrets Manager",
      description:
        "CLI tool for securely storing, fetching, and deleting encrypted secret env files in external storage, using Fernet symmetric encryption with key derivation from a master password.",
      tags: ["Python", "AWS S3", "Boto3", "Fernet", "PBKDF2", "python-dotenv"],
      githubUrl: "https://github.com/assignment-sets/secretMan",
    },
    {
      title: "Road Damage Monitoring",
      description:
        "YOLOv8m-driven backend that detects and classifies road surface degradation, calculating a deterministic priority score via a custom Road Damage Index to streamline high-severity municipal alerts.",
      tags: ["Python", "FastAPI", "Ultralytics", "YOLOv8", "RDD2020", "Google Maps API"],
      githubUrl: "https://github.com/assignment-sets/road-surface-damage-monitoring",
    },
    {
      title: "n8n MCP Self-Healer",
      description:
        "Agentic workflow using n8n and Elasticsearch that reasons over logs and stack traces to create GitHub issues, notifies teams via Slack blocks, and tries to self-heal the codebase using a subagent.",
      tags: ["Elasticsearch", "MCP", "Filebeat", "n8n", "Agent"],
      githubUrl: "https://github.com/assignment-sets/error-monitoring-agent-n8n",
    },
    {
      title: "DocUtil AI",
      description:
        "AI platform that automates prompt-driven document processing using an agent-based workflow.",
      tags: ["Python", "LangGraph", "React", "Gemini", "FastAPI", "Docker", "MCP", "Redis"],
      githubUrl: "https://github.com/assignment-sets/docAgentAI",
    },
    {
      title: "Medical RAG",
      description:
        "Verified medical info retrieval using Langchain, Pinecone vector DB, and domain-specific LLM streams.",
      tags: ["Python", "Pinecone", "Langchain", "Gemini API", "FastAPI", "Redis", "Celery"],
      githubUrl: "https://github.com/assignment-sets/general-medical-rag",
    },
  ],

  education: [
    {
      period: "2022 – 2026",
      degree: "B.Tech, Computer Science",
      institution: "University of Engineering & Management",
      grade: "CGPA 8.7 (ongoing)",
    },
    {
      period: "2020 – 2022",
      degree: "Higher Secondary (Science)",
      institution: "CCHV School",
      grade: "WBCHSE — 79.40%",
    },
    {
      period: "2019 – 2020",
      degree: "Secondary",
      institution: "CCHV School",
      grade: "WBBSE — 77.43%",
    },
  ],
};
