"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

interface BlogSearchBarProps {
  initialQuery?: string;
  isLoading?: boolean;
}

export default function BlogSearchBar({
  initialQuery = "",
  isLoading = false,
}: BlogSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  const currentParam = (searchParams?.get("q") || "").trim();
  const isQueryDirty = query.trim() !== currentParam;
  const isSearching = isQueryDirty || isPending || Boolean(isLoading);

  // Global '/' keyboard shortcut to focus the search input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const isEditable =
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.isContentEditable;

        if (!isEditable) {
          e.preventDefault();
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync with URL search params ONLY when the input is not actively focused (e.g. Back/Forward navigation)
  useEffect(() => {
    const urlQuery = searchParams?.get("q") || "";
    if (document.activeElement !== inputRef.current && query !== urlQuery) {
      setQuery(urlQuery);
    }
  }, [searchParams, query]);

  // Debounced live auto-search on query input change
  useEffect(() => {
    if (query.trim() === currentParam) {
      return;
    }

    const timer = setTimeout(() => {
      const trimmed = query.trim();
      const params = new URLSearchParams(searchParams?.toString() || "");

      if (trimmed) {
        params.set("q", trimmed);
        params.delete("page");
      } else {
        params.delete("q");
        params.delete("page");
      }

      const targetUrl = params.toString() ? `/blog?${params.toString()}` : "/blog";
      startTransition(() => {
        router.replace(targetUrl, { scroll: false });
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [query, currentParam, router, searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleClear = () => {
    setQuery("");
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("q");
    params.delete("page");
    const targetUrl = params.toString() ? `/blog?${params.toString()}` : "/blog";
    startTransition(() => {
      router.replace(targetUrl, { scroll: false });
    });
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    const params = new URLSearchParams(searchParams?.toString() || "");

    if (trimmed) {
      params.set("q", trimmed);
      params.delete("page");
    } else {
      params.delete("q");
      params.delete("page");
    }

    const targetUrl = params.toString() ? `/blog?${params.toString()}` : "/blog";
    startTransition(() => {
      router.replace(targetUrl, { scroll: false });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="blog-search-form" role="search">
      <div className="blog-search-input-wrap">
        {isSearching ? (
          <Loader2 size={16} className="blog-search-icon blog-search-spinner" aria-hidden="true" />
        ) : (
          <Search size={16} className="blog-search-icon" aria-hidden="true" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search articles by topic, keywords, or title..."
          className="blog-search-input"
          aria-label="Search articles"
          autoComplete="off"
          spellCheck="false"
        />
        {isSearching && (
          <div className="blog-search-progress-bar" aria-hidden="true" />
        )}
        {query ? (
          <button
            type="button"
            onClick={handleClear}
            className="blog-search-clear-btn"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        ) : (
          <kbd className="blog-search-kbd" aria-hidden="true">
            /
          </kbd>
        )}
      </div>
    </form>
  );
}
