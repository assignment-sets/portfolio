"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Edit3 } from "lucide-react";

interface BlogEditButtonProps {
  slug: string;
}

export default function BlogEditButton({ slug }: BlogEditButtonProps) {
  const [isAuthor, setIsAuthor] = useState(false);

  useEffect(() => {
    // Check session status asynchronously so server-side page remains pure static SSG
    fetch("/api/newsletter/studio/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setIsAuthor(true);
        }
      })
      .catch(() => {});
  }, []);

  if (!isAuthor) return null;

  return (
    <Link
      href={`/studio/blog?edit=${slug}`}
      className="blog-edit-admin-btn"
      title="Edit post in Blog Studio"
    >
      <Edit3 size={13} />
      <span>Edit Post</span>
    </Link>
  );
}
