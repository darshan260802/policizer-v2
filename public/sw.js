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

self.addEventListener("push", (event) => {
  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = { body: event.data.text() }
    }
  }

  const title = payload.title || "Policy reminder"
  const body = payload.body || "A policy premium reminder is due."
  const url = payload.url || "/policies"
  const tag = payload.tag || "policy-reminder"

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag,
      renotify: true,
      data: {
        url,
        policyId: payload.policyId || null,
      },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const targetPath = event.notification.data?.url || "/policies"
  const targetUrl = new URL(targetPath, self.location.origin).toString()

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          return client.navigate(targetUrl).then(() => client.focus())
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }

      return Promise.resolve()
    })
  )
})
