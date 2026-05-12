"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { FirebaseError } from "firebase/app"
import {
  CalendarClock,
  Eye,
  FilePenLine,
  Plus,
  ReceiptIndianRupee,
  ShieldCheck,
  Table2,
  Trash2,
} from "lucide-react"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/components/auth/auth-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  createPolicy,
  deletePolicy,
  getTodayYmd,
  listPolicies,
  markNextInstallmentPaid,
  premiumMethods,
  updatePolicy,
  type PolicyInput,
  type PolicyRecord,
  type PremiumMethod,
} from "@/lib/policies"

type DrawerMode = "create" | "edit" | "view"

type PolicyFormState = {
  insurerName: string
  policyNumber: string
  beneficiaryName: string
  premiumMethod: PremiumMethod
  policyStartDate: string
  maturityDate: string
  lastPaymentDate: string
  useMaturityAsLastPayment: boolean
  premiumAmount: string
  sumAssured: string
  additionalNote: string
}

function createEmptyFormState(): PolicyFormState {
  return {
    insurerName: "",
    policyNumber: "",
    beneficiaryName: "",
    premiumMethod: "monthly",
    policyStartDate: "",
    maturityDate: "",
    lastPaymentDate: "",
    useMaturityAsLastPayment: true,
    premiumAmount: "",
    sumAssured: "",
    additionalNote: "",
  }
}

const premiumMethodLabels: Record<PremiumMethod, string> = {
  single: "Single",
  monthly: "Monthly",
  quarterly: "Quarterly",
  "half-yearly": "Half-yearly",
  yearly: "Yearly",
}

function toFormState(policy: PolicyRecord): PolicyFormState {
  return {
    insurerName: policy.insurerName,
    policyNumber: policy.policyNumber,
    beneficiaryName: policy.beneficiaryName,
    premiumMethod: policy.premiumMethod,
    policyStartDate: policy.policyStartDate,
    maturityDate: policy.maturityDate,
    lastPaymentDate: policy.lastPaymentDate,
    useMaturityAsLastPayment: policy.lastPaymentDate === policy.maturityDate,
    premiumAmount: String(policy.premiumAmount),
    sumAssured: String(policy.sumAssured),
    additionalNote: policy.additionalNote,
  }
}

