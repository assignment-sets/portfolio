"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

function syncThemeColorMeta(theme: "light" | "dark") {
  const color = theme === "dark" ? "#161616" : "#f4f4f0";
  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]:not([media])'
  );
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
}

export default function ThemeToggle() {
  useEffect(() => {
    // 1. Sync on mount from localStorage or system preference
    const saved = localStorage.getItem("theme");
    const initialTheme: "light" | "dark" =
      saved === "dark" || saved === "light"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    document.documentElement.setAttribute("data-theme", initialTheme);
    syncThemeColorMeta(initialTheme);

    // 2. Listen to system preference changes if no manual override
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        const isDark = e.matches;
        const theme = isDark ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", theme);
        syncThemeColorMeta(theme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    // 3. Sync theme across multiple tabs in real-time (including localStorage.clear())
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "theme") {
        const newTheme = e.newValue;
        if (newTheme === "light" || newTheme === "dark") {
          document.documentElement.setAttribute("data-theme", newTheme);
          syncThemeColorMeta(newTheme);
        } else if (!newTheme) {
          const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          const fallback = isDark ? "dark" : "light";
          document.documentElement.setAttribute("data-theme", fallback);
          syncThemeColorMeta(fallback);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme: "light" | "dark" = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    syncThemeColorMeta(nextTheme);
    trackEvent("theme_toggle", { new_theme: nextTheme });
  };

  return (
    <button
      className="theme-btn"
      id="theme-toggle"
      aria-label="Toggle theme"
      data-tooltip="Toggle theme"
      onClick={toggleTheme}
      type="button"
    >
      <span id="theme-icon">☀</span>
    </button>
  );
}
