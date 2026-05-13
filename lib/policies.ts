"use client"

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"

import { db } from "@/lib/firebase"

const premiumMethods = ["single", "monthly", "quarterly", "half-yearly", "yearly"] as const
type PremiumMethod = (typeof premiumMethods)[number]
const reminderFrequencies = ["once", "daily"] as const
type ReminderFrequency = (typeof reminderFrequencies)[number]

type PolicyReminder = {
  enabled: boolean
  daysBefore: number
  frequency: ReminderFrequency
}

type PolicyInput = {
  insurerName: string
  policyNumber: string
  beneficiaryName: string
  premiumMethod: PremiumMethod
  policyStartDate: string
  maturityDate: string
  lastPaymentDate: string
  premiumAmount: number
  sumAssured: number
  additionalNote: string
  reminder: PolicyReminder
}

type InstallmentStatus = "paid" | "pending"

type PolicyInstallment = {
  dueDate: string
  status: InstallmentStatus
  paidAt: string | null
}

type PolicyRecord = PolicyInput & {
  id: string
  uid: string
  createdAtMs: number
  updatedAtMs: number
  installments: PolicyInstallment[]
  nextPaymentDate: string | null
  lastPremiumPaymentDate: string | null
  paidInstallments: number
  pendingInstallments: number
}

type PolicyInsights = {
  totalPolicies: number
  totalSumAssured: number
  totalPremiumAmount: number
  dueNowCount: number
  methodBreakdown: Array<{ method: PremiumMethod; count: number }>
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part))

  if (!year || !month || !day) {
    throw new Error(`Invalid date value: ${value}`)
  }

  return new Date(Date.UTC(year, month - 1, day))
}

