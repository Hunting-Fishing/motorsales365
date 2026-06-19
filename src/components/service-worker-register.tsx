import { useEffect } from "react";

declare const __BUILD_ID__: string;

/**
 * Registers /sw.js once the page is interactive. The build id is appended
 * as a query string so each deploy installs a fresh service worker (the
 * SW reads ?v= and uses it as its cache name — see public/sw.js).
 *
 * To guarantee every visitor (signed-in or anonymous) lands on the latest
 * deploy, we:
 *  1. Force the registration to re-check the SW script on every mount
 *     (`registration.update()`), and again every 60s while the tab is open.
 *  2. Auto-reload the page exactly once when a new SW takes control
 *     (`controllerchange`), so users never sit on stale JS/HTML after a
 *     publish.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;

    const buildId = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
    let reloaded = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const handleControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    const onLoad = async () => {
      try {
        const reg = await navigator.serviceWorker.register(`/sw.js?v=${buildId}`);
        // Check for an updated SW now and every 60s thereafter.
        reg.update().catch(() => {});
        intervalId = setInterval(() => {
          reg.update().catch(() => {});
        }, 60_000);
      } catch {
        // Best-effort; nothing depends on SW success.
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("load", onLoad);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);
  return null;
}
