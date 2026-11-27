// Offline support for the public demo (registered only there, see app/page.tsx).
// Hashed build assets are immutable: cache first. Everything else (pages,
// catalogs, model binaries) is network first, falling back to the cache when
// offline, so a new deploy never mixes an old catalog with a new binary.
const CACHE = 'canine-atlas-v1';
const scope = new URL(self.registration.scope);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(scope.href)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit =
      (await cache.match(request)) ||
      (request.mode === 'navigate' ? await cache.match(scope.href) : undefined);
    if (hit) return hit;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== scope.origin ||
    !url.pathname.startsWith(scope.pathname) ||
    url.pathname.endsWith('.pdf')
  )
    return;
  event.respondWith(
    url.pathname.includes('/assets/') ? cacheFirst(request) : networkFirst(request),
  );
});
