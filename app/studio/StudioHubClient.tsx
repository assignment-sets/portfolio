"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Radio,
  ExternalLink,
  ArrowRight,
  Terminal,
} from "lucide-react";

interface StudioHubStats {
  available: boolean;
  activeSubscribers: number;
  totalNewsletters: number;
  totalBlogs: number;
  publishedBlogs: number;
  draftBlogs: number;
}

interface StudioHubClientProps {
  initialStats: StudioHubStats;
  initialKey?: string;
}

export default function StudioHubClient({
  initialStats,
  initialKey,
}: StudioHubClientProps) {
  const router = useRouter();
  const [stats, setStats] = useState<StudioHubStats>(initialStats);
  const [isTogglingAvail, setIsTogglingAvail] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info" | "";
    message: string;
  }>({ type: "", message: "" });
  const [showCurlHelp, setShowCurlHelp] = useState(false);

  // Establish persistent session cookie if key is present in searchParams
  useEffect(() => {
    if (initialKey) {
      fetch("/api/newsletter/studio/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: initialKey }),
      }).catch(() => {});
    }
  }, [initialKey]);

  const handleToggleAvailability = async () => {
    setIsTogglingAvail(true);
    const targetState = !stats.available;
    // Optimistic UI update
    setStats((prev) => ({ ...prev, available: targetState }));

    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(initialKey ? { Authorization: `Bearer ${initialKey}` } : {}),
        },
        body: JSON.stringify({ available: targetState, secret: initialKey }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          message: data.message || `Work status set to ${targetState ? "Available" : "Hidden"}.`,
        });
      } else {
        // Rollback on failure
        setStats((prev) => ({ ...prev, available: !targetState }));
        setFeedback({
          type: "error",
          message: data.error || "Failed to update availability status.",
        });
      }
    } catch {
      setStats((prev) => ({ ...prev, available: !targetState }));
      setFeedback({
        type: "error",
        message: "Network error updating availability status.",
      });
    } finally {
      setIsTogglingAvail(false);
    }
  };

  const handleLockStudio = async () => {
    await fetch("/api/newsletter/studio/session", { method: "DELETE" }).catch(() => {});
    router.push("/");
    router.refresh();
  };

  return (
    <div className="studio-hub-container">
      {/* Hub Top Bar */}
      <header className="studio-hub-header">
        <div className="studio-brand">
          <h1 className="studio-title">Studio</h1>
        </div>

        <div className="studio-header-meta">
          <Link
            href="/"
            target="_blank"
            className="studio-metric"
            style={{ textDecoration: "none" }}
            title="Open live portfolio in a new tab"
          >
            <ExternalLink size={13} />
            <span>Live Site</span>
          </Link>

          <button
            type="button"
            onClick={handleLockStudio}
            className="studio-lock-btn"
            title="Clear session cookie and lock studio"
          >
            <Lock size={13} />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Global Feedback Banner */}
      {feedback.message && (
        <div
          className={`studio-hub-feedback feedback-${feedback.type}`}
          role="status"
          aria-live="polite"
        >
          {feedback.type === "success" && <CheckCircle2 size={16} />}
          {feedback.type === "error" && <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Hub Dashboard Grid */}
      <main className="studio-hub-grid">
        {/* Card 1: Availability Status Control */}
        <section className="studio-hub-card studio-hub-card-featured">
          <div className="studio-hub-card-header">
            <div className="studio-hub-card-icon-wrap icon-avail">
              <Radio size={20} />
            </div>
            <div>
              <h2 className="studio-hub-card-title">Availability Status</h2>
              <p className="studio-hub-card-desc">
                Controls the green &ldquo;Available for work&rdquo; badge in the Hero section and status in llms.txt.
              </p>
            </div>
          </div>

          <div className="studio-avail-control-body">
            <div className="studio-avail-status-display">
              <span className="studio-avail-label">Current Status:</span>
              <span className={`studio-avail-value ${stats.available ? "status-on" : "status-off"}`}>
                {stats.available ? "Available for work" : "Work Hidden"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleAvailability}
              disabled={isTogglingAvail}
              className={`studio-hub-toggle-btn ${stats.available ? "is-active" : "is-inactive"}`}
              title="Click to toggle availability state across portfolio"
            >
              <span className="studio-hub-switch-track">
                <span className="studio-hub-switch-thumb" />
              </span>
              <span>
                {isTogglingAvail
                  ? "Updating..."
                  : stats.available
                  ? "Disable"
                  : "Enable"}
              </span>
            </button>
          </div>

          <div className="studio-hub-card-footer">
            <button
              type="button"
              onClick={() => setShowCurlHelp((v) => !v)}
              className="studio-hub-text-btn"
            >
              <Terminal size={13} />
              <span>{showCurlHelp ? "Hide cURL API Details" : "View cURL API"}</span>
            </button>
            {showCurlHelp && (
              <div className="studio-curl-box">
                <pre style={{ margin: 0, fontFamily: "inherit" }}>
{`curl -X POST "http://localhost:3000/api/availability" \\
  -H "Authorization: Bearer <STUDIO_SECRET>" \\
  -H "Content-Type: application/json" \\
  -d '{"available": ${stats.available ? "false" : "true"}}'`}
                </pre>
              </div>
            )}
          </div>
        </section>

        {/* Card 2: Newsletter Management */}
        <section className="studio-hub-card">
          <div className="studio-hub-card-header">
            <div className="studio-hub-card-icon-wrap icon-newsletter">
              <Mail size={20} />
            </div>
            <div>
              <h2 className="studio-hub-card-title">Newsletter Studio</h2>
              <p className="studio-hub-card-desc">
                Author editions, manage subscriber list, preview HTML emails, and schedule Vercel Cron dispatches.
              </p>
            </div>
          </div>

          <div className="studio-hub-stats-row">
            <div className="studio-hub-stat">
              <span className="studio-stat-number">{stats.activeSubscribers}</span>
              <span className="studio-stat-label">Active Subscribers</span>
            </div>

            <div className="studio-hub-stat">
              <span className="studio-stat-number">{stats.totalNewsletters}</span>
              <span className="studio-stat-label">Total Editions</span>
            </div>
          </div>

          <div className="studio-hub-card-actions">
            <Link
              href="/studio/newsletter"
              className="studio-hub-action-btn primary"
            >
              <span>Manage Newsletters</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* Card 3: Blog Management */}
        <section className="studio-hub-card">
          <div className="studio-hub-card-header">
            <div className="studio-hub-card-icon-wrap icon-blog">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="studio-hub-card-title">Blog Studio</h2>
              <p className="studio-hub-card-desc">
                Write long-form tech articles, edit existing posts, update drafts, and manage MongoDB Atlas search indexes.
              </p>
            </div>
          </div>

          <div className="studio-hub-stats-row">
            <div className="studio-hub-stat">
              <span className="studio-stat-number">{stats.totalBlogs}</span>
              <span className="studio-stat-label">Total Posts</span>
            </div>

            <div className="studio-hub-stat">
              <span className="studio-stat-number text-published">{stats.publishedBlogs}</span>
              <span className="studio-stat-label">Published</span>
            </div>

            <div className="studio-hub-stat">
              <span className="studio-stat-number text-draft">{stats.draftBlogs}</span>
              <span className="studio-stat-label">Drafts</span>
            </div>
          </div>

          <div className="studio-hub-card-actions">
            <Link
              href="/studio/blog"
              className="studio-hub-action-btn primary"
            >
              <span>Manage Blog Posts</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
