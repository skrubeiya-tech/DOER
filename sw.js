// DOER Service Worker — network-first, always fetches latest HTML
const VERSION = 'doer-v' + Date.now();

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Always network-first for HTML/JS to ensure latest code
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname === '/' || url.pathname.endsWith('/DOER/') || url.pathname.endsWith('/DOER')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then((res) => {
          // Update cache in background
          const resClone = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, resClone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Other assets: cache-first with network fallback
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
        const resClone = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, resClone)).catch(() => {});
        return res;
      }))
    );
  }
});

// Listen for skip-waiting message from clients
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
