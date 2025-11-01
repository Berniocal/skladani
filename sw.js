// sw.js — Ámos PWA offline
// ↑ při každé úpravě SW ZVYŠ cache name -> vynutí se update
const CACHE_NAME = 'amos-v3-2025-10-30';

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
  // Pokud máš jiný název (např. wood-texture-from-icon.jpg), změň cestu.
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
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Fetch strategie:
// - stejný origin -> cache-first s doplňováním (funguje offline)
// - cizí origin (např. iframe s pravidly) -> síť-first, bez ukládání
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          // ulož do runtime cache
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return res;
        }).catch(() => {
          // offline fallback: vrať index (SPA)
          return caches.match('./index.html');
        });
      })
    );
  } else {
    // cizí domény – třeba pravidla v iframu
    event.respondWith(
      fetch(req).catch(() => {
        // bez internetu iframe nebude – appka ale poběží dál
        return new Response('', { status: 204 });
      })
    );
  }
});