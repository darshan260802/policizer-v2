# PWA Install + Push-Ready Design

## Problem
The app needs to be upgraded to a Progressive Web App with cross-platform install UX:
- Native auto-install prompt flow where browsers support it (Android, Windows, macOS Chromium-based browsers).
- iOS-friendly install guidance where native install prompt APIs do not exist.
- Foundation that is ready for future push notifications without committing to a provider today.

## Scope
- In scope:
  - PWA manifest and metadata wiring.
  - Service worker registration and baseline caching behavior.
  - Install prompt UX for supported browsers.
  - iOS install guidance UX.
  - Provider-agnostic push-extension scaffolding.
- Out of scope:
  - Actual push provider integration (FCM/Web Push backend keys, subscription API, delivery pipelines).
  - Domain-specific offline data sync rules for policy data.

## Chosen Approach
Use a native Next.js PWA setup (no external PWA plugin) with explicit manifest/service worker/install prompt components.

Why:
- Highest control over install and iOS UX.
- Keeps push-extension points clean and provider-agnostic.
- Avoids plugin abstractions that may constrain future push behavior.

## Platform Install Behavior
1. **Android/Windows/macOS (supported browsers)**:
   - Capture `beforeinstallprompt`.
   - Show install CTA in app UI.
   - Trigger native prompt on user action.
   - Hide/disable prompt once installed.
2. **iOS Safari**:
   - Show “Add to Home Screen” guidance banner/instructions.
   - Do not attempt unsupported native install prompt APIs.
3. **Installed detection**:
   - Use display-mode + navigator checks where available to suppress install prompts for installed sessions.

## PWA Technical Design
1. **Manifest**
   - Implement `app/manifest.ts`.
   - Include app name, short name, start URL, display `standalone`, theme/background colors, and icon set.
2. **Metadata**
   - Update `app/layout.tsx` metadata for:
     - manifest reference
     - apple web app capability/title/status bar style
     - theme color
3. **Service worker**
   - Add `public/sw.js`.
   - Add client component to register service worker from root layout.
4. **Caching baseline**
   - Cache static shell assets.
   - Support navigation fallback behavior that keeps core app launch reliable.
   - Avoid aggressive caching of dynamic policy data responses.

## Push-Ready (Provider-Agnostic) Foundation
1. Keep service worker structure ready for later `push` and `notificationclick` handlers.
2. Add a client utility for:
   - feature detection (`serviceWorker`, `Notification`, `PushManager` availability),
   - permission state introspection helpers.
3. Do not add provider-specific SDK wiring now.
4. Ensure extension points are explicit and documented in code comments where needed.

## Error Handling and Edge Cases
- Gracefully no-op on unsupported browsers/features.
- Avoid runtime exceptions when service worker APIs are unavailable (SSR/supported-guarded execution).
- Keep install UI hidden if install APIs are unavailable or app is already installed.

## Validation Criteria
- Browser shows install CTA and native prompt flow where supported.
- iOS shows install guidance UX.
- App includes valid manifest + service worker registration.
- Existing app behavior remains unchanged.
- Codebase includes push-ready scaffolding without provider lock-in.

