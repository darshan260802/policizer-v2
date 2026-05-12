"use client"

import Link from "next/link"
import { useState } from "react"
import { FirebaseError } from "firebase/app"
import { LogIn, ShieldCheck } from "lucide-react"

import { PublicRoute } from "@/components/auth/public-route"
import { useAuth } from "@/components/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await signInWithGoogle()
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage("Unable to sign in right now. Please try again.")
      }
      setIsSubmitting(false)
    }
  }

  return (
    <PublicRoute>
      <main className="flex min-h-svh items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md border border-border/70 bg-card/90">
          <CardHeader className="space-y-3">
            <Badge variant="secondary" className="w-fit rounded-full">
              Secure sign-in
            </Badge>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-primary/20 text-primary ring-1 ring-primary/30">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <CardTitle className="text-xl">Welcome to Policizer</CardTitle>
                <CardDescription>Continue with Google to access your dashboard</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button onClick={handleGoogleSignIn} disabled={isSubmitting} className="w-full" size="lg">
              <LogIn className="size-4" />
              {isSubmitting ? "Signing in..." : "Continue with Google"}
            </Button>

            {errorMessage ? (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}

            <Separator />

            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to use this app for personal policy tracking.
            </p>

            <Button variant="ghost" className="w-full" asChild>
              <Link href="/">Back to landing page</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </PublicRoute>
  )
}
