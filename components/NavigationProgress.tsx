"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PageLoader from "./PageLoader";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentKey = `${pathname}?${searchParams?.toString() || ""}`;
  const [prevKey, setPrevKey] = useState(currentKey);
  const [targetKey, setTargetKey] = useState<string | null>(null);

  // Automatically reset targetKey when current route changes or finishes rendering
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    setTargetKey(null);
  }

  const isNavigating =
    targetKey !== null &&
    targetKey !== currentKey &&
    pathname !== "/_not-found";

  // Reset when user navigates using browser back / forward buttons
  useEffect(() => {
    const handlePopState = () => setTargetKey(null);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Intercept internal link clicks to provide instant visual feedback
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");

      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");

      // Skip non-HTTP / external / download / modified clicks
      if (
        !href ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        targetAttr === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.defaultPrevented
      ) {
        return;
      }

      // If it's a pure hash jump on the current page, skip loader
      if (href.startsWith("#") || href.startsWith(`${pathname}#`)) {
        return;
      }

      // Normalize target URL
      try {
        const url = new URL(anchor.href, window.location.origin);
        const targetUrlKey = `${url.pathname}?${url.searchParams.toString()}`;
        if (targetUrlKey === currentKey) {
          return;
        }

        setTargetKey(targetUrlKey);
      } catch {
        // Ignore invalid URLs
      }
    }

    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [currentKey, pathname]);

  // Safety fallback: auto-clear after 3.5 seconds in case navigation is interrupted or canceled
  useEffect(() => {
    if (!isNavigating) return;
    const timer = setTimeout(() => {
      setTargetKey(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isNavigating]);

  if (!isNavigating) return null;

  return <PageLoader />;
}
