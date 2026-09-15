"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Edit3,
  Lock,
  RefreshCw,
  ChevronRight,
  Plus,
  Trash2,
  Search,
  X,
  Globe,
  ExternalLink,
  BookOpen,
  Mail,
} from "lucide-react";

interface BlogItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  tags: string[];
  readingTimeMinutes: number;
  coverImage: string;
  content: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface BlogStudioClientProps {
  initialBlogs: BlogItem[];
  initialKey?: string;
}

const STARTER_BLOG = `# Designing Resilient Distributed Workflows

When building autonomous backend systems, distributed workflows often fail at boundary layers rather than core business logic.

## The Idempotency Imperative

Every message handler and webhook consumer must be safe to execute multiple times:

\`\`\`typescript
async function processEvent(event: WebhookEvent) {
  const existing = await db.events.findOne({ id: event.id });
  if (existing?.status === "completed") {
    return { skipped: true };
  }
  // Execute transactional work
}
\`\`\`

## Practical Takeaways
1. **Never rely on naive sleep timers** for synchronization.
2. **Use atomic set operations** (\`$addToSet\` in MongoDB) to track processed entities.
3. **Graceful degradation**: Return structured 200 OK statuses for expected domain edge-cases rather than 500 crashes.
`;

export default function BlogStudioClient({
  initialBlogs,
  initialKey,
}: BlogStudioClientProps) {
  const router = useRouter();

  const [currentBlogId, setCurrentBlogId] = useState<string | null>(null);
  const [title, setTitle] = useState("Designing Resilient Distributed Workflows");
  const [slug, setSlug] = useState("designing-resilient-distributed-workflows");
  const [description, setDescription] = useState("Learnings and architectural patterns from building resilient distributed agents and microservices.");
  const [tagsInput, setTagsInput] = useState("Distributed Systems, Architecture, Backend");
  const [markdown, setMarkdown] = useState(STARTER_BLOG);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [blogs, setBlogs] = useState<BlogItem[]>(initialBlogs);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info" | "";
    message: string;
  }>({ type: "", message: "" });

  const [isPending, startTransition] = useTransition();

  const currentBlog = blogs.find((b) => b.id === currentBlogId);
  const isPublished = status === "published";

  // Auto-generate slug when title changes (if not explicitly editing an existing slug)
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!currentBlogId) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "");
      setSlug(generated);
    }
  };

  // On mount with initialKey, establish persistent session cookie
  useEffect(() => {
    if (initialKey) {
      fetch("/api/newsletter/studio/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: initialKey }),
      }).catch(() => {});
    }
  }, [initialKey]);

  // Load preview
  const loadPreview = async () => {
    setIsPreviewLoading(true);
    try {
      const res = await fetch("/api/blog/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "render_preview",
          markdown,
          secret: initialKey,
        }),
      });
      const data = await res.json();
      if (data.html) {
        setPreviewHtml(data.html);
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to render preview." });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSave = (publish: boolean) => {
    if (!title.trim() || !markdown.trim()) {
      setFeedback({ type: "error", message: "Title and content cannot be empty." });
      return;
    }

    startTransition(async () => {
      setFeedback({
        type: "info",
        message: publish ? "Publishing blog post..." : "Saving draft...",
      });

      const tagsArray = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      try {
        const res = await fetch("/api/blog/studio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: publish ? "publish" : "save_draft",
            blogId: currentBlogId,
            title,
            slug: slug.trim(),
            description: description.trim(),
            markdown,
            tags: tagsArray,
            status: publish ? "published" : "draft",
            secret: initialKey,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setStatus(publish ? "published" : "draft");
          setFeedback({
            type: "success",
            message: publish
              ? "Blog post published to /blog!"
              : "Draft saved to database!",
          });

          if (data.blogId) {
            setCurrentBlogId(data.blogId);
            if (data.slug) setSlug(data.slug);

            const updatedItem: BlogItem = {
              id: data.blogId,
              title,
              slug: data.slug || slug,
              description,
              status: publish ? "published" : "draft",
              tags: tagsArray,
              readingTimeMinutes: Math.max(1, Math.ceil(markdown.split(/\s+/).length / 200)),
              coverImage: "",
              content: markdown,
              publishedAt: publish ? new Date().toISOString() : currentBlog?.publishedAt,
              createdAt: currentBlog?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            setBlogs((prev) => {
              const idx = prev.findIndex((b) => b.id === data.blogId);
              if (idx > -1) {
                const next = [...prev];
                next[idx] = updatedItem;
                return next;
              }
              return [updatedItem, ...prev];
            });
          }
        } else {
          setFeedback({
            type: "error",
            message: data.error || "Failed to save blog post.",
          });
        }
      } catch {
        setFeedback({ type: "error", message: "Network error saving blog post." });
      }
    });
  };

  const handleDelete = (targetId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();

    if (!window.confirm("Permanently delete this blog post? This cannot be undone.")) {
      return;
    }

    startTransition(async () => {
      setFeedback({ type: "info", message: "Deleting blog post..." });
      try {
        const res = await fetch("/api/blog/studio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            blogId: targetId,
            secret: initialKey,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setFeedback({ type: "success", message: "Blog post deleted permanently." });
          setBlogs((prev) => prev.filter((b) => b.id !== targetId));
          if (currentBlogId === targetId) {
            handleNewBlog();
          }
        } else {
          setFeedback({ type: "error", message: data.error || "Failed to delete blog post." });
        }
      } catch {
        setFeedback({ type: "error", message: "Network error deleting blog post." });
      }
    });
  };

  const handleNewBlog = () => {
    setCurrentBlogId(null);
    setTitle("");
    setSlug("");
    setDescription("");
    setTagsInput("");
    setMarkdown(STARTER_BLOG);
    setStatus("draft");
    setFeedback({
      type: "info",
      message: "Started a fresh blog post draft.",
    });
  };

  const handleLoadBlog = (b: BlogItem) => {
    setCurrentBlogId(b.id);
    setTitle(b.title);
    setSlug(b.slug);
    setDescription(b.description || "");
    setTagsInput((b.tags || []).join(", "));
    setMarkdown(b.content || "");
    setStatus(b.status === "published" ? "published" : "draft");
    setFeedback({
      type: "info",
      message: `Loaded "${b.title}" into editor.`,
    });
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    setIsSearching(true);
    try {
      const res = await fetch("/api/blog/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search",
          query: q,
          secret: initialKey,
        }),
      });
      const data = await res.json();
      if (res.ok && data.blogs) {
        setBlogs(data.blogs);
        setIsSearchActive(Boolean(q));
      } else {
        setFeedback({ type: "error", message: data.error || "Search failed." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error searching blog posts." });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = async () => {
    setSearchQuery("");
    setIsSearching(true);
    try {
      const res = await fetch("/api/blog/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search",
          query: "",
          secret: initialKey,
        }),
      });
      const data = await res.json();
      if (res.ok && data.blogs) {
        setBlogs(data.blogs);
        setIsSearchActive(false);
      }
    } catch {
      setBlogs(initialBlogs);
      setIsSearchActive(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLockStudio = async () => {
    await fetch("/api/newsletter/studio/session", { method: "DELETE" }).catch(() => {});
    router.push("/");
    router.refresh();
  };

  return (
    <div className="studio-container">
      {/* Top Bar */}
      <header className="studio-header">
        <div className="studio-brand">
          <Link href="/" className="studio-back-link">
            &larr; Portfolio
          </Link>
          <span className="studio-sep">/</span>
          <h1 className="studio-title">Blog Studio</h1>
        </div>

        <div className="studio-header-meta">
          {/* Switch to Newsletter Studio */}
          <Link
            href="/studio"
            className="studio-metric"
            style={{ textDecoration: "none" }}
            title="Switch to Newsletter Studio"
          >
            <Mail size={13} />
            <span>Newsletter Studio</span>
          </Link>

          <button
            type="button"
            onClick={handleLockStudio}
            className="studio-lock-btn"
            title="Lock studio & clear session"
          >
            <Lock size={12} />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="studio-workspace">
        {/* Left Column: Editor & Controls */}
        <div className="studio-main-col">
          {/* Metadata Card */}
          <div className="studio-meta-card studio-card">
            <div className="studio-field">
              <label className="studio-label">Post Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Building Resilient Distributed Workflows"
                className="studio-input"
              />
            </div>

            <div className="studio-field">
              <label className="studio-label">URL Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. building-resilient-distributed-workflows"
                className="studio-input"
              />
            </div>

            <div className="studio-field" style={{ gridColumn: "1 / -1" }}>
              <label className="studio-label">Excerpt / SEO Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary for search engines and social cards..."
                className="studio-input"
              />
            </div>

            <div className="studio-field" style={{ gridColumn: "1 / -1" }}>
              <label className="studio-label">Tags (comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Backend, Architecture, GenAI, Next.js"
                className="studio-input"
              />
            </div>
          </div>

          {/* Editor / Live Preview Box */}
          <div className="studio-editor-box studio-card">
            <div className="studio-tabs-row">
              <div className="studio-tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab("write")}
                  className={`studio-tab ${activeTab === "write" ? "active" : ""}`}
                >
                  <Edit3 size={13} />
                  <span>Write (Markdown)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("preview");
                    loadPreview();
                  }}
                  className={`studio-tab ${activeTab === "preview" ? "active" : ""}`}
                >
                  <Eye size={13} />
                  <span>Live Preview</span>
                </button>
              </div>

              {activeTab === "preview" && (
                <button
                  type="button"
                  onClick={loadPreview}
                  disabled={isPreviewLoading}
                  className="studio-refresh-preview-btn"
                  title="Re-compile preview"
                >
                  <RefreshCw size={12} className={isPreviewLoading ? "spinning" : ""} />
                  <span>Refresh</span>
                </button>
              )}
            </div>

            {activeTab === "write" ? (
              <div className="studio-write-pane">
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="Write your article in Markdown..."
                  rows={20}
                  className="studio-textarea"
                />
                <div className="studio-textarea-footer">
                  <span>GFM, code blocks, tables, lists supported</span>
                  <span>{markdown.length} chars &middot; ~{Math.max(1, Math.ceil(markdown.split(/\s+/).filter(Boolean).length / 200))} min read</span>
                </div>
              </div>
            ) : (
              <div className="studio-preview-pane">
                {isPreviewLoading ? (
                  <div className="studio-preview-loading">Rendering article preview...</div>
                ) : (
                  <div
                    className="blog-post-body"
                    style={{ padding: "32px 28px", maxWidth: "760px", margin: "0 auto" }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="studio-actions-card studio-card">
            <div className="studio-actions-row">
              <div className="studio-action-info">
                {currentBlog ? (
                  <span className="studio-current-context">
                    Editing <strong>{currentBlog.title}</strong> &middot;{" "}
                    <span className={`studio-status-pill status-${status}`}>{status}</span>
                  </span>
                ) : (
                  <span className="studio-current-context">
                    Editing <strong>New Article Draft</strong>
                  </span>
                )}
              </div>

              <div className="studio-action-buttons">
                {isPublished && slug && (
                  <Link
                    href={`/blog/${slug}`}
                    target="_blank"
                    className="studio-btn studio-btn-secondary"
                    title="View live published article"
                  >
                    <ExternalLink size={14} />
                    <span>View Public</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={isPending || !markdown.trim()}
                  className="studio-btn studio-btn-secondary"
                  title="Save as draft (hidden from public)"
                >
                  <Save size={14} />
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isPending || !markdown.trim()}
                  className="studio-btn studio-btn-primary"
                  title="Publish live to /blog/[slug]"
                >
                  <Globe size={14} />
                  <span>{isPublished ? "Update Live" : "Publish Live"}</span>
                </button>

                {currentBlogId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(currentBlogId)}
                    disabled={isPending}
                    className="studio-btn studio-btn-delete"
                    title="Permanently delete this blog post"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>

            {feedback.message && (
              <div
                className={`studio-feedback feedback-${feedback.type}`}
                role="status"
                aria-live="polite"
              >
                {feedback.type === "success" && <CheckCircle2 size={15} />}
                {feedback.type === "error" && <AlertCircle size={15} />}
                {feedback.type === "info" && <Clock size={15} />}
                <span>{feedback.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Recent Articles & Search */}
        <aside className="studio-sidebar-col">
          <div className="studio-card">
            <div className="studio-sidebar-header">
              <h2 className="studio-sidebar-title">Recent Articles</h2>
              <span className="studio-subtext">
                {isSearchActive ? `${blogs.length} found` : `${blogs.length} records`}
              </span>
            </div>

            <form onSubmit={handleSearch} className="studio-search-form">
              <div className="studio-search-row">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles..."
                  className="studio-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="studio-search-clear"
                    title="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSearching}
                  className="studio-search-btn"
                  title="Search database"
                >
                  <Search size={13} />
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={handleNewBlog}
              className="studio-new-edition-btn"
              title="Start drafting a new article"
            >
              <Plus size={13} />
              <span>New Article</span>
            </button>

            <div className="studio-issues-list">
              {blogs.length === 0 ? (
                <p className="studio-empty-text">No articles found.</p>
              ) : (
                blogs.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => handleLoadBlog(b)}
                    className={`studio-issue-item ${currentBlogId === b.id ? "selected" : ""}`}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="studio-issue-main">
                      <h4 className="studio-issue-title">{b.title}</h4>
                      <p className="studio-issue-date">
                        {new Date(b.updatedAt || b.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })} &middot; ~{b.readingTimeMinutes || 1}m
                      </p>
                    </div>

                    <div className="studio-issue-right">
                      <span className={`studio-status-pill status-${b.status}`}>
                        {b.status === "published" ? "Live" : "Draft"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(b.id, e)}
                        className="studio-issue-delete-btn"
                        title="Delete article"
                      >
                        <Trash2 size={12} />
                      </button>
                      <ChevronRight size={13} className="studio-chevron" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
