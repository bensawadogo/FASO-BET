const CACHE = "fasobet-v3";
const ASSETS = [
  "/",
  "/dashboard",
  "/history",
  "/coupon",
  "/premium",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("fetch", (event) => {
  const { method } = event.request;
  const url = event.request.url;
  // PROD SAFETY: Ne JAMAIS intercepter les appels API, non-GET, ou non-http
  if (method !== 'GET' || !url.startsWith('http') || url.includes('/api/')) {
    return;
  }
  // Stratégie network-first avec fallback cache (jamais de stale data)
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
