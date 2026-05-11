// AMS Service Worker — scoped to /attendance-management-system/
// Strategy: NetworkFirst for HTML, cache-first for static assets, only within AMS.
const VERSION = "ams-v1";
const HTML_CACHE = `ams-html-${VERSION}`;
const ASSET_CACHE = `ams-assets-${VERSION}`;
const AMS_PREFIX = "/attendance-management-system";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("ams-") && !n.endsWith(VERSION))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isAmsPath = url.pathname.startsWith(AMS_PREFIX);
  const isAmsAsset =
    url.pathname.startsWith("/ams-icon-") ||
    url.pathname === "/ams-manifest.webmanifest";

  if (!isAmsPath && !isAmsAsset) return; // ignore everything else

  // HTML navigations: NetworkFirst
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(HTML_CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(HTML_CACHE);
          const cached = await cache.match(req);
          return (
            cached ||
            new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } })
          );
        }
      })()
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
