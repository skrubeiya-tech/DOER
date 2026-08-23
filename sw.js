// DOER Service Worker — network-first for HTML/JS with offline cache fallback,
// cache-first for static assets, passthrough for cross-origin (Supabase, etc.)
const VERSION = 'doer-v0605-330';
const ASSETCACHE = 'doer-cdn-assets-v1'; // fonts + CDN libs: cache-first, survives version bumps
const PRECACHE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png', 'penguin.png', 'penguin-walk.png', 'penguin-curls.png', 'penguin-idle.png', 'penguin-idle-night.png', 'penguin-walk-night.png', 'penguin-carrot.png', 'penguin-carrot-night.png', 'penguin-curls-night.png', 'penguin-box-night.png', 'penguin-box.png'];

const CDN_PRECACHE = [
  'https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Cinzel:wght@400;600&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil(Promise.all([
    caches.open(VERSION).then((c) => c.addAll(PRECACHE)).catch(() => {}),
    caches.open(ASSETCACHE).then((c) => Promise.all(CDN_PRECACHE.map((u) =>
      c.match(u).then((hit) => hit || fetch(u).then((r) => { if (r && r.ok) return c.put(u, r); }).catch(() => {}))
    ))).catch(() => {})
  ]));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION && k !== ASSETCACHE && k !== 'doer-moment-imgs').map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;

  // moment photos: signed URLs change their token every fetch, so cache by PATH —
  // each photo downloads once per device, ever (moments are immutable)
  if (e.request.method === 'GET' && url.host.endsWith('supabase.co') && url.pathname.startsWith('/storage/v1/object/sign/moments/')) {
    e.respondWith(
      caches.open('doer-moment-imgs').then((c) =>
        c.match(url.pathname).then((hit) => hit || fetch(e.request).then((res) => {
          if (res && res.ok) c.put(url.pathname, res.clone()).catch(() => {});
          return res;
        }))
      ).catch(() => fetch(e.request))
    );
    return;
  }

  // fonts + CDN libraries: cache-first in a persistent cache, so one good load
  // means they never fail again (a flaky fetch used to swap the whole app's serif)
  const isCdnAsset = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com' || url.host === 'cdn.jsdelivr.net' || url.host === 'unpkg.com';
  if (e.request.method === 'GET' && isCdnAsset) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(ASSETCACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })).catch(() => fetch(e.request))
    );
    return;
  }

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
