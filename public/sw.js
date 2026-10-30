// Service Worker for Gourab Mondal Portfolio
// Provides minimal offline caching for static shell, favicons, and core assets with Network-First strategy.

const CACHE_NAME = "portfolio-cache-v4";

const PRECACHE_ASSETS = [
  "/",
  "/favicon.ico",
  "/icons8-favicon-windows-11-filled-32.png",
  "/icons8-favicon-windows-11-filled-72.png",
  "/icons8-favicon-windows-11-filled-70.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/llms.txt",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await Promise.allSettled(
          PRECACHE_ASSETS.map(async (url) => {
            try {
              const res = await fetch(url);
              if (res.ok) {
                await cache.put(url, res);
              }
            } catch (err) {
              console.warn(`[SW] Precache failed for ${url}:`, err);
            }
          })
        );
      })
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

  // Only intercept same-origin requests. Third-party assets (such as ImageKit CDN,
  // Google Analytics, GitHub avatars) must bypass the Service Worker so the browser
  // handles them natively under the document CSP (e.g. img-src) without worker CSP restrictions.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Never cache API routes, Studio routes, Blog routes, or Google Analytics telemetry
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/studio") ||
    url.pathname.startsWith("/blog") ||
    url.hostname.includes("google-analytics") ||
    url.hostname.includes("googletagmanager")
  ) {
    return;
  }

  // Never intercept Next.js App Router RSC (React Server Component) soft-navigation or prefetch requests.
  // Letting the browser handle these directly ensures that streaming component trees never hang or clash with HTML cache entries.
  if (
    req.headers.get("RSC") === "1" ||
    req.headers.has("Next-Router-State-Tree") ||
    req.headers.has("Next-Router-Prefetch") ||
    url.searchParams.has("_rsc")
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages): Network-First with Cache Fallback (for root shell)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && url.pathname === "/") {
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

  // 2. Static Assets (JS, CSS, images, fonts under _next/static or file extensions): Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:css|js|mjs|woff2?|ttf|eot|png|jpe?g|gif|svg|ico|webp|webmanifest)$/i.test(
      url.pathname
    );

  if (!isStaticAsset) {
    return;
  }

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
        .catch(
          () =>
            cachedResponse ||
            new Response("", { status: 504, statusText: "Gateway Timeout" })
        );

      return cachedResponse || fetchPromise;
    })
  );
});
