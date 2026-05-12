"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen"
import { useAuth } from "@/components/auth/auth-provider"

function PublicRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading || !user) {
      return
    }

    router.replace("/dashboard")
  }, [isLoading, router, user])

  if (isLoading || user) {
    return <AuthLoadingScreen message="Checking account..." />
  }

  return <>{children}</>
}

export { PublicRoute }
