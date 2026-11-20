const CACHE_NAME = 'masa-oyunlari-v3-2';
const CORE_ASSETS = [
  './',
  './index.html',
  './index.css',
  './okey-101.html',
  './tavla.html',
  './pis-yedili.html',
  './business-tour.html',
  './three.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        CORE_ASSETS.map((url) =>
          fetch(url, { cache: 'no-store' })
            .then((res) => {
              if (res && res.ok) {
                return cache.put(url, res.clone());
              }
              return null;
            })
            .catch(() => null)
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // version.json her zaman doğrudan ağdan çekilir (asla önbelleğe alınmaz)
  if (url.pathname.endsWith('/version.json') || url.pathname === 'version.json') {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(
        () =>
          new Response(JSON.stringify({ offline: true }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
      )
    );
    return;
  }

  // Network-First: İnternet varken güncel sürümü ağdan çekip önbelleği yenile; internet yokken önbellekten aç
  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((networkRes) => {
        if (networkRes && networkRes.ok && networkRes.type === 'basic') {
          const copy = networkRes.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(req, copy))
            .catch(() => {});
        }
        return networkRes;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        })
      )
  );
});
