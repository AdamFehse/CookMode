const CACHE_NAME = 'recipecard-static-v1';

// Get the base path dynamically from the service worker's location
const BASE_PATH = self.location.pathname.substring(0, self.location.pathname.lastIndexOf('/') + 1);

const ASSETS = [
  `${BASE_PATH}`,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}styles.css`,
  `${BASE_PATH}main.js`,
  `${BASE_PATH}idb.js`,
  `${BASE_PATH}methods.js`,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}android-chrome-512x512.png`,
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js'
];

self.addEventListener('install', (e)=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c=> c.addAll(ASSETS)));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  // If navigation request (HTML page), try network first so local edits are reflected during dev
  if(req.mode === 'navigate'){
    e.respondWith(fetch(req).then(res=>{
      // update the cache for index.html
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(req, copy));
      return res;
    }).catch(()=> caches.match(`${BASE_PATH}index.html`)));
    return;
  }

  // For other requests, prefer cache then network
  e.respondWith(caches.match(req).then(cached=> cached || fetch(req).then(res=>{
    if(req.method === 'GET' && res && res.status === 200 && res.type !== 'opaque'){
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(req, copy));
    }
    return res;
  }).catch(()=> caches.match(`${BASE_PATH}index.html`))));
});