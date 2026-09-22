"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import {
  LogOut,
  Mail,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Radio,
  ExternalLink,
  ArrowRight,
  Terminal,
  Fingerprint,
  Plus,
  Trash2,
  Loader2,
  Shield,
} from "lucide-react";

interface StudioHubStats {
  available: boolean;
  activeSubscribers: number;
  totalNewsletters: number;
  totalBlogs: number;
  publishedBlogs: number;
  draftBlogs: number;
}

interface PasskeyDevice {
  id: string;
  deviceName: string;
  createdAt: string;
}

interface StudioHubClientProps {
  initialStats: StudioHubStats;
  initialPasskeys?: PasskeyDevice[];
}

export default function StudioHubClient({
  initialStats,
  initialPasskeys = [],
}: StudioHubClientProps) {
  const router = useRouter();
  const [stats, setStats] = useState<StudioHubStats>(initialStats);
  const [isTogglingAvail, setIsTogglingAvail] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info" | "";
    message: string;
  }>({ type: "", message: "" });
  const [showCurlHelp, setShowCurlHelp] = useState(false);

  // Passkey State
  const [passkeys, setPasskeys] = useState<PasskeyDevice[]>(initialPasskeys);
  const [isPasskeysLoading, setIsPasskeysLoading] = useState(false);
  const [isEnrollingPasskey, setIsEnrollingPasskey] = useState(false);
  const [deletingPasskeyId, setDeletingPasskeyId] = useState<string | null>(null);

  const fetchPasskeys = async () => {
    setIsPasskeysLoading(true);
    try {
      const res = await fetch("/api/auth/studio/passkey");
      const data = await res.json();
      if (res.ok && data.success) {
        setPasskeys(data.passkeys || []);
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setIsPasskeysLoading(false);
    }
  };

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
        },
        body: JSON.stringify({ available: targetState }),
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

  const handleSignOut = async () => {
    await fetch("/api/auth/studio/logout", { method: "POST" }).catch(() => {});
    router.push("/studio/login");
    router.refresh();
  };

  const handleEnrollPasskey = async () => {
    setIsEnrollingPasskey(true);
    setFeedback({ type: "", message: "" });

    try {
      // 1. Request registration options
      const optRes = await fetch("/api/auth/studio/passkey/generate-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register" }),
      });

      const optData = await optRes.json();
      if (!optRes.ok || !optData.success || !optData.options) {
        setFeedback({
          type: "error",
          message: optData.error || "Failed to generate passkey challenge.",
        });
        setIsEnrollingPasskey(false);
        return;
      }

      // 2. Prompt user for biometric / hardware key creation
      let regResponse;
      try {
        regResponse = await startRegistration({ optionsJSON: optData.options });
      } catch (authErr: unknown) {
        const err = authErr as { name?: string; message?: string };
        if (err?.name === "NotAllowedError") {
          setFeedback({ type: "info", message: "Passkey enrollment was canceled." });
        } else {
          setFeedback({
            type: "error",
            message: err?.message || "Passkey registration was not completed.",
          });
        }
        setIsEnrollingPasskey(false);
        return;
      }

      const deviceName =
        window.prompt("Enter a label for this device (e.g. MacBook Touch ID, Work YubiKey):") ||
        "Security Key";

      // 3. Verify and store credential on server
      const verifyRes = await fetch("/api/auth/studio/passkey/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          response: regResponse,
          deviceName,
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        setFeedback({
          type: "success",
          message: `Passkey "${deviceName}" registered successfully! You can now sign in using biometrics.`,
        });
        fetchPasskeys();
      } else {
        setFeedback({
          type: "error",
          message: verifyData.error || "Failed to verify passkey registration.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Unexpected error during passkey enrollment.",
      });
    } finally {
      setIsEnrollingPasskey(false);
    }
  };

  const handleDeletePasskey = async (credentialID: string, deviceName: string) => {
    if (!window.confirm(`Are you sure you want to remove the passkey "${deviceName}"?`)) {
      return;
    }

    setDeletingPasskeyId(credentialID);
    try {
      const res = await fetch("/api/auth/studio/passkey", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialID }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          message: `Passkey "${deviceName}" removed.`,
        });
        setPasskeys((prev) => prev.filter((p) => p.id !== credentialID));
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to delete passkey.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Network error deleting passkey.",
      });
    } finally {
      setDeletingPasskeyId(null);
    }
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
            onClick={handleSignOut}
            className="studio-lock-btn"
            title="Sign out and clear session cookie"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
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
          {feedback.type === "info" && <Shield size={16} />}
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

        {/* Card 4: Passkeys & Security Management */}
        <section className="studio-hub-card studio-hub-card-featured">
          <div className="studio-hub-card-header">
            <div className="studio-hub-card-icon-wrap icon-avail">
              <Fingerprint size={20} />
            </div>
            <div>
              <h2 className="studio-hub-card-title">Passkeys & WebAuthn</h2>
              <p className="studio-hub-card-desc">
                Register biometric authenticators (Touch ID, Face ID, Windows Hello) and hardware FIDO2 security keys for instant passwordless sign-in.
              </p>
            </div>
          </div>

          <div className="studio-passkey-body">
            <div className="studio-passkey-header-row">
              <div className="studio-passkey-count">
                <span className="studio-passkey-count-num">{passkeys.length}</span>
                <span className="studio-passkey-count-label">
                  {passkeys.length === 1 ? "Enrolled Device" : "Enrolled Devices"}
                </span>
              </div>

              <button
                type="button"
                onClick={handleEnrollPasskey}
                disabled={isEnrollingPasskey}
                className="studio-passkey-add-btn"
                title="Enroll a new biometric authenticator or security key"
              >
                {isEnrollingPasskey ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Enrolling...</span>
                  </>
                ) : (
                  <>
                    <Plus size={13} />
                    <span>Add Passkey</span>
                  </>
                )}
              </button>
            </div>

            {isPasskeysLoading ? (
              <div className="studio-passkey-empty">
                Loading enrolled devices...
              </div>
            ) : passkeys.length === 0 ? (
              <div className="studio-passkey-empty">
                No passkeys enrolled yet. Click &ldquo;Add Passkey&rdquo; to register this browser or device.
              </div>
            ) : (
              <div className="studio-passkey-list">
                {passkeys.map((p) => (
                  <div key={p.id} className="studio-passkey-item">
                    <div className="studio-passkey-item-info">
                      <Fingerprint size={16} className="studio-passkey-item-icon" />
                      <div>
                        <div className="studio-passkey-item-name">{p.deviceName}</div>
                        <div className="studio-passkey-item-date">
                          Added {new Date(p.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePasskey(p.id, p.deviceName)}
                      disabled={deletingPasskeyId === p.id}
                      className="studio-passkey-delete-btn"
                      title={`Remove passkey ${p.deviceName}`}
                    >
                      {deletingPasskeyId === p.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
