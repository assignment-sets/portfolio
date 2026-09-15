"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PageLoader from "./PageLoader";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  // Reset loading state when pathname or search parameters change
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

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
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }

        setIsNavigating(true);
      } catch {
        // Ignore invalid URLs
      }
    }

    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [pathname]);

  // Safety fallback: auto-clear after 8 seconds in case navigation is interrupted
  useEffect(() => {
    if (!isNavigating) return;
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [isNavigating]);

  if (!isNavigating) return null;

  return <PageLoader />;
}
