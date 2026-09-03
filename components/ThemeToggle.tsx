"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function ThemeToggle() {
  useEffect(() => {
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
    return () => mediaQuery.removeEventListener("change", handleChange);
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
