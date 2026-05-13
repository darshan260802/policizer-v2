export function isPushSupported() {
  if (typeof window === "undefined") {
    return false
  }

  return (
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window
  )
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied"
  }

  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied"
  }

  return Notification.requestPermission()
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

async function getServiceWorkerRegistration() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.")
  }

  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) {
    return existing
  }

  return navigator.serviceWorker.register("/sw.js")
}

export async function ensurePushManagerSubscription(vapidPublicKey: string) {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported on this device.")
  }

  if (!vapidPublicKey.trim()) {
    throw new Error("Push notifications are not configured yet.")
  }

  const permission = getNotificationPermission()
  const effectivePermission =
    permission === "default" ? await requestNotificationPermission() : permission

  if (effectivePermission !== "granted") {
    throw new Error("Notification permission is required to enable reminders.")
  }

  const registration = await getServiceWorkerRegistration()
  const existingSubscription = await registration.pushManager.getSubscription()

  if (existingSubscription) {
    return existingSubscription.toJSON()
  }

  const newSubscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })

  return newSubscription.toJSON()
}
