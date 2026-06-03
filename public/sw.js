// 365 MotorSales — minimal offline-fallback service worker.
// VERSION is derived from the ?v= query string on the registration URL
// (set in src/components/service-worker-register.tsx using the Vite-injected
// __BUILD_ID__). When the build id changes, the browser fetches a new SW URL,
// install fires, and the old cache is dropped on activate.

const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
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
