"use client";

import { useServerInsertedHTML } from "next/navigation";

// Development filter for React 19 script false-positives
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    origError.apply(console, args);
  };
}

const themeScript = `(function(){try{var s=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=s?s==='dark':d;if(dark){document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`;

export default function ThemeInitScript() {
  useServerInsertedHTML(() => (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
    />
  ));

  // Returns null on the client so React 19 client reconciler never sees a script element
  return null;
}
