"use client"

import { doc, setDoc } from "firebase/firestore"

import { db } from "@/lib/firebase"
import { ensurePushManagerSubscription } from "@/lib/pwa/push"

type PersistedSubscription = {
  endpoint: string
  expirationTime?: number | null
  keys?: {
    p256dh?: string
    auth?: string
  }
}

async function endpointToHash(endpoint: string) {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(endpoint)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  const digestArray = Array.from(new Uint8Array(digest))
  return digestArray.map((value) => value.toString(16).padStart(2, "0")).join("")
}

export async function ensurePushSubscriptionForUser(uid: string) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ?? ""
  const subscription = (await ensurePushManagerSubscription(
    vapidPublicKey
  )) as PersistedSubscription

  if (!subscription.endpoint) {
    throw new Error("Unable to register push subscription for this device.")
  }

  const subscriptionHash = await endpointToHash(subscription.endpoint)
  const subscriptionRef = doc(db, "pushSubscriptions", `${uid}_${subscriptionHash}`)
  const now = Date.now()

  await setDoc(
    subscriptionRef,
    {
      uid,
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime ?? null,
      keys: {
        p256dh: subscription.keys?.p256dh ?? null,
        auth: subscription.keys?.auth ?? null,
      },
      userAgent: navigator.userAgent,
      updatedAtMs: now,
      createdAtMs: now,
    },
    { merge: true }
  )
}
