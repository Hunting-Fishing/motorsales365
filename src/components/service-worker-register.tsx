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

    const buildId = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
    const buildStorageKey = "365ms:last-build-id";
    const reloadStorageKey = `365ms:reloaded-for-build:${buildId}`;
    const cleanupStorageKey = `365ms:cleanup-sw-installed:${buildId}`;
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
    const hasServiceWorker = "serviceWorker" in navigator;

    const getStorage = (storage: Storage, key: string) => {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    };

    const setStorage = (storage: Storage, key: string, value: string) => {
      try {
        storage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    };

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
      name.toLowerCase().includes("workbox") ||
      name.toLowerCase().includes("precache") ||
      /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);

    const cleanup = async () => {
      if (hasServiceWorker) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.allSettled(
            registrations
              .filter(isAppSw)
              .map(async (reg) => {
                try {
                  await reg.update();
                } catch {
                  // Ignore update failures; unregister still removes stale control.
                }
                await reg.unregister();
              }),
          );
        } catch {
          // Best-effort; the page still works if cleanup is blocked.
        }
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

    const installCleanupWorker = async () => {
      if (!hasServiceWorker || !shouldAutoReloadForNewBuild) return false;
      if (getStorage(window.localStorage, cleanupStorageKey)) return false;
      if (!setStorage(window.localStorage, cleanupStorageKey, "1")) return false;

      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        try {
          await reg.update();
        } catch {
          // The install/activate path is enough; update is just extra pressure.
        }
        return true;
      } catch {
        return false;
      }
    };

    void (async () => {
      await cleanup();

      const cleanupWorkerInstalled = await installCleanupWorker();
      if (cleanupWorkerInstalled) return;

      if (!shouldAutoReloadForNewBuild) return;

      try {
        const previousBuildId = getStorage(window.localStorage, buildStorageKey);
        setStorage(window.localStorage, buildStorageKey, buildId);
        if (previousBuildId && previousBuildId !== buildId && !getStorage(window.sessionStorage, reloadStorageKey)) {
          setStorage(window.sessionStorage, reloadStorageKey, "1");
          window.location.reload();
        }
      } catch {
        // Storage can be disabled. Cleanup above is enough in that case.
      }
    })();
  }, []);
  return null;
}
