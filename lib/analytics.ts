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

export interface UtmParams {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
}

/**
 * Builds a URL with standard Google Analytics UTM campaign parameters.
 */
export function buildUtmUrl(baseUrl: string, utm: UtmParams): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("utm_source", utm.source);
    url.searchParams.set("utm_medium", utm.medium);
    url.searchParams.set("utm_campaign", utm.campaign);
    if (utm.content) {
      url.searchParams.set("utm_content", utm.content);
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}

