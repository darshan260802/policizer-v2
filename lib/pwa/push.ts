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

