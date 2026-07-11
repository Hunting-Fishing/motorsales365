// 365 MotorSales — one-release service-worker cleanup.
//
// The app uses manifest-only installability. This same-path replacement worker
// lets returning phones/PWAs that previously installed an offline app-shell
// worker clear the old app caches, reload to the network, then unregister.

function isAppShellCache(name) {
  const lower = name.toLowerCase();
  return (
    name === "offline" ||
    name.startsWith("offline-") ||
    lower.includes("workbox") ||
    lower.includes("precache") ||
    /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleanalytics-/.test(lower)
  );
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.allSettled(cacheNames.filter(isAppShellCache).map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  );
});
