"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import {
  Share2,
  Check,
  Copy,
  Mail,
  X as CloseIcon,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { trackEvent, buildUtmUrl } from "@/lib/analytics";

function getClientOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

function subscribeToOrigin() {
  return () => {};
}

interface BlogShareButtonProps {
  title: string;
  slug: string;
  description?: string;
  variant?: "header" | "footer";
}

export default function BlogShareButton({
  title,
  slug,
  variant = "header",
}: BlogShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const clientOrigin = useSyncExternalStore(
    subscribeToOrigin,
    getClientOrigin,
    () => ""
  );
  const origin = clientOrigin || process.env.NEXT_PUBLIC_SITE_URL || "";
  const baseUrl = origin ? `${origin}/blog/${slug}` : `/blog/${slug}`;

  const copyUtmUrl = buildUtmUrl(baseUrl, {
    source: "direct_share",
    medium: "referral",
    campaign: "blog_share",
    content: variant,
  });

  const twitterUtmUrl = buildUtmUrl(baseUrl, {
    source: "twitter",
    medium: "social",
    campaign: "blog_share",
    content: variant,
  });

  const linkedinUtmUrl = buildUtmUrl(baseUrl, {
    source: "linkedin",
    medium: "social",
    campaign: "blog_share",
    content: variant,
  });

  const whatsappUtmUrl = buildUtmUrl(baseUrl, {
    source: "whatsapp",
    medium: "social",
    campaign: "blog_share",
    content: variant,
  });

  const emailUtmUrl = buildUtmUrl(baseUrl, {
    source: "email",
    medium: "email",
    campaign: "blog_share",
    content: variant,
  });

  const shareUrl = copyUtmUrl;

  // Lock body scroll and listen for Escape key when modal is open
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleCopyLink() {
    const textToCopy = shareUrl || copyUtmUrl;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      trackEvent("blog_share_click", {
        post_title: title,
        slug,
        channel: "copy",
        location: variant,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  function handleOpenModal() {
    setIsOpen(true);
    trackEvent("blog_share_modal_open", {
      post_title: title,
      slug,
      location: variant,
    });
  }

  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      name: "X (Twitter)",
      channel: "x",
      href: `https://x.com/intent/tweet?text=${encodedTitle}&url=${encodeURIComponent(
        twitterUtmUrl
      )}`,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      channel: "linkedin",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        linkedinUtmUrl
      )}`,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      ),
    },
    {
      name: "WhatsApp",
      channel: "whatsapp",
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodeURIComponent(
        whatsappUtmUrl
      )}`,
      icon: <MessageCircle size={15} />,
    },
    {
      name: "Email",
      channel: "email",
      href: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(
        `I thought you might find this interesting:\n\n${title}\n${emailUtmUrl}`
      )}`,
      icon: <Mail size={15} />,
    },
  ];

  return (
    <>
      {variant === "header" ? (
        <button
          type="button"
          onClick={handleOpenModal}
          className="blog-share-btn"
          aria-label="Share article"
        >
          <Share2 size={14} />
          <span>Share</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpenModal}
          className="blog-share-footer-btn"
        >
          <Share2 size={15} />
          <span>Share this article</span>
        </button>
      )}

      {/* Share Modal Dialog */}
      {isOpen && (
        <div
          className="blog-share-backdrop"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
        >
          <div
            className="blog-share-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="blog-share-header">
              <h3 id="share-modal-title" className="blog-share-title">
                Share Article
              </h3>
              <button
                type="button"
                className="blog-share-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close dialog"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <p className="blog-share-subtitle">{title}</p>

            {/* Quick Copy Link Row */}
            <div className="blog-share-copy-wrap">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="blog-share-copy-input"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`blog-share-copy-btn ${copied ? "copied" : ""}`}
              >
                {copied ? (
                  <>
                    <Check size={13} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Social / Direct Share Grid */}
            <div className="blog-share-grid">
              {shareLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="blog-share-item"
                  onClick={() => {
                    trackEvent("blog_share_click", {
                      post_title: title,
                      slug,
                      channel: link.channel,
                      location: variant,
                    });
                  }}
                >
                  <span className="blog-share-icon">{link.icon}</span>
                  <span className="blog-share-name">{link.name}</span>
                  <ExternalLink size={11} className="blog-share-ext" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
