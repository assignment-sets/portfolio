"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function ThemeToggle() {
  useEffect(() => {
    // 1. Sync on mount from localStorage or system preference
    const saved = localStorage.getItem("theme");
    if (saved) {
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    }

    // 2. Listen to system preference changes if no manual override
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        const isDark = e.matches;
        document.documentElement.setAttribute(
          "data-theme",
          isDark ? "dark" : "light"
        );
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    // 3. Sync theme across multiple tabs in real-time
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "theme") {
        const newTheme = e.newValue;
        if (newTheme === "light" || newTheme === "dark") {
          document.documentElement.setAttribute("data-theme", newTheme);
        } else if (!newTheme) {
          const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          document.documentElement.setAttribute(
            "data-theme",
            isDark ? "dark" : "light"
          );
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
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
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
