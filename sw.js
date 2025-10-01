const CACHE_NAME = 'recipecard-static-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/idb.js',
  '/manifest.json',
  '/android-chrome-512x512.png',
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js'
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
    }).catch(()=> caches.match('/index.html')));
    return;
  }

  // For other requests, prefer cache then network
  e.respondWith(caches.match(req).then(cached=> cached || fetch(req).then(res=>{
    if(req.method === 'GET' && res && res.status === 200 && res.type !== 'opaque'){
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(req, copy));
    }
    return res;
  }).catch(()=> caches.match('/index.html'))));
});
