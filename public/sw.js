const CACHE_NAME = 'claimpoint-shell-v1';

// Only static assets get cached — never API routes, never anything under
// /dashboard, /accounts, etc. Financial data must always be fresh, never
// served from an offline cache. This is app-shell caching only.
const SHELL_ASSETS = ['/icon-192.png', '/icon-512.png', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept API calls or authenticated app routes — those must
  // always hit the network for real, current data.
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return;
  }

  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});