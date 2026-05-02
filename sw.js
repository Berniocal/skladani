// sw.js — Skládání slov PWA offline
const CACHE_NAME = 'skladani-slov-v6';

const ASSETS = [
  './',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/wood-texture.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // sw.js nikdy neber z cache
  if (url.pathname.endsWith('/sw.js')) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  // HTML / navigace: vždy zkus síť, cache jen jako záloha
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Ostatní soubory: cache first
  if (sameOrigin) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;

        return fetch(req).then(res => {
          if (!res || res.status !== 200) return res;

          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));

          return res;
        });
      })
    );
  }
});
