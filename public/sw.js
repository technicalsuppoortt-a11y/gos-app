// Network-only: authenticated workspace and payment responses must never be cached.
// Let the browser handle requests directly. Wrapping every request in
// respondWith(fetch(...)) only adds a second failure when the network is down.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
