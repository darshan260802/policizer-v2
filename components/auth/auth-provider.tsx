"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { FirebaseError } from "firebase/app"
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth"

import { auth, googleProvider } from "@/lib/firebase"

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setIsLoading(false)
    })

    return unsubscribe
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      signInWithGoogle: async () => {
        try {
          await signInWithPopup(auth, googleProvider)
        } catch (error) {
          if (
            error instanceof FirebaseError &&
            (error.code === "auth/popup-blocked" ||
              error.code === "auth/popup-closed-by-user" ||
              error.code === "auth/cancelled-popup-request")
          ) {
            await signInWithRedirect(auth, googleProvider)
            return
          }

          throw error
        }
      },
      signOutUser: async () => signOut(auth),
    }),
    [isLoading, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}

export { AuthProvider, useAuth }
