"use client";

import { ArrowUp } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function BackToTopButton() {
  return (
    <button
      type="button"
      onClick={() => {
        trackEvent("scroll_top_click", { location: "footer" });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="footer-back-to-top"
      aria-label="Back to top of page"
    >
      <span>Back to top</span>
      <ArrowUp size={13} />
    </button>
  );
}
