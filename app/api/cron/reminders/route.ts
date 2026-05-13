import { NextResponse } from "next/server"
import webpush from "web-push"

import { getAdminDb } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ReminderFrequency = "once" | "daily"

type PolicyReminder = {
  enabled?: boolean
  daysBefore?: number
  frequency?: ReminderFrequency
}

type PolicyDoc = {
  uid?: string
  insurerName?: string
  policyNumber?: string
  nextPaymentDate?: string | null
  reminder?: PolicyReminder
}

type PushSubscriptionDoc = {
  endpoint?: string
  expirationTime?: number | null
  keys?: {
    p256dh?: string | null
    auth?: string | null
  }
}

function parseYmdToUtc(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part))

  if (!year || !month || !day) {
    throw new Error(`Invalid YYYY-MM-DD date: ${value}`)
  }

  return new Date(Date.UTC(year, month - 1, day))
}

function getTodayUtcDate() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function getDaysUntilDue(nextPaymentDate: string, today: Date) {
  const dueDate = parseYmdToUtc(nextPaymentDate)
  const diffMs = dueDate.getTime() - today.getTime()
  return Math.floor(diffMs / 86400000)
}

function shouldNotify(reminder: PolicyReminder, daysUntilDue: number) {
  if (!reminder.enabled) {
    return false
  }

  const daysBefore = Math.max(1, Math.min(10, Math.floor(Number(reminder.daysBefore ?? 0))))
  const frequency: ReminderFrequency =
    reminder.frequency === "once" || reminder.frequency === "daily"
      ? reminder.frequency
      : "daily"

  if (frequency === "once") {
    return daysUntilDue === daysBefore
  }

  return daysUntilDue <= daysBefore
}

function buildBody(policy: PolicyDoc, nextPaymentDate: string, daysUntilDue: number) {
  const insurerName = policy.insurerName?.trim() || "Your policy"
  const policyNumber = policy.policyNumber?.trim() ? ` (${policy.policyNumber.trim()})` : ""

  if (daysUntilDue > 0) {
    return `${insurerName}${policyNumber} is due in ${daysUntilDue} day${daysUntilDue > 1 ? "s" : ""} on ${nextPaymentDate}.`
  }

  if (daysUntilDue === 0) {
    return `${insurerName}${policyNumber} premium is due today (${nextPaymentDate}).`
  }

  return `${insurerName}${policyNumber} premium is overdue since ${nextPaymentDate}.`
}

function configureWebPush() {
  const vapidPublicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY
  const contactEmail = process.env.WEB_PUSH_CONTACT_EMAIL

  if (!vapidPublicKey || !vapidPrivateKey || !contactEmail) {
    throw new Error(
      "WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY, and WEB_PUSH_CONTACT_EMAIL are required."
    )
  }

  webpush.setVapidDetails(`mailto:${contactEmail}`, vapidPublicKey, vapidPrivateKey)
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  configureWebPush()
  const adminDb = getAdminDb()

  const today = getTodayUtcDate()
  const policiesSnapshot = await adminDb
    .collection("policies")
    .where("reminder.enabled", "==", true)
    .get()

  let matchedPolicies = 0
  let sentNotifications = 0
  const subscriptionCache = new Map<string, Array<{ id: string; data: () => unknown }>>()

  for (const policySnapshot of policiesSnapshot.docs) {
    const policy = policySnapshot.data() as PolicyDoc
    const nextPaymentDate = policy.nextPaymentDate
    const reminder = policy.reminder
    const uid = policy.uid

    if (!uid || !nextPaymentDate || !reminder) {
      continue
    }

    const daysUntilDue = getDaysUntilDue(nextPaymentDate, today)
    if (!shouldNotify(reminder, daysUntilDue)) {
      continue
    }

    matchedPolicies += 1

    if (!subscriptionCache.has(uid)) {
      const subscriptionsSnapshot = await adminDb
        .collection("pushSubscriptions")
        .where("uid", "==", uid)
        .get()
      subscriptionCache.set(uid, subscriptionsSnapshot.docs)
    }

    const subscriptions = subscriptionCache.get(uid) ?? []
    const payload = JSON.stringify({
      title: "Policy premium reminder",
      body: buildBody(policy, nextPaymentDate, daysUntilDue),
      policyId: policySnapshot.id,
      url: `/policies?reminderPolicyId=${encodeURIComponent(policySnapshot.id)}`,
      tag: `policy-reminder-${policySnapshot.id}`,
    })

    for (const subscriptionSnapshot of subscriptions) {
      const subscription = subscriptionSnapshot.data() as PushSubscriptionDoc

      if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        continue
      }

      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime ?? null,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          },
          payload
        )
        sentNotifications += 1
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : null

        if (statusCode === 404 || statusCode === 410) {
          await adminDb.collection("pushSubscriptions").doc(subscriptionSnapshot.id).delete()
        } else {
          throw error
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checkedPolicies: policiesSnapshot.size,
    matchedPolicies,
    sentNotifications,
  })
}
