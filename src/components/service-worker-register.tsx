import { useEffect } from "react";

/**
 * Registers /sw.js once the page is interactive. SW only does offline
 * fallback (see public/sw.js); it does not cache app shell or API responses,
 * so there's no risk of serving stale routes after a deploy.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Skip on localhost dev to avoid HMR conflicts.
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Best-effort; nothing depends on SW success.
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
