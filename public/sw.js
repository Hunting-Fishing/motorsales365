// 365 MotorSales — minimal offline-fallback service worker.
// Strategy: network-first for navigations (so users always see fresh content
// when online), with a cached offline page as the fallback. Static assets are
// served by Cloudflare's edge cache already; we don't precache the app shell
// because it changes every deploy.
//
// VERSION is replaced at build time by the Vite define plugin (__SW_VERSION__).
// When this string differs from the previously-activated SW, all old caches
// are dropped on activate so stale offline pages never linger across deploys.

const VERSION = (typeof __SW_VERSION__ !== "undefined" && __SW_VERSION__) || "dev";
const OFFLINE_CACHE = `offline-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
      // Surface the active version to any listening clients (devtools).
      // eslint-disable-next-line no-console
      console.info(`[sw] active version: ${VERSION}`);
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(OFFLINE_CACHE);
        const cached = await cache.match(OFFLINE_URL);
        return cached ?? new Response("Offline", { status: 503 });
      }
    })(),
  );
});
