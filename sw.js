// DOER Service Worker — network-first for HTML/JS, passthrough for cross-origin (Supabase, etc.)
const VERSION = 'doer-v0605-43';

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
  const sameOrigin = url.origin === self.location.origin;

  // Cross-origin requests (Supabase API, fonts CDN, etc.) — passthrough, NO caching
  if (!sameOrigin) {
    return;
  }

  // Same-origin: network-first for HTML/JS
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname === '/' || url.pathname.endsWith('/DOER/') || url.pathname.endsWith('/DOER')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request))
    );
  }
  // Else: don't intercept
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
