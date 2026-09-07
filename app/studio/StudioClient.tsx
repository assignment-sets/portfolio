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
  Users,
  RefreshCw,
  ChevronRight,
  CalendarX,
  Plus,
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

interface StudioClientProps {
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

export default function StudioClient({
  activeSubscribers,
  initialIssues,
  initialKey,
  authorEmail,
}: StudioClientProps) {
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

  const [isPending, startTransition] = useTransition();

  const currentIssue = issues.find((i) => i.id === currentIssueId);
  const isScheduled = currentIssue?.status === "scheduled";
  const isSent = currentIssue?.status === "sent";

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

  return (
    <div className="studio-container">
      {/* Top Bar */}
      <header className="studio-header">
        <div className="studio-brand">
          <Link href="/" className="studio-back-link" title="Return to site">
            &larr; Portfolio
          </Link>
          <span className="studio-sep">/</span>
          <h1 className="studio-title">Newsletter Studio</h1>
        </div>

        <div className="studio-header-meta">
          <div className="studio-metric" title="Total active subscribers in MongoDB">
            <Users size={14} />
            <span><strong>{activeSubscribers}</strong> Subscribers</span>
          </div>
          <button
            onClick={handleLockStudio}
            className="studio-lock-btn"
            title="Clear session and lock studio"
          >
            <Lock size={13} />
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
              <span className="studio-subtext">{issues.length} records</span>
            </div>

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
