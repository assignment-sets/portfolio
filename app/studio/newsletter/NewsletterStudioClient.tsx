"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Send,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Edit3,
  Lock,
  RefreshCw,
  ChevronRight,
  CalendarX,
  Plus,
  Trash2,
  Search,
  X,
  BookOpen,
  ArrowLeft,
} from "lucide-react";

interface IssueItem {
  id: string;
  title: string;
  subject: string;
  status: string;
  scheduledFor?: string;
  sentAt?: string;
  stats?: { success: number; failed: number };
  deliveredCount: number;
  createdAt: string;
  markdownText?: string;
}

interface NewsletterStudioClientProps {
  activeSubscribers: number;
  initialIssues: IssueItem[];
  initialKey?: string;
  authorEmail: string;
}

const STARTER_TEMPLATE = `Hey everyone,

Welcome to this week's edition. Today I'm writing about backend architecture, latency optimization, and practical learnings from recent GenAI experiments.

## The Problem with Naive Polling
When building agentic workflows, long-running processes often tempt us into naive polling loops. Here is why reactive wakeups are vastly superior:

\`\`\`typescript
// Event-driven reactive wakeup
eventBus.on("task:completed", async (result) => {
  await dispatchNextStep(result);
});
\`\`\`

## Key Takeaways
- **Atomicity**: Always record state before or during chunk delivery.
- **Backpressure**: Respect provider rate limits with intentional pauses.
- **Fail Gracefully**: Offline and transient network hiccups should never break the client.

What have you been building this week? Hit reply and let me know—I read every email.
`;

