const CACHE_NAME = 'mind-mood-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.jpg'
];

// Installation: Cache initial core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activation: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetching: Cache-first strategy for static assets, network-first fallback for navigation
self.addEventListener('fetch', (event) => {
  // We only intercept standard GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Do not intercept hot updates, WebSockets, or backend /api calls
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/@') || 
    url.pathname.includes('hot-update') ||
    url.pathname.includes('vite') ||
    url.pathname.includes('websocket')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Keep dynamic styles, scripts and images cached for resilience
          const isStaticAsset = 
            event.request.destination === 'script' || 
            event.request.destination === 'style' || 
            event.request.destination === 'image' ||
            event.request.destination === 'font';

          if (networkResponse.status === 200 && isStaticAsset) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails completely and user is navigates, serve SPA shell '/'
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});
