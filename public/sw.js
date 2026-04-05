const CACHE_NAME = 'egs-v3'

self.addEventListener('install', (event) => {
  // No precaching — pages are cached on first real visit, not upfront
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip: API calls, non-GET, cross-origin requests
  if (
    url.pathname.startsWith('/api/') ||
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return
  }

  // Static assets (JS, CSS, images, fonts) — cache-first, no network hit if cached
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|webp)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
            return response
          })
      )
    )
    return
  }

  // Pages — network-first with a short timeout, fall back to cache
  event.respondWith(
    Promise.race([
      fetch(event.request).then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]).catch(() => caches.match(event.request))
  )
})
