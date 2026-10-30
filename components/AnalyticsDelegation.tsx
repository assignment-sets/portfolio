"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Global document-level click listener for delegated analytics event tracking.
 * Allows Server Components (Hero, Projects, Experience, Footer, etc.) to specify
 * data-track-event="event_name" and optional data-track-params='{...}' without
 * needing to become client components or wrapping links in custom client leaves.
 */
export default function AnalyticsDelegation() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const trackEl = target?.closest<HTMLElement>("[data-track-event]");
      if (!trackEl) return;

      const eventName = trackEl.getAttribute("data-track-event");
      if (!eventName) return;

      const rawParams = trackEl.getAttribute("data-track-params");
      let params: Record<string, string | number | boolean> | undefined;

      if (rawParams) {
        try {
          params = JSON.parse(rawParams);
        } catch {
          // Ignore invalid JSON payloads defensively
        }
      }

      trackEvent(eventName, params);
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  return null;
}
