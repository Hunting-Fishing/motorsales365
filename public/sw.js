// 365 MotorSales — service-worker cleanup.
//
// The app only needs home-screen installability, not offline app-shell caching.
// Returning mobile/PWA users can otherwise stay on an older published bundle,
// so this replacement worker removes the old app caches and unregisters itself.

function isAppCache(name) {
  const ownOfflineCache = name === "offline" || name.startsWith("offline-");
  const ownWorkboxCache = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
  return ownOfflineCache || (ownWorkboxCache && name.endsWith(self.registration.scope));
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.allSettled(cacheNames.filter(isAppCache).map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  );
});
