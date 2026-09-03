"use client";

import { sendGAEvent } from "@next/third-parties/google";

/**
 * Safely dispatches a custom event to Google Analytics 4.
 * Protected with client-side checks and try/catch to ensure user interactions
 * never fail if analytics scripts are blocked by ad-blockers or privacy shields.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  try {
    if (typeof window !== "undefined") {
      sendGAEvent("event", eventName, params ?? {});
    }
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[Analytics] Event skipped:", eventName, params, err);
    }
  }
}
