"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Lock,
  Upload,
  Trash2,
  ExternalLink,
  Search,
  AlertCircle,
} from "lucide-react";

interface VerificationResult {
  valid: boolean;
  author: string;
  slug: string;
  timestamp?: number;
  date?: string;
  signature?: string;
  occurrences: number;
}

export default function BlogVerifyClient() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<VerificationResult | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = () => {
    if (!text.trim()) {
      setError("Please paste some text or upload a file first.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/blog/studio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "verify_watermark",
            text,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setResult(data.result);
        } else {
          setError(data.error || "Failed to verify text.");
        }
      } catch {
        setError("Network error connecting to verification service.");
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setText(content);
        setResult(undefined);
        setError(null);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClear = () => {
    setText("");
    setResult(undefined);
    setError(null);
  };

  const handleLockStudio = async () => {
    await fetch("/api/newsletter/studio/session", { method: "DELETE" }).catch(() => {});
    router.push("/");
    router.refresh();
  };

  return (
    <div className="studio-container">
      {/* Header */}
      <header className="studio-header">
        <div className="studio-header-top">
          <div className="studio-brand">
            <Link href="/studio/blog" className="studio-back-btn" title="Back to Blog Studio">
              <ArrowLeft size={16} />
            </Link>
            <h1 className="studio-title">Watermark Verifier</h1>
          </div>

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

      {/* Main Content */}
      <div style={{ maxWidth: 860, margin: "24px auto", padding: "0 16px" }}>
        <div className="studio-card" style={{ padding: "24px" }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 6px" }}>
              Verify Stolen or Plagiarized Text
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Paste suspected text or upload a markdown file. The server will scan for invisible zero-width
              fingerprints and cryptographically verify authorship against your secret key.
            </p>
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 16,
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                color: "#ef4444",
                fontSize: "0.85rem",
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Text Area */}
          <div style={{ marginBottom: 16 }}>
            <textarea
              className="studio-input"
              rows={10}
              placeholder="Paste article excerpt, full blog post, or downloaded markdown content here..."
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setResult(undefined);
              }}
              style={{
                width: "100%",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.85rem",
                lineHeight: 1.5,
                resize: "vertical",
              }}
            />
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={handleVerify}
              disabled={isPending || !text.trim()}
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 18px",
                fontSize: "0.85rem",
              }}
            >
              <Search size={15} />
              <span>{isPending ? "Verifying..." : "Verify Watermark"}</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,.markdown"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="studio-refresh-preview-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}
              title="Upload a text or markdown file"
            >
              <Upload size={14} />
              <span>Upload File</span>
            </button>

            {text && (
              <button
                type="button"
                onClick={handleClear}
                className="studio-refresh-preview-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.85rem",
                  marginLeft: "auto",
                }}
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Verification Result Card */}
        {result !== undefined && (
          <div style={{ marginTop: 20 }}>
            {result === null ? (
              <div
                className="studio-card"
                style={{
                  padding: "20px",
                  borderLeft: "4px solid #ef4444",
                  backgroundColor: "rgba(239, 68, 68, 0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#ef4444" }}>
                  <ShieldX size={22} />
                  <strong style={{ fontSize: "1rem" }}>No Digital Watermark Found</strong>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  The analyzed text contains zero invisible zero-width fingerprint sequences.
                </p>
              </div>
            ) : result.valid ? (
              <div
                className="studio-card"
                style={{
                  padding: "20px",
                  borderLeft: "4px solid #10b981",
                  backgroundColor: "rgba(16, 185, 129, 0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#10b981",
                    marginBottom: 16,
                  }}
                >
                  <ShieldCheck size={24} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                      Authentic Digital Signature Verified!
                    </h3>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Cryptographically proven to originate from your portfolio blog.
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 12,
                    fontSize: "0.85rem",
                  }}
                >
                  <div style={{ padding: "10px 14px", borderRadius: 6, background: "var(--bg-card)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 2 }}>
                      Author
                    </div>
                    <div style={{ fontWeight: 600 }}>{result.author}</div>
                  </div>

                  <div style={{ padding: "10px 14px", borderRadius: 6, background: "var(--bg-card)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 2 }}>
                      Article Slug
                    </div>
                    <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{result.slug}</span>
                      <Link
                        href={`/blog/${result.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        title="View published article"
                        style={{ color: "var(--accent)" }}
                      >
                        <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>

                  <div style={{ padding: "10px 14px", borderRadius: 6, background: "var(--bg-card)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 2 }}>
                      Published Date
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {result.date ? new Date(result.date).toLocaleString() : "Unknown"}
                    </div>
                  </div>

                  <div style={{ padding: "10px 14px", borderRadius: 6, background: "var(--bg-card)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 2 }}>
                      HMAC Signature
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "0.8rem",
                        color: "#10b981",
                      }}
                    >
                      {result.signature} (VALID)
                    </div>
                  </div>

                  <div style={{ padding: "10px 14px", borderRadius: 6, background: "var(--bg-card)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 2 }}>
                      Watermark Occurrences
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      Found in {result.occurrences} separate text segment{result.occurrences > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="studio-card"
                style={{
                  padding: "20px",
                  borderLeft: "4px solid #f59e0b",
                  backgroundColor: "rgba(245, 158, 11, 0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#f59e0b" }}>
                  <ShieldAlert size={22} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                      Watermark Detected, but Signature Invalid!
                    </h3>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      The payload was altered or signed with an unrecognized secret key.
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: "0.85rem" }}>
                  <div><strong>Slug:</strong> {result.slug}</div>
                  <div><strong>Signature:</strong> {result.signature}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
