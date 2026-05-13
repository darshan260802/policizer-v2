export type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false
  }

  const mediaStandalone = window.matchMedia?.("(display-mode: standalone)").matches
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean })
    .standalone

  return Boolean(mediaStandalone || iosStandalone)
}

export function isIosSafari() {
  if (typeof window === "undefined") {
    return false
  }

  const userAgent = window.navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(userAgent)
  const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios/.test(userAgent)

  return isIos && isSafari
}

