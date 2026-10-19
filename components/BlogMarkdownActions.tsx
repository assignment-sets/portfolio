"use client";

import { useState } from "react";
import { Copy, Download, Check } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface BlogMarkdownActionsProps {
  title: string;
  slug: string;
  description?: string;
  publishedDate?: string;
  markdown: string;
  variant?: "header" | "footer";
}

export default function BlogMarkdownActions({
  title,
  slug,
  description,
  publishedDate,
  markdown,
  variant = "header",
}: BlogMarkdownActionsProps) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Builds a clean, portable markdown document with frontmatter metadata
  const getFullMarkdown = () => {
    // If the content already has YAML frontmatter, return as-is
    if (markdown.trim().startsWith("---")) {
      return markdown;
    }

    const frontmatter = [
      "---",
      `title: ${JSON.stringify(title)}`,
      description ? `description: ${JSON.stringify(description)}` : null,
      publishedDate ? `date: ${JSON.stringify(publishedDate)}` : null,
      `author: "Gourab Mondal"`,
      `url: "https://gourabmondal.vercel.app/blog/${slug}"`,
      "---",
      "",
      markdown,
    ]
      .filter((line) => line !== null)
      .join("\n");

    return frontmatter;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getFullMarkdown());
      setCopied(true);
      trackEvent("blog_copy_markdown", { slug, post_title: title, location: variant });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy markdown to clipboard:", err);
    }
  };

  const handleDownload = () => {
    try {
      const content = getFullMarkdown();
      const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloaded(true);
      trackEvent("blog_download_markdown", { slug, post_title: title, location: variant });
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.error("Failed to download markdown file:", err);
    }
  };

  const isFooter = variant === "footer";
  const btnClass = isFooter ? "blog-action-footer-btn" : "blog-action-btn";
  const iconSize = isFooter ? 15 : 13;

  return (
    <div className={`blog-markdown-actions blog-markdown-actions-${variant}`}>
      <button
        type="button"
        className={`${btnClass} ${copied ? "active-copied" : ""}`}
        onClick={handleCopy}
        title={copied ? "Copied!" : "Copy raw Markdown"}
        aria-label="Copy raw Markdown"
      >
        {copied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
        {isFooter && <span>{copied ? "Copied!" : "Copy MD"}</span>}
      </button>

      <button
        type="button"
        className={`${btnClass} ${downloaded ? "active-downloaded" : ""}`}
        onClick={handleDownload}
        title={downloaded ? "Downloaded!" : "Download as .md file"}
        aria-label="Download article as Markdown file"
      >
        {downloaded ? <Check size={iconSize} /> : <Download size={iconSize} />}
        {isFooter && <span>{downloaded ? "Downloaded!" : "Download .md"}</span>}
      </button>
    </div>
  );
}
