const CACHE_VERSION = 'v2';
const CACHE_NAME = `geopinner-${CACHE_VERSION}`;

// Resources to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/pin_user.png',
  '/pin_place.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// CDN resources to cache on first use
const CDN_CACHE_NAME = `geopinner-cdn-${CACHE_VERSION}`;
const CDN_URLS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Map tiles cache
const TILES_CACHE_NAME = 'geopinner-tiles';

// Install event - precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching app shell');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME &&
              cacheName !== CDN_CACHE_NAME &&
              cacheName !== TILES_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle http/https requests, ignore chrome-extension and other schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle map tiles - network first, cache fallback
  if (url.hostname.includes('cartocdn.com') || url.pathname.includes('.png') && url.hostname.includes('tiles')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(TILES_CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Handle CDN resources - cache first for CDN, network fallback
  if (url.hostname.includes('unpkg.com')) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          const responseToCache = response.clone();
          caches.open(CDN_CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
    );
    return;
  }

  // Handle app resources - network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache JavaScript and CSS files from the build
        if (request.destination === 'script' ||
            request.destination === 'style' ||
            request.url.includes('/assets/')) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If both cache and network fail, return offline page for documents
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
          // For other resources, throw error to let browser handle it
          throw new Error('Network request failed and no cache available');
        });
      })
  );
});
