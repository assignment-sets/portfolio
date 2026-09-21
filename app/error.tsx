"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Home, AlertTriangle } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[App ErrorBoundary]:", error);
    }
  }, [error]);

  return (
    <main className="wrap">
      <div className="not-found-wrap">
        <span className="not-found-badge">
          <AlertTriangle
            size={12}
            style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }}
          />
          Application Error
        </span>
        <h1 className="not-found-title">Something went sideways.</h1>
        <p className="not-found-desc">
          An unexpected issue occurred while rendering this view. You can retry
          or return to the home page.
        </p>
        <div className="not-found-actions">
          <button
            type="button"
            onClick={() => reset()}
            className="primary-btn"
            style={{
              fontSize: "0.85rem",
              padding: "8px 18px",
              cursor: "pointer",
              border: "1px solid var(--text)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <RotateCcw size={14} />
            Try Again
          </button>
          <Link href="/">
            <Home size={14} />
            Return Home
          </Link>
          <Link href="/blog">Explore Blogs &rarr;</Link>
        </div>
      </div>
    </main>
  );
}
