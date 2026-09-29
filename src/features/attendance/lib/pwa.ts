// Guarded service worker registration for AMS.
// Skips: SSR, iframes, Lovable preview hosts, non-secure contexts.
export function registerAmsServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  // Don't run inside iframes (e.g. Lovable editor preview)
  try {
    if (window.self !== window.top) return;
  } catch {
    return;
  }

  const host = window.location.hostname;
  const isPreview =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host === "localhost" ||
    host === "127.0.0.1";
  if (isPreview) return;

  if (!window.isSecureContext) return;

  navigator.serviceWorker
    .register("/ams-sw.js", { scope: "/attendance-management-system/" })
    .catch(() => {
      /* silent */
    });
}

export function unregisterAmsServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => {
      if (r.scope.includes("/attendance-management-system/")) r.unregister();
    });
  });
}
