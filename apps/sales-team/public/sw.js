const STATIC_CACHE = 'static-assets-v2'
const HISTORY_CACHE = 'analysis-history-v2'
const SHELL_CACHE = 'app-shell-v2'

const ALL_CACHES = [STATIC_CACHE, HISTORY_CACHE, SHELL_CACHE]

// Install: skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']).catch(() => {
        // Non-fatal if any asset is missing
      })
    )
  )
})

// Activate: purge old caches, claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  const path = url.pathname

  // --- NetworkOnly: AI endpoints — never serve stale AI responses ---
  if (path.startsWith('/api/analyze') || path.startsWith('/api/assistant')) {
    // Let the browser handle it with no interception
    return
  }

  // --- NetworkFirst: history page (fresh with short stale fallback) ---
  if (path.startsWith('/dashboard/history')) {
    event.respondWith(networkFirst(event.request, HISTORY_CACHE, 50, 300))
    return
  }

  // --- StaleWhileRevalidate: other dashboard pages ---
  if (path.startsWith('/dashboard')) {
    event.respondWith(staleWhileRevalidate(event.request, SHELL_CACHE))
    return
  }

  // --- CacheFirst: static assets (JS, CSS, images, fonts) ---
  if (/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/.test(path)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE))
    return
  }

  // All other requests: network passthrough
})

// NetworkFirst: try network, update cache, fall back to cache on failure
async function networkFirst(request, cacheName, maxEntries, maxAgeSeconds) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      await trimCache(cache, maxEntries)
      cache.put(request, response.clone())
      cache.put(`${request.url}:timestamp`, new Response(String(Date.now())))
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) {
      // Check max age
      const tsResponse = await caches.match(`${request.url}:timestamp`)
      if (tsResponse) {
        const ts = Number(await tsResponse.text())
        if (Date.now() - ts > maxAgeSeconds * 1000) {
          // Stale but return anyway (user is offline)
        }
      }
      return cached
    }
    return new Response('Offline — no cached version available', { status: 503 })
  }
}

// StaleWhileRevalidate: return cache immediately, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  })

  return cached ?? fetchPromise
}

// CacheFirst: return cache if available, otherwise fetch and cache
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Asset not available offline', { status: 503 })
  }
}

// Trim cache to maxEntries (LRU approximation: delete oldest keys)
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys()
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries)
    await Promise.all(toDelete.map((key) => cache.delete(key)))
  }
}
