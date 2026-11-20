const CACHE_NAME = 'masa-oyunlari-v4-1';
const CORE_ASSETS = [
  './',
  './index.html',
  './index.css',
  './okey-101.html',
  './tavla.html',
  './pis-yedili.html',
  './business-tour.html',
  './three.min.js',
  './icon.svg',
];

let swKnownVersion = null;
let swLastNotifiedVersion = null;
let swNotificationsEnabled = true;
let swPollTimer = null;

async function checkVersionInSW() {
  try {
    const res = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res || !res.ok) return null;
    const data = await res.json();
    if (!data || !data.version) return null;

    const remoteVersion = String(data.version).trim();
    const message = data.message || 'Yeni sürüm hazır, dokunarak güncelleyin.';

    if (!swKnownVersion) {
      swKnownVersion = remoteVersion;
      return data;
    }

    if (swKnownVersion !== remoteVersion && swLastNotifiedVersion !== remoteVersion) {
      swLastNotifiedVersion = remoteVersion;

      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      let hasFocusedClient = false;
      for (const client of windowClients) {
        if (client.focused || client.visibilityState === 'visible') {
          hasFocusedClient = true;
        }
        client.postMessage({
          type: 'NEW_VERSION_AVAILABLE',
          version: remoteVersion,
          message,
        });
      }

      if (
        !hasFocusedClient &&
        swNotificationsEnabled &&
        typeof self.Notification !== 'undefined' &&
        self.Notification.permission === 'granted' &&
        self.registration &&
        typeof self.registration.showNotification === 'function'
      ) {
        await self.registration.showNotification('Masa Oyunları 3D Güncellendi!', {
          body: message,
          icon: './icon.svg',
          badge: './icon.svg',
          vibrate: [200, 100, 200],
          tag: 'masa-oyunlari-ota-' + remoteVersion,
          data: { version: remoteVersion, url: './index.html?ota_update=1' },
        });
      }
    }

    return data;
  } catch (_) {
    return null;
  }
}

function startSwVersionPolling() {
  if (swPollTimer) return;
  swPollTimer = setInterval(() => {
    checkVersionInSW();
  }, 60 * 1000);
}

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
      .then(() => {
        startSwVersionPolling();
        return checkVersionInSW();
      })
  );
});

self.addEventListener('message', (event) => {
  const payload = event.data;
  if (!payload || typeof payload !== 'object') return;

  if (payload.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (payload.type === 'SYNC_OTA_STATE') {
    if (payload.currentVersion) {
      swKnownVersion = String(payload.currentVersion).trim();
    }
    if (payload.lastNotifiedVersion) {
      swLastNotifiedVersion = String(payload.lastNotifiedVersion).trim();
    }
    if (typeof payload.notificationsEnabled === 'boolean') {
      swNotificationsEnabled = payload.notificationsEnabled;
    }
    startSwVersionPolling();
    return;
  }

  if (payload.type === 'CHECK_VERSION') {
    if (payload.currentVersion) {
      swKnownVersion = String(payload.currentVersion).trim();
    }
    if (typeof payload.notificationsEnabled === 'boolean') {
      swNotificationsEnabled = payload.notificationsEnabled;
    }
    startSwVersionPolling();
    event.waitUntil(checkVersionInSW());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = (event.notification && event.notification.data) || {};
  const targetUrl = notifData.url || './index.html?ota_update=1';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && client.url.indexOf('index.html') !== -1 && 'focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_UPDATE_CLICKED',
              version: notifData.version || null,
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return null;
      })
  );
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
