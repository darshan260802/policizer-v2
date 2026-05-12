"use client"

import { useState } from "react"
import { FirebaseError } from "firebase/app"
import { BellRing, FileSpreadsheet, LayoutGrid, LogOut, ShieldCheck, Table2 } from "lucide-react"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/components/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const quickActions = [
  {
    title: "Policy table",
    description: "View all policies in one structured list.",
    icon: Table2,
  },
  {
    title: "Dashboard analytics",
    description: "Track projected returns and premium obligations.",
    icon: LayoutGrid,
  },
  {
    title: "Reminders",
    description: "See upcoming due dates and maturity notifications.",
    icon: BellRing,
  },
  {
    title: "Export center",
    description: "Download policy reports in PDF and Excel.",
    icon: FileSpreadsheet,
  },
]

export default function DashboardPage() {
  const { user, signOutUser } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setErrorMessage(null)

    try {
      await signOutUser()
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage("Unable to sign out right now. Please try again.")
      }
      setIsSigningOut(false)
    }
  }

  return (
    <ProtectedRoute>
      <main className="min-h-svh px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          <Card className="border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent">
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Badge className="rounded-full" variant="secondary">
                    Signed in
                  </Badge>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <ShieldCheck className="size-5 text-primary" />
                    Welcome back{user?.displayName ? `, ${user.displayName}` : ""}
                  </CardTitle>
                  <CardDescription>{user?.email ?? "Google account connected"}</CardDescription>
                </div>
                <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
                  <LogOut className="size-4" />
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </Button>
              </div>
              {errorMessage ? (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}
            </CardHeader>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.title} className="border border-border/70 bg-card/90">
                  <CardHeader className="gap-2">
                    <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="secondary" disabled>
                      Coming soon
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  )
}
