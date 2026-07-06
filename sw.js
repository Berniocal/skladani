// sw.js - Skladani slov PWA offline
const CACHE_NAME = 'skladani-slov-v18';
const APP_SHELL = './index.html';

const ASSETS = [
  './',
  APP_SHELL,
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

  // HTML / navigace: vzdy zkus sit, cache jen jako zaloha
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(APP_SHELL, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(APP_SHELL) || await caches.match('./');
          return cached || new Response('Aplikace neni dostupna offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Ostatni soubory: cache first
  if (sameOrigin) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then(cached => {
        if (cached) return cached;

        return fetch(req).then(res => {
          if (!res || res.status !== 200) return res;

          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));

          return res;
        }).catch(() => cached);
      })
    );
  }
});
