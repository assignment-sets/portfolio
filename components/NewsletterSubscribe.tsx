"use client";

import { useState, type FormEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

export default function NewsletterSubscribe() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "";
    message: string;
  }>({
    type: "",
    message: "",
  });

  const handleSubscribe = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim()) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus({
        type: "error",
        message: "You are currently offline. Please reconnect to subscribe.",
      });
      return;
    }

    setIsLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        trackEvent("newsletter_subscribe", { status: "success" });
        setStatus({
          type: "success",
          message: data.message || "Subscribed successfully! Thank you.",
        });
        setEmail("");
      } else {
        trackEvent("newsletter_subscribe", {
          status: "error",
          error: data.error,
        });
        setStatus({
          type: "error",
          message: data.error || "Failed to subscribe. Please try again.",
        });
      }
    } catch {
      trackEvent("newsletter_subscribe", { status: "network_error" });
      setStatus({
        type: "error",
        message: "Network error. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="newsletter-box">
      <div className="newsletter-header">
        <h4 className="newsletter-title">Newsletter</h4>
        <p className="newsletter-desc">
          Occasional notes on backend architecture, GenAI experiments, and
          building reliable software. No spam, ever.
        </p>
      </div>

      <form onSubmit={handleSubscribe} className="newsletter-form">
        <div className="newsletter-input-wrap">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@domain.com"
            required
            aria-label="Email address for newsletter"
            className="newsletter-input"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="newsletter-submit-btn"
            aria-label="Subscribe to newsletter"
          >
            {isLoading ? (
              <span>...</span>
            ) : (
              <>
                <span>Subscribe</span>
                <Send size={12} />
              </>
            )}
          </button>
        </div>

        {status.type && (
          <div
            className={`newsletter-status ${
              status.type === "success" ? "status-success" : "status-error"
            }`}
            role="status"
            aria-live="polite"
          >
            {status.type === "success" ? (
              <CheckCircle2 size={13} className="status-icon" />
            ) : (
              <AlertCircle size={13} className="status-icon" />
            )}
            <span>{status.message}</span>
          </div>
        )}
      </form>
    </div>
  );
}
