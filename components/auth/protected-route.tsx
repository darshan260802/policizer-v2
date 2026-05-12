"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen"
import { useAuth } from "@/components/auth/auth-provider"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading || user) {
      return
    }

    router.replace("/login")
  }, [isLoading, router, user])

  if (isLoading || !user) {
    return <AuthLoadingScreen message="Loading your dashboard..." />
  }

  return <>{children}</>
}

export { ProtectedRoute }
