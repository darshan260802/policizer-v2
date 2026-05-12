"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { FirebaseError } from "firebase/app"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
} from "recharts"
import {
  BellRing,
  ChartColumnIncreasing,
  ListPlus,
  LogOut,
  ReceiptIndianRupee,
  ShieldCheck,
} from "lucide-react"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/components/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  getPolicyInsights,
  getTodayYmd,
  listPolicies,
  type PolicyRecord,
} from "@/lib/policies"

const chartConfig = {
  count: {
    label: "Policies",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function DashboardPage() {
  const { user, signOutUser } = useAuth()

  const [policies, setPolicies] = useState<PolicyRecord[] | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
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
          setErrorMessage("Unable to load dashboard insights right now.")
        }
        setPolicies([])
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [user?.uid])

  const insights = useMemo(() => getPolicyInsights(policyList), [policyList])

  const upcomingDue = useMemo(() => {
    const today = getTodayYmd()
    return policyList
      .filter((policy) => policy.nextPaymentDate && policy.nextPaymentDate >= today)
      .sort((a, b) => (a.nextPaymentDate ?? "").localeCompare(b.nextPaymentDate ?? ""))
      .slice(0, 5)
  }, [policyList])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setSignOutError(null)

    try {
      await signOutUser()
    } catch (error) {
      if (error instanceof FirebaseError) {
        setSignOutError(error.message)
      } else {
        setSignOutError("Unable to sign out right now. Please try again.")
      }
      setIsSigningOut(false)
    }
  }

  return (
    <ProtectedRoute>
      <main className="min-h-svh px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <Card className="border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent">
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Badge className="rounded-full" variant="secondary">
                    Insights dashboard
                  </Badge>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <ShieldCheck className="size-5 text-primary" />
                    Welcome back{user?.displayName ? `, ${user.displayName}` : ""}
                  </CardTitle>
                  <CardDescription>{user?.email ?? "Google account connected"}</CardDescription>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/policies">
                      <ListPlus className="size-4" />
                      Manage policies
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
                    <LogOut className="size-4" />
                    {isSigningOut ? "Signing out..." : "Sign out"}
                  </Button>
                </div>
              </div>
              {signOutError ? (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {signOutError}
                </p>
              ) : null}
            </CardHeader>
          </Card>

          {errorMessage ? (
            <Card className="border border-destructive/40 bg-destructive/10">
              <CardContent className="py-4">
                <p className="text-sm text-destructive">{errorMessage}</p>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InsightCard
              title="Total policies"
              value={String(insights.totalPolicies)}
              icon={<ShieldCheck className="size-4 text-primary" />}
            />
            <InsightCard
              title="Total sum assured"
              value={formatCurrency(insights.totalSumAssured)}
              icon={<ReceiptIndianRupee className="size-4 text-primary" />}
            />
            <InsightCard
              title="Total premium amount"
              value={formatCurrency(insights.totalPremiumAmount)}
              icon={<ChartColumnIncreasing className="size-4 text-primary" />}
            />
            <InsightCard
              title="Due now"
              value={String(insights.dueNowCount)}
              icon={<BellRing className="size-4 text-primary" />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border border-border/70 bg-card/90">
              <CardHeader>
                <CardTitle>Policies by premium method</CardTitle>
                <CardDescription>Distribution based on saved policies</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading chart...</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-56 w-full">
                    <BarChart data={insights.methodBreakdown}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="method"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={8} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/90">
              <CardHeader>
                <CardTitle>Upcoming payment dates</CardTitle>
                <CardDescription>Nearest pending dues from your policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading dues...</p>
                ) : upcomingDue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No pending dues. Add policies in the policy table to get reminders.
                  </p>
                ) : (
                  upcomingDue.map((policy) => (
                    <div
                      key={policy.id}
                      className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/40 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{policy.insurerName}</p>
                        <p className="text-xs text-muted-foreground">
                          #{policy.policyNumber}
                        </p>
                      </div>
                      <Badge variant="secondary">{policy.nextPaymentDate}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  )
}

function InsightCard({
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
