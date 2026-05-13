"use client"

import { useEffect } from "react"

import { isPushSupported } from "@/lib/pwa/push"

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return
    }

    void navigator.serviceWorker.register("/sw.js")

    // Later stage: initialize provider-specific push subscription flow here.
    void isPushSupported()
  }, [])

  return null
}