function formatDate(value: Date) {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, "0")
  const day = String(value.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getTodayYmd() {
  const now = new Date()
  return formatDate(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  )
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

function addMonthsClamped(value: Date, monthsToAdd: number) {
  const originalDay = value.getUTCDate()
  const year = value.getUTCFullYear()
  const month = value.getUTCMonth() + monthsToAdd
  const targetYear = year + Math.floor(month / 12)
  const targetMonth = ((month % 12) + 12) % 12
  const targetDay = Math.min(originalDay, daysInMonth(targetYear, targetMonth))

  return new Date(Date.UTC(targetYear, targetMonth, targetDay))
}

function monthsForMethod(method: PremiumMethod) {
  switch (method) {
    case "monthly":
      return 1
    case "quarterly":
      return 3
    case "half-yearly":
      return 6
    case "yearly":
      return 12
    case "single":
      return 0
  }
}

function normalizePolicyReminder(value: Partial<PolicyReminder> | undefined): PolicyReminder {
  const rawDays = Number(value?.daysBefore ?? 3)
  const daysBefore = Number.isFinite(rawDays)
    ? Math.max(1, Math.min(10, Math.floor(rawDays)))
    : 3

  return {
    enabled: Boolean(value?.enabled),
    daysBefore,
    frequency: reminderFrequencies.includes(value?.frequency as ReminderFrequency)
      ? (value?.frequency as ReminderFrequency)
      : "daily",
  }
}

function buildInstallments(
  policy: Pick<
    PolicyInput,
    "policyStartDate" | "maturityDate" | "lastPaymentDate" | "premiumMethod"
  >
) {
  if (policy.premiumMethod === "single") {
    return [] as PolicyInstallment[]
  }

  const intervalMonths = monthsForMethod(policy.premiumMethod)
  const installmentEndDate = parseDate(policy.lastPaymentDate || policy.maturityDate)
  const paidThrough = getTodayYmd()
  const installments: PolicyInstallment[] = []
  let cursor = addMonthsClamped(parseDate(policy.policyStartDate), intervalMonths)

  while (cursor <= installmentEndDate) {
    const dueDate = formatDate(cursor)
    const status: InstallmentStatus = dueDate <= paidThrough ? "paid" : "pending"
    installments.push({
      dueDate,
      status,
      paidAt: status === "paid" ? dueDate : null,
    })
    cursor = addMonthsClamped(cursor, intervalMonths)
  }

  return installments
}

function derivePaymentState(installments: PolicyInstallment[]) {
  let lastPremiumPaymentDate: string | null = null
  let nextPaymentDate: string | null = null
  let paidInstallments = 0
  let pendingInstallments = 0

  for (const installment of installments) {
    if (installment.status === "paid") {
      paidInstallments += 1
      lastPremiumPaymentDate = installment.dueDate
      continue
    }

    pendingInstallments += 1
    if (!nextPaymentDate) {
      nextPaymentDate = installment.dueDate
    }
  }

  return {
    nextPaymentDate,
    lastPremiumPaymentDate,
    paidInstallments,
    pendingInstallments,
  }
}

async function replaceInstallments(
  policyId: string,
  policy: Pick<
    PolicyInput,
    "policyStartDate" | "maturityDate" | "lastPaymentDate" | "premiumMethod"
  >
) {
  const installmentsCollection = collection(db, "policies", policyId, "installments")
  const existingInstallments = await getDocs(installmentsCollection)

  for (const installmentDoc of existingInstallments.docs) {
    await deleteDoc(installmentDoc.ref)
  }

  const installments = buildInstallments(policy)

  for (const installment of installments) {
    await setDoc(doc(installmentsCollection, installment.dueDate), installment)
  }
}

async function getPolicyInstallments(policyId: string) {
  const installmentsCollection = collection(db, "policies", policyId, "installments")
  const installmentsSnapshot = await getDocs(
    query(installmentsCollection, orderBy("dueDate", "asc"))
  )

  return installmentsSnapshot.docs.map((installmentDoc) => {
    const data = installmentDoc.data() as Partial<PolicyInstallment>

    return {
      dueDate: data.dueDate ?? installmentDoc.id,
      status: data.status === "paid" ? "paid" : "pending",
      paidAt: data.paidAt ?? null,
    } satisfies PolicyInstallment
  })
}

async function listPolicies(uid: string) {
  const policiesSnapshot = await getDocs(
    query(collection(db, "policies"), where("uid", "==", uid))
  )

  const policies = await Promise.all(
    policiesSnapshot.docs.map(async (policyDoc) => {
      const raw = policyDoc.data() as Partial<PolicyInput> & {
        uid?: string
        createdAtMs?: number
        updatedAtMs?: number
        reminder?: Partial<PolicyReminder>
      }

      const installments = await getPolicyInstallments(policyDoc.id)
      const paymentState = derivePaymentState(installments)

      return {
        id: policyDoc.id,
        uid: raw.uid ?? uid,
        insurerName: raw.insurerName ?? "",
        policyNumber: raw.policyNumber ?? "",
        beneficiaryName: raw.beneficiaryName ?? "",
        premiumMethod: raw.premiumMethod ?? "monthly",
        policyStartDate: raw.policyStartDate ?? "",
        maturityDate: raw.maturityDate ?? "",
        lastPaymentDate: raw.lastPaymentDate ?? raw.maturityDate ?? "",
        premiumAmount: Number(raw.premiumAmount ?? 0),
        sumAssured: Number(raw.sumAssured ?? 0),
        additionalNote: raw.additionalNote ?? "",
        reminder: normalizePolicyReminder(raw.reminder),
        createdAtMs: Number(raw.createdAtMs ?? 0),
        updatedAtMs: Number(raw.updatedAtMs ?? 0),
        installments,
        ...paymentState,
      } satisfies PolicyRecord
    })
  )

  return policies.sort((a, b) => b.createdAtMs - a.createdAtMs)
}

async function createPolicy(uid: string, input: PolicyInput) {
  const now = Date.now()
  const reminder = normalizePolicyReminder(input.reminder)
  const policyDoc = await addDoc(collection(db, "policies"), {
    ...input,
    reminder,
    uid,
    premiumAmount: Number(input.premiumAmount),
    sumAssured: Number(input.sumAssured),
    createdAtMs: now,
    updatedAtMs: now,
  })

  await replaceInstallments(policyDoc.id, input)
}

async function updatePolicy(policyId: string, input: PolicyInput) {
  const reminder = normalizePolicyReminder(input.reminder)
  await updateDoc(doc(db, "policies", policyId), {
    ...input,
    reminder,
    premiumAmount: Number(input.premiumAmount),
    sumAssured: Number(input.sumAssured),
    updatedAtMs: Date.now(),
  })

  await replaceInstallments(policyId, input)
}

async function deletePolicy(policyId: string) {
  const installmentsCollection = collection(db, "policies", policyId, "installments")
  const existingInstallments = await getDocs(installmentsCollection)

  for (const installmentDoc of existingInstallments.docs) {
    await deleteDoc(installmentDoc.ref)
  }

  await deleteDoc(doc(db, "policies", policyId))
}

async function markNextInstallmentPaid(policyId: string) {
  const installments = await getPolicyInstallments(policyId)
  const paidThrough = getTodayYmd()
  const targetInstallment = installments.find(
    (installment) =>
      installment.status === "pending" && installment.dueDate <= paidThrough
  )

  if (!targetInstallment) {
    return false
  }

  await updateDoc(
    doc(db, "policies", policyId, "installments", targetInstallment.dueDate),
    {
      status: "paid",
      paidAt: paidThrough,
    }
  )

  await updateDoc(doc(db, "policies", policyId), {
    updatedAtMs: Date.now(),
  })

  return true
}

function getPolicyInsights(policies: PolicyRecord[]): PolicyInsights {
  const today = getTodayYmd()
  const methodCount = new Map<PremiumMethod, number>(
    premiumMethods.map((method) => [method, 0])
  )

  let totalSumAssured = 0
  let totalPremiumAmount = 0
  let dueNowCount = 0

  for (const policy of policies) {
    totalSumAssured += policy.sumAssured
    totalPremiumAmount += policy.premiumAmount

    if (policy.nextPaymentDate && policy.nextPaymentDate <= today) {
      dueNowCount += 1
    }

    methodCount.set(
      policy.premiumMethod,
      (methodCount.get(policy.premiumMethod) ?? 0) + 1
    )
  }

  const methodBreakdown = premiumMethods.map((method) => ({
    method,
    count: methodCount.get(method) ?? 0,
  }))

  return {
    totalPolicies: policies.length,
    totalSumAssured,
    totalPremiumAmount,
    dueNowCount,
    methodBreakdown,
  }
}

export {
  premiumMethods,
  buildInstallments,
  createPolicy,
  deletePolicy,
  getPolicyInsights,
  getTodayYmd,
  listPolicies,
  markNextInstallmentPaid,
  updatePolicy,
}

export type {
  PolicyInput,
  PolicyInsights,
  PolicyInstallment,
  PolicyReminder,
  PolicyRecord,
  PremiumMethod,
  ReminderFrequency,
}
