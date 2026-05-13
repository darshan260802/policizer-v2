# PWA Install and Push-Ready Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the app into an installable PWA across Android/iOS/Windows/macOS with provider-agnostic push-ready foundations.

**Architecture:** Implement native Next.js PWA primitives: `app/manifest.ts`, root metadata wiring, service worker registration, and install UX componentry. Add a browser-safe install flow for supported browsers via `beforeinstallprompt` and an iOS-specific guidance banner. Keep push prep provider-agnostic by adding capability/permission utilities and service-worker extension hooks without integrating delivery infrastructure.

**Tech Stack:** Next.js App Router, React 19, TypeScript, browser Service Worker + Web App Manifest APIs, existing UI components.

---

## File Structure and Responsibilities

- **Create:** `app/manifest.ts`
  - Typed Next.js manifest with install metadata/icons/colors.
- **Create:** `public/sw.js`
  - Service worker install/activate/fetch baseline + push extension hooks.
- **Create:** `components/pwa/service-worker-registration.tsx`
  - Client-only SW registrar with browser guards.
- **Create:** `components/pwa/install-prompt.tsx`
  - Install CTA for supported browsers + iOS guidance banner.
- **Create:** `lib/pwa/install.ts`
  - Typed helpers for installability detection and deferred prompt handling.
- **Create:** `lib/pwa/push.ts`
  - Provider-agnostic push capability and permission helpers.
- **Modify:** `app/layout.tsx`
  - Metadata + mounting of PWA registration/install components.
- **Modify:** `public\` icon assets if missing (add required icon files under `public/icons/`).

Validation commands:
- `npm run lint`
- `npm run typecheck`
- `npm run build`

### Task 1: Add manifest and metadata wiring

**Files:**
- Create: `app/manifest.ts`
- Modify: `app/layout.tsx`
- Create (if missing): `public/icons/icon-192x192.png`, `public/icons/icon-512x512.png`, `public/icons/apple-touch-icon.png`

- [ ] **Step 1: Create `app/manifest.ts`**

```ts
import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Policizer",
    short_name: "Policizer",
    description: "Track and manage insurance policies in one place.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  }
}
```

- [ ] **Step 2: Update `app/layout.tsx` metadata**

```ts
export const metadata: Metadata = {
  title: "Policizer | Dark Mode Insurance Policy Manager",
  description:
    "Track LIC, Max Life, and all your insurance policies in one mobile-first app with reminders, analytics, and exports.",
  manifest: "/manifest.webmanifest",
  themeColor: "#0a0a0a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Policizer"
  },
  icons: {
    apple: "/icons/apple-touch-icon.png"
  }
}
```

- [ ] **Step 3: Ensure icon files exist under `public/icons/`**

```bash
# verify expected icon files exist
git --no-pager ls-files public/icons
```

Expected: includes `icon-192x192.png`, `icon-512x512.png`, `apple-touch-icon.png`

- [ ] **Step 4: Run checks**

Run: `npm run lint -- app/layout.tsx app/manifest.ts`  
Expected: no lint errors

- [ ] **Step 5: Commit**

```bash
git add app/manifest.ts app/layout.tsx public/icons
git commit -m "feat: add pwa manifest and root metadata wiring"
```

### Task 2: Add service worker and registration

**Files:**
- Create: `public/sw.js`
- Create: `components/pwa/service-worker-registration.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `public/sw.js` baseline**

```js
const CACHE_NAME = "policizer-shell-v1"
const APP_SHELL_ASSETS = ["/", "/manifest.webmanifest"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  )
})

// Push-ready extension points (provider-agnostic)
self.addEventListener("push", () => {
  // Implement provider-specific payload handling in later stage.
})
self.addEventListener("notificationclick", () => {
  // Implement provider-specific click handling in later stage.
})
```

- [ ] **Step 2: Create `components/pwa/service-worker-registration.tsx`**

```tsx
"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    void navigator.serviceWorker.register("/sw.js")
  }, [])

  return null
}
```

- [ ] **Step 3: Mount SW registration in `app/layout.tsx` body**

```tsx
<ThemeProvider defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
  <AuthProvider>
    <ServiceWorkerRegistration />
    {children}
  </AuthProvider>
</ThemeProvider>
```

- [ ] **Step 4: Run checks**

Run: `npm run lint -- components/pwa/service-worker-registration.tsx app/layout.tsx`  
Expected: no lint errors

- [ ] **Step 5: Commit**

