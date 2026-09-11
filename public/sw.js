// Simple service worker for PWA support with network-first/bypassed caching for active development
const CACHE_NAME = 'argos-v2';

self.addEventListener('install', (event) => {
  // Force active service worker to become active immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear all old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // In development and preview environments, bypass service worker cache
  // and always go to network to prevent blank screens and stale code issues.
  event.respondWith(fetch(event.request));
});

