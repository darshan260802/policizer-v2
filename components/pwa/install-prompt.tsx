"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  type DeferredInstallPromptEvent,
  isIosSafari,
  isStandaloneDisplayMode,
} from "@/lib/pwa/install"

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<DeferredInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplayMode())

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as DeferredInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const showNativeInstall = useMemo(
    () => !isInstalled && Boolean(deferredPrompt),
    [deferredPrompt, isInstalled]
  )
  const showIosGuidance = useMemo(
    () => !isInstalled && !deferredPrompt && isIosSafari(),
    [deferredPrompt, isInstalled]
  )

  const handleNativeInstall = async () => {
    if (!deferredPrompt) {
      return
    }
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (!showNativeInstall && !showIosGuidance) {
    return null
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 rounded-xl border border-border/70 bg-card p-3 shadow-xl">
      {showNativeInstall ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-foreground">Install Policizer for faster access.</p>
          <Button size="sm" onClick={() => void handleNativeInstall()}>
            Install app
          </Button>
        </div>
      ) : (
        <p className="text-sm text-foreground">
          To install on iPhone/iPad: tap Share in Safari, then “Add to Home Screen”.
        </p>
      )}
    </div>
  )
}