```bash
git add public/sw.js components/pwa/service-worker-registration.tsx app/layout.tsx
git commit -m "feat: add service worker and client registration"
```

### Task 3: Add install prompt UX (native + iOS guidance)

**Files:**
- Create: `lib/pwa/install.ts`
- Create: `components/pwa/install-prompt.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create install helpers in `lib/pwa/install.ts`**

```ts
export type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false
  const mediaStandalone = window.matchMedia?.("(display-mode: standalone)").matches
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return Boolean(mediaStandalone || iosStandalone)
}

export function isIosSafari() {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(ua)
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua)
  return isIos && isSafari
}
```

- [ ] **Step 2: Create `components/pwa/install-prompt.tsx`**

```tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { isIosSafari, isStandaloneDisplayMode, type DeferredInstallPromptEvent } from "@/lib/pwa/install"

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    setIsInstalled(isStandaloneDisplayMode())
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as DeferredInstallPromptEvent)
    }
    const onInstalled = () => setIsInstalled(true)
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const showNativeInstall = useMemo(() => !isInstalled && Boolean(deferredPrompt), [deferredPrompt, isInstalled])
  const showIosGuide = useMemo(() => !isInstalled && !deferredPrompt && isIosSafari(), [deferredPrompt, isInstalled])

  const onInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (!showNativeInstall && !showIosGuide) return null

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 rounded-xl border border-border bg-card p-3 shadow-xl">
      {showNativeInstall ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-foreground">Install Policizer for faster access.</p>
          <Button size="sm" onClick={() => void onInstall()}>Install app</Button>
        </div>
      ) : (
        <p className="text-sm text-foreground">
          To install on iPhone/iPad: tap Share in Safari, then “Add to Home Screen”.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Mount `<InstallPrompt />` in root layout**

```tsx
<AuthProvider>
  <ServiceWorkerRegistration />
  <InstallPrompt />
  {children}
</AuthProvider>
```

- [ ] **Step 4: Run checks**

Run: `npm run lint -- components/pwa/install-prompt.tsx lib/pwa/install.ts app/layout.tsx`  
Expected: no lint errors

- [ ] **Step 5: Commit**

```bash
git add components/pwa/install-prompt.tsx lib/pwa/install.ts app/layout.tsx
git commit -m "feat: add cross-platform pwa install prompt experience"
```

### Task 4: Add provider-agnostic push capability scaffolding

**Files:**
- Create: `lib/pwa/push.ts`
- Modify: `components/pwa/service-worker-registration.tsx` (optional capability checks)

- [ ] **Step 1: Add push utility in `lib/pwa/push.ts`**

```ts
export function isPushSupported() {
  if (typeof window === "undefined") return false
  return "serviceWorker" in navigator && "Notification" in window && "PushManager" in window
}

export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied" as NotificationPermission
  return Notification.permission
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied" as NotificationPermission
  return Notification.requestPermission()
}
```

- [ ] **Step 2: Add lightweight comment-based extension point in SW registration**

```tsx
// Later stage: initialize provider-specific push subscription flow here
// after backend endpoint and key management are ready.
```

- [ ] **Step 3: Run checks**

Run: `npm run lint -- lib/pwa/push.ts components/pwa/service-worker-registration.tsx`  
Expected: no lint errors

- [ ] **Step 4: Commit**

```bash
git add lib/pwa/push.ts components/pwa/service-worker-registration.tsx public/sw.js
git commit -m "chore: add provider-agnostic push readiness scaffolding"
```

### Task 5: End-to-end validation and hardening

**Files:**
- Modify (if fixes needed): `app/layout.tsx`, `components/pwa/install-prompt.tsx`, `public/sw.js`

- [ ] **Step 1: Run full checks**

Run: `npm run lint`  
Expected: lint succeeds

Run: `npm run typecheck`  
Expected: TypeScript check succeeds

Run: `npm run build`  
Expected: production build succeeds

- [ ] **Step 2: Manual platform checks**

1. Android Chrome: native install prompt appears after engagement via in-app CTA.
2. Edge/Chrome desktop (Windows/macOS): install CTA prompts native installer.
3. iOS Safari: guidance banner appears with Add to Home Screen instructions.
4. Installed session: install banners no longer shown.
5. App still works for existing routes and authenticated areas.

- [ ] **Step 3: Commit final polish**

```bash
git add app/layout.tsx app/manifest.ts public/sw.js components/pwa lib/pwa
git commit -m "feat: complete pwa install flow with push-ready foundation"
```

