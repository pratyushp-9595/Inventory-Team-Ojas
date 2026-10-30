// ============================================================
//  SERVICE WORKER — Team Ojas Racing PWA
// ============================================================

const CACHE_NAME = 'ojas-cache-v3';

// Core assets to pre-cache on service worker installation
const CORE_ASSETS = [
  './',
  'index.html',
  'dashboard.html',
  'inventory.html',
  'docs.html',
  'handbook.html',
  'restocking.html',
  'team.html',
  'shared.css',
  'handbook.css',
  'config.js',
  'supabase-config.js',
  'handbook.js',
  'logo.jpg',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// ── 1. Install Event: Cache Core Static Files ───────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core application assets...');
      // Using cache.addAll with individual error tolerance
      return Promise.allSettled(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to cache: ${url}`, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── 2. Activate Event: Clean Up Outdated Caches ──────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ── 3. Fetch Event: Serve from Cache, Fallback to Network ───
self.addEventListener('fetch', (event) => {
  // Only handle GET requests; skip non-HTTP schemes and mutation calls
  if (event.request.method !== 'GET') return;

  // Let real-time external Supabase API / Storage requests go straight to network
  const requestUrl = new URL(event.request.url);
  if (requestUrl.hostname.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. If resource is in cache, serve immediately
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Otherwise fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          // Cache successful same-origin responses dynamically
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // 3. Fallback when completely offline
          if (event.request.mode === 'navigate') {
            return caches.match('index.html') || caches.match('inventory.html');
          }
        });
    })
  );
});
