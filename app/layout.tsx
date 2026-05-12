import type { Metadata } from "next"
import { Geist_Mono, JetBrains_Mono, Space_Grotesk } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const jetbrainsMonoHeading = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-heading",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Policizer | Dark Mode Insurance Policy Manager",
  description:
    "Track LIC, Max Life, and all your insurance policies in one mobile-first app with reminders, analytics, and exports.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
      <html
        lang="en"
        suppressHydrationWarning
        className={cn(
          "dark antialiased",
          fontMono.variable,
          "font-sans",
          spaceGrotesk.variable,
          jetbrainsMonoHeading.variable
        )}
      >
      <body>
        <ThemeProvider defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
