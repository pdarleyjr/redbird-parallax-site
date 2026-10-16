/**
 * Red Bird Holiday Trail - Service Worker
 * 
 * This service worker enables offline functionality by caching essential assets.
 * It follows a cache-first strategy for cached resources and network-first for others.
 * 
 * HOW TO UPDATE:
 * 1. When you make changes to cached files, increment the CACHE_VERSION number below
 * 2. Update the assetsToCache array if you add/remove files
 * 3. The service worker will automatically clean up old caches on activation
 */

// Cache version - increment this when you update cached files
const CACHE_VERSION = 'rbht-v4-20251217';
const CACHE_NAME = `red-bird-holiday-trail-${CACHE_VERSION}`;

// List of assets to cache for offline use
// IMPORTANT: Keep this list updated when adding new files
const assetsToCache = [
  './',
  './index.html',
  './styles.css?v=20251217-3',
  './script.js?v=20251217-3',
  './manifest.json',
  './assets/images/red_bird_holiday_trail.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  '/assets/images/fox_large.jpg',
  '/assets/images/fox_small.jpg',
  '/assets/images/gingerbreadhouse_new_large.jpg',
  '/assets/images/gingerbreadhouse_new_small.jpg',
  '/assets/images/holiday-trail-map-2025.png',
  // Google Fonts will be cached at runtime if accessed
];

/**
 * INSTALL EVENT
 * Triggered when the service worker is first installed
 * This is where we cache our essential assets
 */
self.addEventListener('install', (event) => {
  console.log(`[Service Worker] Installing service worker... ${CACHE_VERSION}`);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(assetsToCache);
      })
      .then(() => {
        console.log('[Service Worker] All assets cached successfully');
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
});

/**
 * ACTIVATE EVENT
 * Triggered when the service worker becomes active
 * This is where we clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log(`[Service Worker] Activating service worker... ${CACHE_VERSION}`);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete any cache that doesn't match our current version
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Service worker activated');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

/**
 * FETCH EVENT
 * Intercepts network requests and serves cached content when available
 * Strategy: Cache-first with network fallback
 */
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (like Google Fonts, external APIs)
  if (!event.request.url.startsWith(self.location.origin)) {
    // For Google Fonts and other external resources, use network with cache fallback
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // For same-origin requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached response if found
        if (cachedResponse) {
          console.log(`[Service Worker] Serving from cache: ${event.request.url}`);
          return cachedResponse;
        }

        // Otherwise, fetch from network
        console.log(`[Service Worker] Fetching from network: ${event.request.url}`);
        return fetch(event.request)
          .then((networkResponse) => {
            // Don't cache if response is not ok
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
              return networkResponse;
            }

            // Clone the response before caching (response can only be consumed once)
            const responseToCache = networkResponse.clone();

            // Cache the new resource for future offline use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch failed:', error);
            // Could return a custom offline page here if desired
          });
      })
  );
});

/**
 * MESSAGE EVENT
 * Allows the app to communicate with the service worker
 * For example, to force skip waiting or clear caches
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Received SKIP_WAITING message');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[Service Worker] Received CLEAR_CACHE message');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[Service Worker] Service worker script loaded');