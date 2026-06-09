// public/sw.js
const CACHE_NAME = "lifehub-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/src/main.jsx",
  "/src/App.jsx",
  "/src/index.css",
  "/src/db.js",
  "/icon.png",
  "/manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn("Asset caching warning during install:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
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

self.addEventListener("fetch", (e) => {
  // Only intercept GET requests
  if (e.request.method !== "GET") {
    return;
  }
  
  // Ignore external API requests to avoid caching or sync disruptions
  if (
    e.request.url.includes("api.github.com") ||
    e.request.url.includes("jsonhosting.com") || 
    e.request.url.includes("api.qrserver.com")
  ) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {/* ignore offline fetch errors */});
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
