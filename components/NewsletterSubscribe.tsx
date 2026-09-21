"use client";

import { useState, type FormEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

export default function NewsletterSubscribe() {
  const [email, setEmail] = useState("");
  const [hpField, setHpField] = useState("");
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
        body: JSON.stringify({
          email: email.trim(),
          hp_field: hpField,
        }),
      });

      // Intercept rate limiting responses from Vercel WAF (403 Deny) or API (429 Throttle)
      if (res.status === 403 || res.status === 429) {
        const rateLimitMsg =
          "Rate limit reached (5 attempts per hour). Please try again later.";
        trackEvent("newsletter_subscribe", {
          status: "rate_limited",
          error: rateLimitMsg,
        });
        setStatus({
          type: "error",
          message: rateLimitMsg,
        });
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        trackEvent("newsletter_subscribe", { status: "success" });
        setStatus({
          type: "success",
          message: data.message || "Subscribed successfully! Thank you.",
        });
        setEmail("");
      } else {
        const errorMsg = data.error || "Failed to subscribe. Please try again.";
        trackEvent("newsletter_subscribe", {
          status: "error",
          error: errorMsg,
        });
        setStatus({
          type: "error",
          message: errorMsg,
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
        {/* Honeypot field hidden from legitimate users to trap automated bots */}
        <div style={{ display: "none" }} aria-hidden="true">
          <input
            type="text"
            name="hp_field"
            value={hpField}
            onChange={(e) => setHpField(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

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
