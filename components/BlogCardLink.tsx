"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

interface BlogCardLinkProps {
  href: string;
  title: string;
  slug: string;
  location?: "card_title" | "read_more";
  className?: string;
  children: React.ReactNode;
}

export default function BlogCardLink({
  href,
  title,
  slug,
  location = "card_title",
  className,
  children,
}: BlogCardLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        trackEvent("blog_article_click", {
          post_title: title,
          slug,
          location,
        });
      }}
    >
      {children}
    </Link>
  );
}
