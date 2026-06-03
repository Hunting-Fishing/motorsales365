import { useEffect } from "react";

declare const __BUILD_ID__: string;

/**
 * Registers /sw.js once the page is interactive. The build id is appended
 * as a query string so each deploy installs a fresh service worker (the
 * SW reads ?v= and uses it as its cache name — see public/sw.js).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
    const buildId = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
    const onLoad = () => {
      navigator.serviceWorker.register(`/sw.js?v=${buildId}`).catch(() => {
        // Best-effort; nothing depends on SW success.
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
