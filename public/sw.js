// Kill-switch service worker.
// Clears any caches left by a previous SW, navigates open clients to a fresh
// URL, then unregisters itself. Keep this file in place for at least one
// release cycle so old installs have a chance to pick it up.
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      await self.clients.claim();
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      await Promise.all(
        clients.map((c) => {
          const url = new URL(c.url);
          url.searchParams.set("sw-cleanup", Date.now().toString());
          return c.navigate(url.toString());
        }),
      );
      await self.registration.unregister();
    })(),
  ),
);
self.addEventListener("fetch", () => {
  // Pass-through: do not intercept any requests.
});
