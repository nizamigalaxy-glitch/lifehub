// public/sw.js
const CACHE_NAME = "lifehub-v3"; // increment to v3 to force cache flush
const REQUIRED_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png"
];

// Install Event - Pre-cache essential landing pages and manifest
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(REQUIRED_ASSETS);
    }).catch(err => {
      console.warn("Pre-caching failed during install:", err);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
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

// Fetch Event - Stale-While-Revalidate caching strategy
self.addEventListener("fetch", (e) => {
  // Only handle local GET requests
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) {
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
        // Fetch in background to update cache for next launch
        e.waitUntil(
          fetch(e.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(e.request, networkResponse);
              });
            }
          }).catch(() => {/* ignore background fetch errors */})
        );
        return cachedResponse;
      }
      
      // If not in cache, fetch from network and cache dynamically
      return fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.warn("Network fetch failed in SW:", err);
        // Fallback for document navigation when offline
        if (e.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