export default function NewsletterStudioClient({
  activeSubscribers,
  initialIssues,
  initialKey,
  authorEmail,
}: NewsletterStudioClientProps) {
  const router = useRouter();
  const [title, setTitle] = useState("Issue #1: Building Reliable Distributed Workflows");
  const [subject, setSubject] = useState("Issue #1: Building Reliable Distributed Workflows");
  const [markdown, setMarkdown] = useState(STARTER_TEMPLATE);
  const [currentIssueId, setCurrentIssueId] = useState<string | null>(null);
  const [issues, setIssues] = useState<IssueItem[]>(initialIssues);

  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info" | "";
    message: string;
  }>({ type: "", message: "" });

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const [isPending, startTransition] = useTransition();

  const currentIssue = issues.find((i) => i.id === currentIssueId);
  const isScheduled = currentIssue?.status === "scheduled";
  const isSent = currentIssue?.status === "sent";

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isTogglingAvail, setIsTogglingAvail] = useState(false);

  // On mount with initialKey, establish persistent session cookie & fetch availability
  useEffect(() => {
    if (initialKey) {
      fetch("/api/newsletter/studio/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: initialKey }),
      }).catch(() => {});
    }

    fetch("/api/availability", {
      headers: initialKey ? { Authorization: `Bearer ${initialKey}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && typeof data.available === "boolean") {
          setIsAvailable(data.available);
        }
      })
      .catch(() => {});
  }, [initialKey]);

  const handleToggleAvailability = async () => {
    setIsTogglingAvail(true);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(initialKey ? { Authorization: `Bearer ${initialKey}` } : {}),
        },
        body: JSON.stringify({ secret: initialKey }),
      });
      const data = await res.json();
      if (data.success && typeof data.available === "boolean") {
        setIsAvailable(data.available);
        setFeedback({
          type: "success",
          message: data.message || "Availability status updated.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to toggle availability status.",
      });
    } finally {
      setIsTogglingAvail(false);
    }
  };

  // Update preview when switching to preview tab or on demand
  const loadPreview = async () => {
    setIsPreviewLoading(true);
    try {
      const res = await fetch("/api/newsletter/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "render_preview",
          title,
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

  const handleSendTest = () => {
    startTransition(async () => {
      setFeedback({ type: "info", message: `Sending test email to ${authorEmail}...` });
      try {
        const res = await fetch("/api/newsletter/studio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "test_send",
            title,
            subject,
            markdown,
            authorEmail,
            secret: initialKey,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setFeedback({
            type: "success",
            message: `Test email sent to ${authorEmail}! Check your inbox.`,
          });
        } else {
          setFeedback({
            type: "error",
            message: data.error || "Failed to send test email.",
          });
        }
      } catch {
        setFeedback({
          type: "error",
          message: "Network error sending test email.",
        });
      }
    });
  };

  const handleSave = (isSchedule: boolean) => {
    startTransition(async () => {
      setFeedback({
        type: "info",
        message: isSchedule ? "Scheduling newsletter..." : "Saving draft...",
      });
      try {
        const res = await fetch("/api/newsletter/studio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: isSchedule ? "schedule" : "save_draft",
            newsletterId: currentIssueId,
            title,
            subject,
            markdown,
            secret: initialKey,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setFeedback({
            type: "success",
            message: isSchedule
              ? "Newsletter scheduled! Cron will dispatch it automatically."
              : "Draft saved to database!",
          });
          if (data.newsletterId) {
            setCurrentIssueId(data.newsletterId);
            setIssues((prev) => {
              const existingIdx = prev.findIndex((i) => i.id === data.newsletterId);
              const updatedItem: IssueItem = {
                id: data.newsletterId,
                title,
                subject,
                status: isSchedule ? "scheduled" : "draft",
                createdAt: new Date().toISOString(),
                deliveredCount: 0,
                markdownText: markdown,
                scheduledFor: isSchedule ? new Date().toISOString() : undefined,
              };
              if (existingIdx > -1) {
                const next = [...prev];
                next[existingIdx] = updatedItem;
                return next;
              }
              return [updatedItem, ...prev];
            });
          }
        } else {
          setFeedback({
            type: "error",
            message: data.error || "Operation failed.",
          });
        }
      } catch {
        setFeedback({ type: "error", message: "Network error." });
      }
    });
  };

  const handleUnschedule = () => {
    if (!currentIssueId) return;
    startTransition(async () => {
      setFeedback({
        type: "info",
        message: "Unscheduling newsletter...",
      });
      try {
        const res = await fetch("/api/newsletter/studio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "unschedule",
            newsletterId: currentIssueId,
            title,
            subject,
            markdown,
            secret: initialKey,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setFeedback({
            type: "success",
            message: "Newsletter unscheduled! Status reverted to draft.",
          });
          setIssues((prev) =>
            prev.map((item) =>
              item.id === currentIssueId
                ? {
                    ...item,
                    status: "draft",
                    title,
                    subject,
                    markdownText: markdown,
                    scheduledFor: undefined,
                  }
                : item
            )
          );
        } else {
          setFeedback({
            type: "error",
            message: data.error || "Failed to unschedule newsletter.",
          });
        }
      } catch {
        setFeedback({ type: "error", message: "Network error unscheduling newsletter." });
      }
    });
  };

  const handleDeleteIssue = (targetId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();

    if (!window.confirm("Permanently delete this newsletter edition? This cannot be undone.")) {
      return;
    }

    startTransition(async () => {
      setFeedback({ type: "info", message: "Deleting edition..." });
      try {
        const res = await fetch("/api/newsletter/studio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            newsletterId: targetId,
            secret: initialKey,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setFeedback({ type: "success", message: "Edition deleted permanently." });
          setIssues((prev) => prev.filter((i) => i.id !== targetId));
          if (currentIssueId === targetId) {
            handleNewEdition();
          }
        } else {
          setFeedback({ type: "error", message: data.error || "Failed to delete edition." });
        }
      } catch {
        setFeedback({ type: "error", message: "Network error deleting edition." });
      }
    });
  };

  const handleNewEdition = () => {
    setCurrentIssueId(null);
    setTitle("");
    setSubject("");
    setMarkdown(STARTER_TEMPLATE);
    setFeedback({
      type: "info",
      message: "Started a fresh edition draft.",
    });
  };

  const handleLockStudio = async () => {
    await fetch("/api/newsletter/studio/session", { method: "DELETE" }).catch(() => {});
    router.push("/");
    router.refresh();
  };

  const handleLoadIssue = (issue: IssueItem) => {
    setTitle(issue.title);
    setSubject(issue.subject);
    if (issue.markdownText) {
      setMarkdown(issue.markdownText);
    }
    setCurrentIssueId(issue.id);
    setFeedback({
      type: "info",
      message: `Loaded "${issue.title}" into editor.`,
    });
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    setIsSearching(true);
    try {
      const res = await fetch("/api/newsletter/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search",
          query,
          secret: initialKey,
        }),
      });
      const data = await res.json();
      if (res.ok && data.issues) {
        setIssues(data.issues);
        setIsSearchActive(Boolean(query));
      } else {
        setFeedback({ type: "error", message: data.error || "Search failed." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error searching editions." });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = async () => {
    setSearchQuery("");
    setIsSearching(true);
    try {
      const res = await fetch("/api/newsletter/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search",
          query: "",
          secret: initialKey,
        }),
      });
      const data = await res.json();
      if (res.ok && data.issues) {
        setIssues(data.issues);
        setIsSearchActive(false);
      }
    } catch {
      // Fallback to initial
      setIssues(initialIssues);
      setIsSearchActive(false);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="studio-container">
      {/* Top Bar */}
      <header className="studio-header">
        <div className="studio-header-top">
          <div className="studio-brand">
            <Link href="/studio" className="studio-back-btn" title="Back to Studio">
              <ArrowLeft size={16} />
            </Link>
            <h1 className="studio-title">Newsletter</h1>
          </div>

          <button
            type="button"
            onClick={handleLockStudio}
            className="studio-lock-btn studio-lock-btn-mobile"
            title="Clear session and lock studio"
          >
            <Lock size={12} />
            <span>Lock</span>
          </button>
        </div>

        <div className="studio-header-meta">
          <button
            type="button"
            onClick={handleToggleAvailability}
            disabled={isTogglingAvail || isAvailable === null}
            className={`studio-avail-toggle-btn ${isAvailable ? "on" : "off"}`}
            title="Toggle 'Available for work' badge on homepage"
          >
            <span
              className={`avail-indicator-dot ${
                isAvailable ? "dot-on" : "dot-off"
              }`}
            />
            <span>Work: {isAvailable ? "Available" : "Hidden"}</span>
          </button>

          {/* Switch to Blog Studio */}
          <Link
            href="/studio/blog"
            className="studio-metric"
            style={{ textDecoration: "none" }}
            title="Switch to Blog Studio"
          >
            <BookOpen size={13} />
            <span>Blog Studio</span>
          </Link>

          <button
            type="button"
            onClick={handleLockStudio}
            className="studio-lock-btn studio-lock-btn-desktop"
            title="Clear session and lock studio"
          >
            <Lock size={12} />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="studio-workspace">
        {/* Left/Main Column: Editor & Preview */}
        <div className="studio-main-col">
          {/* Metadata Bar */}
          <div className="studio-card studio-meta-card">
            <div className="studio-field">
              <label htmlFor="newsletter-title-input" className="studio-label">Campaign Title</label>
              <input
                id="newsletter-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Issue #1: System Reliability"
                className="studio-input"
              />
            </div>

            <div className="studio-field">
              <label htmlFor="newsletter-subject-input" className="studio-label">Email Subject Line</label>
              <input
                id="newsletter-subject-input"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Issue #1: System Reliability"
                className="studio-input"
              />
            </div>
          </div>

          {/* Editor Header & View Toggles */}
          <div className="studio-editor-box studio-card">
            <div className="studio-tabs-row">
              <div className="studio-tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab("write")}
                  className={`studio-tab ${activeTab === "write" ? "active" : ""}`}
                >
                  <Edit3 size={13} />
                  <span>Write Markdown</span>
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
                  <span>Live Email Preview</span>
                </button>
              </div>

              {activeTab === "preview" && (
                <button
                  type="button"
                  onClick={loadPreview}
                  disabled={isPreviewLoading}
                  className="studio-refresh-preview-btn"
                  title="Refresh Email Preview"
                >
                  <RefreshCw size={12} className={isPreviewLoading ? "spinning" : ""} />
                  <span>Refresh</span>
                </button>
              )}
            </div>

            {/* View Pane */}
            {activeTab === "write" ? (
              <div className="studio-write-pane">
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="Write your newsletter content in Markdown..."
                  rows={20}
                  className="studio-textarea"
                />
                <div className="studio-textarea-footer">
                  <span>Markdown supported (GFM, tables, code blocks, lists)</span>
                  <span>{markdown.length} characters</span>
                </div>
              </div>
            ) : (
              <div className="studio-preview-pane">
                {isPreviewLoading ? (
                  <div className="studio-preview-loading">Rendering email HTML preview...</div>
                ) : (
                  <iframe
                    srcDoc={previewHtml}
                    title="Email Preview"
                    className="studio-preview-iframe"
                    sandbox="allow-same-origin"
                  />
                )}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="studio-actions-card studio-card">
            <div className="studio-actions-row">
              <div className="studio-action-info">
                {currentIssue ? (
                  <span className="studio-current-context">
                    Editing <strong>{currentIssue.title}</strong>
                  </span>
                ) : (
                  <span className="studio-current-context">
                    Editing <strong>New Edition Draft</strong>
                  </span>
                )}
              </div>

              <div className="studio-action-buttons">
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={isPending || !markdown.trim()}
                  className="studio-btn studio-btn-secondary"
                  title={`Send a test copy to ${authorEmail}`}
                >
                  <Send size={14} />
                  <span>Send Test Email</span>
                </button>

                {isScheduled ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSave(true)}
                      disabled={isPending || !markdown.trim()}
                      className="studio-btn studio-btn-secondary"
                      title="Update scheduled issue content"
                    >
                      <Save size={14} />
                      <span>Save Changes</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUnschedule}
                      disabled={isPending}
                      className="studio-btn studio-btn-unschedule"
                      title="Revert this edition to draft so Cron will not send it"
                    >
                      <CalendarX size={14} />
                      <span>Unschedule</span>
                    </button>
                  </>
                ) : isSent ? (
                  <button
                    type="button"
                    onClick={handleNewEdition}
                    className="studio-btn studio-btn-secondary"
                    title="Start drafting a new edition"
                  >
                    <Plus size={14} />
                    <span>New Edition</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSave(false)}
                      disabled={isPending || !markdown.trim()}
                      className="studio-btn studio-btn-secondary"
                      title="Save as draft"
                    >
                      <Save size={14} />
                      <span>Save Draft</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSave(true)}
                      disabled={isPending || !markdown.trim()}
                      className="studio-btn studio-btn-primary"
                      title="Schedule for automatic dispatch by Vercel Cron"
                    >
                      <Calendar size={14} />
                      <span>Schedule for Cron</span>
                    </button>
                  </>
                )}

                {currentIssueId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteIssue(currentIssueId)}
                    disabled={isPending}
                    className="studio-btn studio-btn-delete"
                    title="Permanently delete this edition"
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

        {/* Right Sidebar: Campaign History & Status */}
        <aside className="studio-sidebar-col">
          <div className="studio-card">
            <div className="studio-sidebar-header">
              <h2 className="studio-sidebar-title">Recent Editions</h2>
              <span className="studio-subtext">
                {isSearchActive ? `${issues.length} found` : `${issues.length} records · ${activeSubscribers} subs`}
              </span>
            </div>

            <form onSubmit={handleSearch} className="studio-search-form">
              <div className="studio-search-row">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search editions..."
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
                  title="Search editions in database"
                >
                  <Search size={13} />
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={handleNewEdition}
              className="studio-new-edition-btn"
              title="Start drafting a new edition"
            >
              <Plus size={13} />
              <span>New Edition</span>
            </button>

            <div className="studio-issues-list">
              {issues.length === 0 ? (
                <p className="studio-empty-text">No campaigns recorded yet.</p>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.id}
                    onClick={() => handleLoadIssue(issue)}
                    className={`studio-issue-item ${currentIssueId === issue.id ? "selected" : ""}`}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="studio-issue-main">
                      <h4 className="studio-issue-title">{issue.title}</h4>
                      <p className="studio-issue-date">
                        {new Date(issue.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="studio-issue-right">
                      <span className={`studio-status-pill status-${issue.status}`}>
                        {issue.status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteIssue(issue.id, e)}
                        className="studio-issue-delete-btn"
                        title="Delete edition"
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
