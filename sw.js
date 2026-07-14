// DOER Service Worker — network-first for HTML/JS with offline cache fallback,
// cache-first for static assets, passthrough for cross-origin (Supabase, etc.)
const VERSION = 'doer-v0605-124';
const PRECACHE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png', 'penguin.png', 'penguin-walk.png', 'penguin-curls.png', 'penguin-idle.png', 'penguin-idle-night.png', 'penguin-walk-night.png', 'penguin-carrot.png', 'penguin-carrot-night.png', 'penguin-curls-night.png', 'penguin-box-night.png', 'penguin-box.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin || e.request.method !== 'GET') return; // Supabase etc: passthrough, no caching

  const isDoc = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname === '/' || url.pathname.endsWith('/DOER/') || url.pathname.endsWith('/DOER');

  if (isDoc) {
    // network-first, refresh cache on success, cache fallback when offline
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() =>
        caches.match(e.request).then((hit) => hit || caches.match('index.html'))
      )
    );
  } else {
    // static assets (icons, manifest): cache-first, then network + cache
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }))
    );
  }
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
