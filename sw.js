// Bump this version on every deploy to force update
const CACHE_NAME = 'recipecard-static-v2';

const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './main.js',
  './idb.js',
  './methods.js',
  './manifest.json',
  './android-chrome-512x512.png',
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js'
];

// Install event - cache resources robustly
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate new SW immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(
        urlsToCache.map(async (url) => {
          try {
            const response = await fetch(url, {cache: 'no-cache'});
            if (response && response.ok) {
              await cache.put(url, response.clone());
              return {url, status: 'cached'};
            }
            return {url, status: 'failed', reason: `HTTP ${response.status}`};
          } catch (err) {
            return {url, status: 'failed', reason: err.message};
          }
        })
      );
      // Log failures for diagnostics but continue
      results.forEach(r => {
        if (r.status === 'rejected') console.log('Cache promise rejected', r.reason);
        else if (r.value && r.value.status === 'failed') console.log('Cache failed for', r.value.url, r.value.reason);
      });
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const req = event.request;
  
  // If navigation request (HTML page), try network first
  if(req.mode === 'navigate'){
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // For other requests, prefer cache then network
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      
      return fetch(req).then(res => {
        if(req.method === 'GET' && res && res.status === 200 && res.type !== 'opaque'){
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(self.clients.claim());
});