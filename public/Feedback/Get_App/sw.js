self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A simple fetch handler to pass PWA basic requirements.
  // We just let the network handle it, not actually caching for offline.
  event.respondWith(fetch(event.request).catch(() => new Response("Network error")));
});
