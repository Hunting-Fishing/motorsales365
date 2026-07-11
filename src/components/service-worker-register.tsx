import { useEffect } from "react";

declare const __BUILD_ID__: string;

/**
 * Keeps published mobile/PWA users on the newest app build.
 *
 * 365 MotorSales uses manifest-only installability. We intentionally clean up
 * old app-shell service workers/caches so a returned phone user cannot stay on
 * a stale QR-code screen after a publish.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const buildId = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
    const buildStorageKey = "365ms:last-build-id";
    const reloadStorageKey = `365ms:reloaded-for-build:${buildId}`;
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    const isPreviewHost =
      hostname.startsWith("id-preview--") ||
      hostname.startsWith("preview--") ||
      hostname === "lovableproject.com" ||
      hostname.endsWith(".lovableproject.com") ||
      hostname === "lovableproject-dev.com" ||
      hostname.endsWith(".lovableproject-dev.com") ||
      hostname === "beta.lovable.dev" ||
      hostname.endsWith(".beta.lovable.dev");
    const shouldAutoReloadForNewBuild = !isLocalhost && !isPreviewHost;

    const isAppSw = (reg: ServiceWorkerRegistration) => {
      try {
        const scriptUrl =
          reg.active?.scriptURL ?? reg.waiting?.scriptURL ?? reg.installing?.scriptURL ?? "";
        return new URL(scriptUrl).pathname === "/sw.js";
      } catch {
        return false;
      }
    };

    const isAppCache = (name: string) =>
      name === "offline" ||
      name.startsWith("offline-") ||
      /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);

    const cleanup = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.allSettled(registrations.filter(isAppSw).map((reg) => reg.unregister()));
      } catch {
        // Best-effort; the page still works if cleanup is blocked.
      }

      try {
        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.allSettled(cacheNames.filter(isAppCache).map((name) => caches.delete(name)));
        }
      } catch {
        // Best-effort; cache deletion can be unavailable in private mode.
      }
    };

    void cleanup();

    if (!shouldAutoReloadForNewBuild) return;

    try {
      const previousBuildId = window.localStorage.getItem(buildStorageKey);
      window.localStorage.setItem(buildStorageKey, buildId);
      if (previousBuildId && previousBuildId !== buildId && !window.sessionStorage.getItem(reloadStorageKey)) {
        window.sessionStorage.setItem(reloadStorageKey, "1");
        window.location.reload();
      }
    } catch {
      // Storage can be disabled. Cleanup above is enough in that case.
    }

  }, []);
  return null;
}
