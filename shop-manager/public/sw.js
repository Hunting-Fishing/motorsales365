// Service Worker for PWA functionality
const STATIC_CACHE_NAME = 'order-master-static-v2';
const RUNTIME_CACHE_NAME = 'order-master-runtime-v2';

// Files to cache for offline functionality
const STATIC_ASSETS = ['/', '/offline.html', '/manifest.json'];

const isBypassRequest = (request) => {
  if (request.method !== 'GET') return true;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return true;
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) return true;

  // Avoid stale-bundle white screens by never caching scripts/styles/fonts/workers.
  if (['script', 'style', 'font', 'worker'].includes(request.destination)) return true;
  if (url.pathname.startsWith('/@vite')) return true;

  return false;
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE_NAME);
    await Promise.all(STATIC_ASSETS.map(async (asset) => {
      try {
        await cache.add(asset);
      } catch (error) {
        console.warn('Service Worker: Failed to cache static asset', asset, error);
      }
    }));
    await self.skipWaiting();
  })());
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((cacheName) => {
        if (cacheName !== STATIC_CACHE_NAME && cacheName !== RUNTIME_CACHE_NAME) {
          return caches.delete(cacheName);
        }
      })
    );
    await self.clients.claim();
  })());
});

// Fetch event - network-first for page navigations, stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (isBypassRequest(request)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const cache = await caches.open(RUNTIME_CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;

        const appShell = await caches.match('/');
        if (appShell) return appShell;

        const offlinePage = await caches.match('/offline.html');
        if (offlinePage) return offlinePage;

        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      fetch(request)
        .then(async (networkResponse) => {
          if (!networkResponse.ok) return;
          const cache = await caches.open(RUNTIME_CACHE_NAME);
          cache.put(request, networkResponse.clone());
        })
        .catch(() => {});
      return cachedResponse;
    }

    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(RUNTIME_CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch {
      return new Response('Offline content not available', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    }
  })());
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');
  
  if (event.tag === 'sync-work-orders') {
    event.waitUntil(syncWorkOrders());
  }
  
  if (event.tag === 'sync-inventory') {
    event.waitUntil(syncInventory());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Order Master',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Order Master', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
    // Broadcast update available message
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'SW_UPDATE_AVAILABLE'
        });
      });
    });
  }
});

// Background sync functions
async function syncWorkOrders() {
  try {
    console.log('Service Worker: Syncing work orders...');
    // Get offline work orders from IndexedDB
    const offlineData = await getOfflineWorkOrders();
    
    if (offlineData.length > 0) {
      // Sync with server
      await Promise.all(offlineData.map(syncSingleWorkOrder));
      console.log('Service Worker: Work orders synced successfully');
    }
  } catch (error) {
    console.error('Service Worker: Error syncing work orders:', error);
  }
}

async function syncInventory() {
  try {
    console.log('Service Worker: Syncing inventory...');
    // Get offline inventory updates from IndexedDB
    const offlineUpdates = await getOfflineInventoryUpdates();
    
    if (offlineUpdates.length > 0) {
      // Sync with server
      await Promise.all(offlineUpdates.map(syncSingleInventoryUpdate));
      console.log('Service Worker: Inventory synced successfully');
    }
  } catch (error) {
    console.error('Service Worker: Error syncing inventory:', error);
  }
}

// Placeholder functions for IndexedDB operations
async function getOfflineWorkOrders() {
  // Implementation would use IndexedDB to get offline work orders
  return [];
}

async function getOfflineInventoryUpdates() {
  // Implementation would use IndexedDB to get offline inventory updates
  return [];
}

async function syncSingleWorkOrder(workOrder) {
  // Implementation would sync a single work order with the server
  console.log('Syncing work order:', workOrder.id);
}

async function syncSingleInventoryUpdate(update) {
  // Implementation would sync a single inventory update with the server
  console.log('Syncing inventory update:', update.id);
}