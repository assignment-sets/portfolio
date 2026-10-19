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
  ShieldCheck,
  Copy,
  Check,
  X,
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
  initialTotpEnabled?: boolean;
}

export default function StudioHubClient({
  initialStats,
  initialPasskeys = [],
  initialTotpEnabled = false,
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

  // 2FA TOTP State
  const [totpEnabled, setTotpEnabled] = useState(initialTotpEnabled);
  const [is2FASetupOpen, setIs2FASetupOpen] = useState(false);
  const [is2FASetupLoading, setIs2FASetupLoading] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    uri: string;
    qrCodeDataUrl: string;
    recoveryCodes: string[];
  } | null>(null);
  const [setupConfirmCode, setSetupConfirmCode] = useState("");
  const [isActivating2FA, setIsActivating2FA] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  // 2FA Disable Modal State
  const [is2FADisableOpen, setIs2FADisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [disableError, setDisableError] = useState("");

  const handleStart2FASetup = async () => {
    setIs2FASetupLoading(true);
    setSetupError("");
    try {
      const res = await fetch("/api/auth/studio/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSetupData(data);
        setIs2FASetupOpen(true);
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to initialize 2FA setup.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Network error initializing 2FA setup.",
      });
    } finally {
      setIs2FASetupLoading(false);
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData || !setupConfirmCode.trim()) {
      setSetupError("Please enter the 6-digit verification code from your authenticator app.");
      return;
    }

    setIsActivating2FA(true);
    setSetupError("");

    try {
      const res = await fetch("/api/auth/studio/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: setupData.secret,
          code: setupConfirmCode,
          recoveryCodes: setupData.recoveryCodes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTotpEnabled(true);
        setIs2FASetupOpen(false);
        setSetupData(null);
        setSetupConfirmCode("");
        setFeedback({
          type: "success",
          message: "Two-Factor Authentication is now active on your account.",
        });
      } else {
        setSetupError(data.error || "Invalid 6-digit confirmation code.");
      }
    } catch {
      setSetupError("Network error activating 2FA.");
    } finally {
      setIsActivating2FA(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) {
      setDisableError("Please enter your current password.");
      return;
    }

    setIsDisabling2FA(true);
    setDisableError("");

    try {
      const res = await fetch("/api/auth/studio/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTotpEnabled(false);
        setIs2FADisableOpen(false);
        setDisablePassword("");
        setFeedback({
          type: "success",
          message: "Two-Factor Authentication has been disabled.",
        });
      } else {
        setDisableError(data.error || "Failed to disable 2FA.");
      }
    } catch {
      setDisableError("Network error disabling 2FA.");
    } finally {
      setIsDisabling2FA(false);
    }
  };

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

          <div className="studio-hub-card-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href="/studio/blog"
              className="studio-hub-action-btn primary"
              style={{ flex: "1 1 180px" }}
            >
              <span>Manage Blog Posts</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/studio/blog/verify"
              className="studio-hub-action-btn"
              style={{
                flex: "1 1 180px",
                background: "var(--bg-card)",
                color: "var(--text)",
                border: "1px solid var(--border)",
              }}
            >
              <span>Watermark Verifier</span>
              <ShieldCheck size={14} />
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

        {/* Card 5: Two-Factor Authentication (TOTP) */}
        <section className="studio-hub-card studio-hub-card-featured">
          <div className="studio-hub-card-header">
            <div className="studio-hub-card-icon-wrap icon-newsletter">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="studio-hub-card-title">Two-Factor Authentication (2FA)</h2>
              <p className="studio-hub-card-desc">
                Require a 6-digit verification code from Google Authenticator, Bitwarden, 1Password, or Authy when signing in with a password.
              </p>
            </div>
          </div>

          <div className="studio-passkey-body">
            <div className="studio-2fa-status-row">
              <div className="studio-passkey-count">
                <span className={`studio-2fa-badge ${totpEnabled ? "active" : "disabled"}`}>
                  {totpEnabled ? (
                    <>
                      <CheckCircle2 size={13} /> Active (Authenticator App)
                    </>
                  ) : (
                    <>
                      <AlertCircle size={13} /> Disabled
                    </>
                  )}
                </span>
              </div>

              {totpEnabled ? (
                <button
                  type="button"
                  onClick={() => {
                    setDisablePassword("");
                    setDisableError("");
                    setIs2FADisableOpen(true);
                  }}
                  className="studio-passkey-delete-btn"
                  style={{ color: "#ef4444", fontSize: "0.82rem", gap: "6px", padding: "6px 12px", border: "1px solid var(--border)", borderRadius: "6px" }}
                  title="Disable Two-Factor Authentication"
                >
                  <span>Disable 2FA</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStart2FASetup}
                  disabled={is2FASetupLoading}
                  className="studio-passkey-add-btn"
                  title="Set up Two-Factor Authentication with an Authenticator app"
                >
                  {is2FASetupLoading ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>Enable 2FA</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 2FA Enrollment Setup Modal */}
      {is2FASetupOpen && setupData && (
        <div className="studio-2fa-modal-overlay">
          <div className="studio-2fa-modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="studio-hub-card-icon-wrap icon-newsletter" style={{ width: "32px", height: "32px" }}>
                  <ShieldCheck size={18} />
                </div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0, color: "var(--text)" }}>
                  Set Up Two-Factor Authentication
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIs2FASetupOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: "16px", lineHeight: 1.5 }}>
              Scan this QR code using your authenticator app (Google Authenticator, Bitwarden, 1Password, Authy, Apple Keychain).
            </p>

            {/* QR Code Frame */}
            <div className="studio-2fa-qr-wrap">
              <div className="studio-2fa-qr-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setupData.qrCodeDataUrl}
                  alt="2FA QR Code"
                  width={200}
                  height={200}
                  style={{ display: "block" }}
                />
              </div>
            </div>

            {/* Secret Key Text Copy */}
            <div style={{ fontSize: "0.76rem", color: "var(--text-dim)", marginBottom: "6px" }}>
              Or enter this secret key manually:
            </div>
            <div className="studio-2fa-secret-box">
              <span className="studio-2fa-secret-text">{setupData.secret}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(setupData.secret);
                  setCopiedSecret(true);
                  setTimeout(() => setCopiedSecret(false), 2000);
                }}
                style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: "4px" }}
                title="Copy Secret"
              >
                {copiedSecret ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
              </button>
            </div>

            {/* Recovery Codes */}
            <div style={{ fontSize: "0.76rem", color: "var(--text-dim)", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Emergency Backup Recovery Codes (Save these securely):</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(setupData.recoveryCodes.join("\n"));
                  setCopiedRecovery(true);
                  setTimeout(() => setCopiedRecovery(false), 2000);
                }}
                style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.74rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                {copiedRecovery ? (
                  <>
                    <Check size={12} color="#16a34a" /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copy All
                  </>
                )}
              </button>
            </div>
            <div className="studio-2fa-recovery-grid">
              {setupData.recoveryCodes.map((code, idx) => (
                <div key={idx} className="studio-2fa-recovery-item">
                  {code}
                </div>
              ))}
            </div>

            {setupError && (
              <div style={{ marginBottom: "16px", padding: "10px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", color: "#ef4444", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={14} />
                <span>{setupError}</span>
              </div>
            )}

            {/* Verification Form */}
            <form onSubmit={handleConfirm2FA}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, color: "var(--text)", marginBottom: "6px" }}>
                Enter the 6-digit confirmation code from your app:
              </label>
              <input
                type="text"
                value={setupConfirmCode}
                onChange={(e) => setSetupConfirmCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                inputMode="numeric"
                required
                disabled={isActivating2FA}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  background: "var(--input-bg)",
                  border: "1px solid var(--border)",
                  fontSize: "1.1rem",
                  fontFamily: "monospace",
                  textAlign: "center",
                  letterSpacing: "0.2em",
                  color: "var(--text)",
                  marginBottom: "16px",
                  outline: "none",
                }}
              />

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIs2FASetupOpen(false)}
                  style={{ padding: "8px 16px", borderRadius: "6px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActivating2FA}
                  className="studio-passkey-add-btn"
                  style={{ padding: "8px 20px" }}
                >
                  {isActivating2FA ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Activating...</span>
                    </>
                  ) : (
                    <span>Verify & Activate 2FA</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Disable Modal */}
      {is2FADisableOpen && (
        <div className="studio-2fa-modal-overlay">
          <div className="studio-2fa-modal" style={{ maxWidth: "400px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "var(--text)" }}>
                Disable Two-Factor Authentication
              </h3>
              <button
                type="button"
                onClick={() => setIs2FADisableOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: "16px", lineHeight: 1.5 }}>
              Please enter your admin password to confirm disabling Two-Factor Authentication.
            </p>

            {disableError && (
              <div style={{ marginBottom: "14px", padding: "8px 12px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", color: "#ef4444", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={14} />
                <span>{disableError}</span>
              </div>
            )}

            <form onSubmit={handleDisable2FA}>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Admin Password"
                required
                disabled={isDisabling2FA}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  background: "var(--input-bg)",
                  border: "1px solid var(--border)",
                  fontSize: "0.85rem",
                  color: "var(--text)",
                  marginBottom: "16px",
                  outline: "none",
                }}
              />

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIs2FADisableOpen(false)}
                  style={{ padding: "8px 14px", borderRadius: "6px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.82rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDisabling2FA}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    background: "#ef4444",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 500,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {isDisabling2FA ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Disabling...
                    </>
                  ) : (
                    "Confirm Disable"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
