"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { formatViewCount } from "@/lib/blog-utils";

interface BlogViewCountProps {
  slug: string;
  initialViews?: number;
}

export default function BlogViewCount({
  slug,
  initialViews = 0,
}: BlogViewCountProps) {
  const [views, setViews] = useState<number>(initialViews);
  const trackedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (trackedSlugRef.current === slug) return;
    trackedSlugRef.current = slug;

    let cancelled = false;

    fetch(`/api/blog/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.success && typeof data.views === "number") {
          setViews(data.views);
        }
      })
      .catch(() => {
        // Non-fatal: keep initial SSR fallback view count
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="blog-meta-item">
      <Eye size={14} aria-hidden="true" />
      <span>{formatViewCount(views)}</span>
    </div>
  );
}
