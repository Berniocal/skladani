// sw.js — Slovní kostky PWA offline
// ↑ při každé úpravě SW ZVYŠ cache name -> vynutí se update
const CACHE_NAME = 'skladani-slov-v4-2025-12-30';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',

  // Ikony PWA
  './icons/icon-192.png',
  './icons/icon-512.png',

  // Textura dřeva (ujisti se, že název sedí!)
  './icons/wood-texture.jpg'
];

// Instalace: precache základní shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // nový SW se hned aktivuje
});

// Aktivace: smaž staré cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategie:
// - navigace (HTML stránky) -> vždy vrať index.html (SPA)
// - stejné origin assety -> cache-first + doplnění
// - cizí origin -> network-first bez ukládání
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigace (kliknutí na link / refresh) – vrať shell
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (sameOrigin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;

        return fetch(req)
          .then((res) => {
            // cacheuj jen OK odpovědi
            if (!res || res.status !== 200) return res;

            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => caches.match('./index.html'));
      })
    );
  } else {
    event.respondWith(
      fetch(req).catch(() => new Response('', { status: 204 }))
    );
  }
});
