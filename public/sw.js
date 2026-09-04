// Service Worker for Gourab Mondal Portfolio
// Provides offline caching for static shell, fonts, and assets with Network-First strategy.

const CACHE_NAME = "portfolio-cache-v1";

const PRECACHE_ASSETS = [
  "/",
  "/favicon.ico",
  "/icons8-favicon-windows-11-filled-32.png",
  "/icons8-favicon-windows-11-filled-72.png",
  "/icons8-favicon-windows-11-filled-70.png",
  "/llms.txt",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== "GET") return;

  // Never cache API routes or Google Analytics telemetry
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("google-analytics") ||
    url.hostname.includes("googletagmanager")
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages): Network-First with Cache Fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const rootCached = await caches.match("/");
          if (rootCached) return rootCached;
          return new Response(
            "Offline: Unable to load page. Please reconnect to the internet.",
            {
              headers: { "Content-Type": "text/plain" },
            }
          );
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, images, fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
