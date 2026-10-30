"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PageLoader from "./PageLoader";

export default function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = `${pathname}?${searchParams?.toString() || ""}`;
  const [prevUrl, setPrevUrl] = useState(currentUrl);
  const [loading, setLoading] = useState(false);
  const pendingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset loader during render whenever pathname or searchParams change (React pattern for state derived from props)
  if (prevUrl !== currentUrl) {
    setPrevUrl(currentUrl);
    if (loading) {
      setLoading(false);
    }
  }

  // Clear any pending navigation timer when URL changes
  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [currentUrl]);

  // Reset loader on browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      setLoading(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
      }
    };
  }, []);

  // Intercept internal link clicks to display navigation feedback after a 150ms threshold.
  // Instantaneous/prefetched navigations complete before 150ms, avoiding unnecessary visual flashing.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");

      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");

      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        targetAttr === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.defaultPrevented
      ) {
        return;
      }

      try {
        const dest = new URL(anchor.href, window.location.origin);

        // Ignore external domains
        if (dest.origin !== window.location.origin) return;

        // Ignore clicks targeting the exact same path and query
        if (
          dest.pathname === window.location.pathname &&
          dest.search === window.location.search
        ) {
          return;
        }

        if (pendingTimerRef.current) {
          clearTimeout(pendingTimerRef.current);
        }
        pendingTimerRef.current = setTimeout(() => {
          setLoading(true);
          pendingTimerRef.current = null;
        }, 150);
      } catch {
        // Ignore invalid URLs
      }
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
      }
    };
  }, []);

  // Failsafe auto-dismiss after 2s to guarantee the spinner never stays stuck
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (!loading) return null;

  return <PageLoader />;
}
