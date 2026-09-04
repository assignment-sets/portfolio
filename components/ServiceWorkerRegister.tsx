"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Register Service Worker in production to enable offline caching
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.debug("[SW] Registered successfully:", reg.scope);
          })
          .catch((err) => {
            console.debug("[SW] Registration failed:", err);
          });
      }
    }
  }, []);

  return null;
}
