// =============================================================================
// sw.js — Service Worker · TDAH.GG
// Cache-first para assets locais, network-first para API da Riot
// =============================================================================

const SW_VERSION   = 'tdahgg-v1';
const STATIC_CACHE = `${SW_VERSION}-static`;
const IMG_CACHE    = `${SW_VERSION}-images`;

// Assets locais que queremos no cache na instalação
const PRECACHE = [
  '/arena/',
  '/arena/index.html',
  '/arena/js/app.min.js',
  '/arena/js/champions.min.js',
  '/arena/js/storage.min.js',
  '/arena/css/style.min.css',
];

// ---- Install: pré-cacheia os assets locais ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ---- Activate: remove caches antigos ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('tdahgg-') && k !== STATIC_CACHE && k !== IMG_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ---- Fetch: estratégia por tipo de recurso ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. API da Riot (versions.json, champion.json) → Network-first, sem cache no SW
  //    (o cache já está no localStorage via champions.js)
  if (url.hostname === 'ddragon.leagueoflegends.com' && !url.pathname.includes('/img/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Imagens da Riot CDN → Cache-first com cache dedicado (30 dias)
  if (url.hostname === 'ddragon.leagueoflegends.com' && url.pathname.includes('/img/')) {
    event.respondWith(
      caches.open(IMG_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached); // offline: retorna do cache mesmo expirado
        })
      )
    );
    return;
  }

  // 3. Google Fonts → Cache-first
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // 4. Assets locais (.js, .css, index.html) → Cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
