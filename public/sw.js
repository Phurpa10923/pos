const CACHE_NAME = 'aurapos-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg'
];

// Install Event - Pre-cache universal shell assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Cleanup older versions
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Stale-While-Revalidate with dynamic runtime caching
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Skip caching sync calls or other methods
  if (url.pathname.includes('/sync')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseCopy));
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is for page navigation, fallback to SPA routing index.html
          if (e.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
