// Force immediate cache invalidation and unregister
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

// Always bypass cache and fetch directly from server
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