function toPolicyInput(formState: PolicyFormState): PolicyInput {
  return {
    insurerName: formState.insurerName.trim(),
    policyNumber: formState.policyNumber.trim(),
    beneficiaryName: formState.beneficiaryName.trim(),
    premiumMethod: formState.premiumMethod,
    policyStartDate: formState.policyStartDate,
    maturityDate: formState.maturityDate,
    lastPaymentDate: formState.useMaturityAsLastPayment
      ? formState.maturityDate
      : formState.lastPaymentDate,
    premiumAmount: Number(formState.premiumAmount),
    sumAssured: Number(formState.sumAssured),
    additionalNote: formState.additionalNote.trim(),
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function PoliciesPage() {
  const { user } = useAuth()

  const [policies, setPolicies] = useState<PolicyRecord[] | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create")
  const [activePolicy, setActivePolicy] = useState<PolicyRecord | null>(null)
  const [formState, setFormState] = useState<PolicyFormState>(createEmptyFormState())
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [policyToDelete, setPolicyToDelete] = useState<PolicyRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [payingPolicyId, setPayingPolicyId] = useState<string | null>(null)

  const today = getTodayYmd()
  const isLoading = policies === null
  const policyList = useMemo(() => policies ?? [], [policies])

  useEffect(() => {
    if (!user?.uid) {
      return
    }

    let cancelled = false

    const load = async () => {
      try {
        const nextPolicies = await listPolicies(user.uid)
        if (!cancelled) {
          setPolicies(nextPolicies)
          setErrorMessage(null)
        }
      } catch (error) {
        if (cancelled) {
          return
        }
        if (error instanceof FirebaseError) {
          setErrorMessage(error.message)
        } else {
          setErrorMessage("Unable to load policies right now.")
        }
        setPolicies([])
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [reloadNonce, user?.uid])

  const totalSumAssured = useMemo(
    () => policyList.reduce((sum, policy) => sum + policy.sumAssured, 0),
    [policyList]
  )

  const policiesWithDueNow = useMemo(
    () =>
      policyList.filter(
        (policy) =>
          policy.premiumMethod !== "single" &&
          policy.nextPaymentDate &&
          policy.nextPaymentDate <= today
      ).length,
    [policyList, today]
  )

  const refreshPolicies = () => {
    setPolicies(null)
    setReloadNonce((prev) => prev + 1)
  }

  const openCreateDrawer = () => {
    setDrawerMode("create")
    setActivePolicy(null)
    setFormState(createEmptyFormState())
    setFormError(null)
    setIsSaving(false)
    setDrawerOpen(true)
  }

  const openEditDrawer = (policy: PolicyRecord) => {
    setDrawerMode("edit")
    setActivePolicy(policy)
    setFormState(toFormState(policy))
    setFormError(null)
    setDrawerOpen(true)
  }

  const openViewDrawer = (policy: PolicyRecord) => {
    setDrawerMode("view")
    setActivePolicy(policy)
    setFormError(null)
    setDrawerOpen(true)
  }

  const closeDrawer = (isOpen: boolean) => {
    setDrawerOpen(isOpen)
    if (isOpen) {
      return
    }

    setDrawerMode("create")
    setActivePolicy(null)
    setFormError(null)
    setIsSaving(false)
  }

  const validateForm = (value: PolicyFormState) => {
    if (
      !value.insurerName.trim() ||
      !value.policyNumber.trim() ||
      !value.beneficiaryName.trim() ||
      !value.policyStartDate ||
      !value.maturityDate ||
      (!value.useMaturityAsLastPayment && !value.lastPaymentDate)
    ) {
      return "Please complete all required fields."
    }

    if (value.policyStartDate > value.maturityDate) {
      return "Maturity date must be after policy start date."
    }

    const effectiveLastPaymentDate = value.useMaturityAsLastPayment
      ? value.maturityDate
      : value.lastPaymentDate

    if (value.policyStartDate > effectiveLastPaymentDate) {
      return "Last payment date must be on or after policy start date."
    }

    if (effectiveLastPaymentDate > value.maturityDate) {
      return "Last payment date must not be after maturity date."
    }

    const premiumAmount = Number(value.premiumAmount)
    const sumAssured = Number(value.sumAssured)

    if (!Number.isFinite(premiumAmount) || premiumAmount <= 0) {
      return "Premium amount must be a positive number."
    }

    if (!Number.isFinite(sumAssured) || sumAssured <= 0) {
      return "Sum assured must be a positive number."
    }

    return null
  }

  const handleSave = async () => {
    if (!user?.uid) {
      return
    }

    const validationError = validateForm(formState)
    if (validationError) {
      setFormError(validationError)
      return
    }

    setIsSaving(true)
    setFormError(null)
    setActionMessage(null)

    try {
      const payload = toPolicyInput(formState)

      if (drawerMode === "edit" && activePolicy) {
        await updatePolicy(activePolicy.id, payload)
      } else {
        await createPolicy(user.uid, payload)
      }

      closeDrawer(false)
      setFormState(createEmptyFormState())
      refreshPolicies()
    } catch (error) {
      if (error instanceof FirebaseError) {
        setFormError(error.message)
      } else {
        setFormError("Unable to save this policy right now.")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!policyToDelete) {
      return
    }

    setIsDeleting(true)
    setActionMessage(null)

    try {
      await deletePolicy(policyToDelete.id)
      setPolicyToDelete(null)
      refreshPolicies()
    } catch (error) {
      if (error instanceof FirebaseError) {
        setActionMessage(error.message)
      } else {
        setActionMessage("Unable to delete this policy right now.")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMarkAsPaid = async (policy: PolicyRecord) => {
    setPayingPolicyId(policy.id)
    setActionMessage(null)

    try {
      const wasPaid = await markNextInstallmentPaid(policy.id)

      if (!wasPaid) {
        setActionMessage("No due installment is currently eligible for payment.")
      }

      refreshPolicies()
    } catch (error) {
      if (error instanceof FirebaseError) {
        setActionMessage(error.message)
      } else {
        setActionMessage("Unable to mark this installment as paid.")
      }
    } finally {
      setPayingPolicyId(null)
    }
  }

  const isMarkAsPaidEnabled = (policy: PolicyRecord) => {
    if (policy.premiumMethod === "single" || !policy.nextPaymentDate) {
      return false
    }

    return policy.nextPaymentDate <= today
  }

  return (
    <ProtectedRoute>
      <main className="min-h-svh px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <Card className="border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent">
            <CardHeader className="gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <Badge className="w-fit rounded-full" variant="secondary">
                    Protected workspace
                  </Badge>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Table2 className="size-5 text-primary" />
                    Policy table
                  </CardTitle>
                  <CardDescription>
                    Add, track, and manage policies with installment-aware actions.
                  </CardDescription>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto">
                  <Button onClick={openCreateDrawer} className="w-full sm:w-auto">
                    <Plus className="size-4" />
                    Add policy
                  </Button>
                  <Button variant="outline" asChild className="w-full sm:w-auto">
                    <Link href="/dashboard">Go to dashboard</Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Total policies"
              value={String(policyList.length)}
              icon={<ShieldCheck className="size-4 text-primary" />}
            />
            <MetricCard
              title="Total sum assured"
              value={formatCurrency(totalSumAssured)}
              icon={<ReceiptIndianRupee className="size-4 text-primary" />}
            />
            <MetricCard
              title="Due now"
              value={String(policiesWithDueNow)}
              icon={<CalendarClock className="size-4 text-primary" />}
            />
          </div>

          {actionMessage ? (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {actionMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <Card className="border border-destructive/40 bg-destructive/10">
              <CardContent className="py-4">
                <p className="text-sm text-destructive">{errorMessage}</p>
              </CardContent>
            </Card>
          ) : null}

          {isLoading ? (
            <Card className="border border-border/70 bg-card/90">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground">Loading policies...</p>
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && policyList.length === 0 ? (
            <Card className="border border-border/70 bg-card/90">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground">
                  No policies yet. Add your first policy to start tracking premiums.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && policyList.length > 0 ? (
            <>
              <div className="md:hidden">
                <Carousel
                  opts={{ align: "start", containScroll: "trimSnaps" }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-3">
                    {policyList.map((policy) => (
                      <CarouselItem key={policy.id} className="basis-full pl-3">
                        <Card className="border border-border/70 bg-card/90">
                          <CardHeader className="gap-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <CardTitle className="text-base">{policy.insurerName}</CardTitle>
                                <CardDescription>#{policy.policyNumber}</CardDescription>
                              </div>
                              <Badge
                                variant={
                                  isMarkAsPaidEnabled(policy) ? "destructive" : "secondary"
                                }
                              >
                                {policy.nextPaymentDate
                                  ? `Next: ${policy.nextPaymentDate}`
                                  : "No dues"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <InfoPair label="Beneficiary" value={policy.beneficiaryName} />
                              <InfoPair
                                label="Method"
                                value={premiumMethodLabels[policy.premiumMethod]}
                              />
                              <InfoPair
                                label="Premium"
                                value={formatCurrency(policy.premiumAmount)}
                              />
                              <InfoPair
                                label="Sum assured"
                                value={formatCurrency(policy.sumAssured)}
                              />
                              <InfoPair
                                label="Last paid"
                                value={policy.lastPremiumPaymentDate ?? "N/A"}
                              />
                              <InfoPair
                                label="Pending"
                                value={String(policy.pendingInstallments)}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openViewDrawer(policy)}
                              >
                                <Eye className="size-4" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDrawer(policy)}
                              >
                                <FilePenLine className="size-4" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPolicyToDelete(policy)}
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => void handleMarkAsPaid(policy)}
                                disabled={
                                  !isMarkAsPaidEnabled(policy) ||
                                  payingPolicyId === policy.id
                                }
                              >
                                {payingPolicyId === policy.id ? "Paying..." : "Mark paid"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>

              <Card className="hidden border border-border/70 bg-card/90 md:block">
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Policy</TableHead>
                        <TableHead>Beneficiary</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Premium</TableHead>
                        <TableHead>Last paid</TableHead>
                        <TableHead>Next payment</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policyList.map((policy) => (
                        <TableRow key={policy.id}>
                          <TableCell>
                            <div className="font-medium">{policy.insurerName}</div>
                            <div className="text-xs text-muted-foreground">
                              #{policy.policyNumber}
                            </div>
                          </TableCell>
                          <TableCell>{policy.beneficiaryName}</TableCell>
                          <TableCell>{premiumMethodLabels[policy.premiumMethod]}</TableCell>
                          <TableCell>{formatCurrency(policy.premiumAmount)}</TableCell>
                          <TableCell>{policy.lastPremiumPaymentDate ?? "N/A"}</TableCell>
                          <TableCell>
                            {policy.nextPaymentDate ? (
                              <Badge
                                variant={
                                  isMarkAsPaidEnabled(policy) ? "destructive" : "secondary"
                                }
                              >
                                {policy.nextPaymentDate}
                              </Badge>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openViewDrawer(policy)}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDrawer(policy)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPolicyToDelete(policy)}
                              >
                                Delete
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => void handleMarkAsPaid(policy)}
                                disabled={
                                  !isMarkAsPaidEnabled(policy) ||
                                  payingPolicyId === policy.id
                                }
                              >
                                {payingPolicyId === policy.id ? "Paying..." : "Mark paid"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </main>

      <Drawer open={drawerOpen} onOpenChange={closeDrawer}>
        <DrawerContent key={`${drawerMode}-${activePolicy?.id ?? "new"}`}>
          <DrawerHeader>
            <DrawerTitle>
              {drawerMode === "create"
                ? "Add policy"
                : drawerMode === "edit"
                  ? "Edit policy"
                  : "Policy details"}
            </DrawerTitle>
            <DrawerDescription>
              {drawerMode === "view"
                ? "Review the full policy information and installment status."
                : "Provide policy details. Installments are auto-generated and paid up to today by default."}
            </DrawerDescription>
          </DrawerHeader>

          {drawerMode === "view" && activePolicy ? (
            <div className="space-y-3 overflow-y-auto px-4 pb-6 text-sm">
              <InfoPair label="Insurer" value={activePolicy.insurerName} />
              <InfoPair label="Policy number" value={activePolicy.policyNumber} />
              <InfoPair label="Beneficiary" value={activePolicy.beneficiaryName} />
              <InfoPair
                label="Premium method"
                value={premiumMethodLabels[activePolicy.premiumMethod]}
              />
              <InfoPair label="Policy start date" value={activePolicy.policyStartDate} />
              <InfoPair label="Maturity date" value={activePolicy.maturityDate} />
              <InfoPair label="Last payment date" value={activePolicy.lastPaymentDate} />
              <InfoPair
                label="Premium amount"
                value={formatCurrency(activePolicy.premiumAmount)}
              />
              <InfoPair
                label="Sum assured"
                value={formatCurrency(activePolicy.sumAssured)}
              />
              <InfoPair
                label="Last premium payment"
                value={activePolicy.lastPremiumPaymentDate ?? "N/A"}
              />
              <InfoPair
                label="Next payment date"
                value={activePolicy.nextPaymentDate ?? "N/A"}
              />
              <InfoPair
                label="Installments (paid/pending)"
                value={`${activePolicy.paidInstallments}/${activePolicy.pendingInstallments}`}
              />
              <InfoPair
                label="Additional note"
                value={activePolicy.additionalNote || "N/A"}
              />
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto px-4 pb-2">
              <FormField label="Insurer name" required htmlFor="insurerName">
                <Input
                  id="insurerName"
                  value={formState.insurerName}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      insurerName: event.target.value,
                    }))
                  }
                  placeholder="e.g. LIC"
                />
              </FormField>

              <FormField label="Policy number" required htmlFor="policyNumber">
                <Input
                  id="policyNumber"
                  value={formState.policyNumber}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      policyNumber: event.target.value,
                    }))
                  }
                  placeholder="e.g. LIC-0012345"
                />
              </FormField>

              <FormField label="Beneficiary name" required htmlFor="beneficiaryName">
                <Input
                  id="beneficiaryName"
                  value={formState.beneficiaryName}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      beneficiaryName: event.target.value,
                    }))
                  }
                  placeholder="e.g. Priya Sharma"
                />
              </FormField>

              <FormField label="Premium method" required htmlFor="premiumMethod">
                <Select
                  value={formState.premiumMethod}
                  onValueChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      premiumMethod: value as PremiumMethod,
                    }))
                  }
                >
                  <SelectTrigger id="premiumMethod" className="w-full">
                    <SelectValue placeholder="Select premium method" />
                  </SelectTrigger>
                  <SelectContent>
                    {premiumMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {premiumMethodLabels[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Policy start date" required htmlFor="policyStartDate">
                  <Input
                    id="policyStartDate"
                    type="date"
                    value={formState.policyStartDate}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        policyStartDate: event.target.value,
                      }))
                    }
                  />
                </FormField>
                <FormField label="Maturity date" required htmlFor="maturityDate">
                  <Input
                    id="maturityDate"
                    type="date"
                    value={formState.maturityDate}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        maturityDate: event.target.value,
                        lastPaymentDate: prev.useMaturityAsLastPayment
                          ? event.target.value
                          : prev.lastPaymentDate,
                      }))
                    }
                  />
                </FormField>
              </div>

              <div className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Last payment date</p>
                    <p className="text-xs text-muted-foreground">
                      Set the final premium payment date before maturity.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sameAsMaturityDate" className="text-xs">
                      Same as maturity
                    </Label>
                    <Switch
                      id="sameAsMaturityDate"
                      checked={formState.useMaturityAsLastPayment}
                      onCheckedChange={(checked) =>
                        setFormState((prev) => ({
                          ...prev,
                          useMaturityAsLastPayment: checked,
                          lastPaymentDate: checked
                            ? prev.maturityDate
                            : prev.lastPaymentDate || prev.maturityDate,
                        }))
                      }
                    />
                  </div>
                </div>
                <FormField label="Last payment date" required htmlFor="lastPaymentDate">
                  <Input
                    id="lastPaymentDate"
                    type="date"
                    value={
                      formState.useMaturityAsLastPayment
                        ? formState.maturityDate
                        : formState.lastPaymentDate
                    }
                    disabled={formState.useMaturityAsLastPayment}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        lastPaymentDate: event.target.value,
                      }))
                    }
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Premium amount" required htmlFor="premiumAmount">
                  <Input
                    id="premiumAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.premiumAmount}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        premiumAmount: event.target.value,
                      }))
                    }
                    placeholder="e.g. 5000"
                  />
                </FormField>
                <FormField label="Sum assured" required htmlFor="sumAssured">
                  <Input
                    id="sumAssured"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.sumAssured}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        sumAssured: event.target.value,
                      }))
                    }
                    placeholder="e.g. 1000000"
                  />
                </FormField>
              </div>

              <FormField label="Additional note (optional)" htmlFor="additionalNote">
                <Textarea
                  id="additionalNote"
                  value={formState.additionalNote}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      additionalNote: event.target.value,
                    }))
                  }
                  placeholder="Any optional details about this policy"
                />
              </FormField>

              {formError ? (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              ) : null}
            </div>
          )}

          <DrawerFooter>
            {drawerMode === "view" ? (
              <DrawerClose asChild>
                <Button type="button" variant="outline">Close</Button>
              </DrawerClose>
            ) : (
              <>
                <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save policy"}
                </Button>
                <DrawerClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DrawerClose>
              </>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog
        open={Boolean(policyToDelete)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPolicyToDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete policy?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the policy and all generated installments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  )
}

function FormField({
  label,
  htmlFor,
  required = false,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: ReactNode
}) {
  return (
    <Card className="border border-border/70 bg-card/90">
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
        <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/15">
          {icon}
        </span>
      </CardContent>
    </Card>
  )
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value}</p>
    </div>
  )
}
