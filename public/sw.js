const CACHE_NAME = "policizer-shell-v1"
const APP_SHELL_ASSETS = ["/", "/manifest.webmanifest", "/icons/icon-192x192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .catch(() => Promise.resolve())
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/") || Response.error())
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached
      }

      return fetch(event.request)
        .then((response) => {
          const cloned = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned)
          })
          return response
        })
        .catch(() => Response.error())
    })
  )
})

// Push-ready extension point (provider-specific payload handling is added later).
self.addEventListener("push", () => {})

// Push-ready extension point (provider-specific click handling is added later).
self.addEventListener("notificationclick", () => {})

