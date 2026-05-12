"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
} from "recharts"
import {
  ArrowRight,
  BellRing,
  ChartNoAxesCombined,
  Download,
  FileCheck2,
  FileSpreadsheet,
  ShieldCheck,
  Table2,
  WalletCards,
} from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PublicRoute } from "@/components/auth/public-route"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const insurers = ["LIC", "Max Life", "HDFC Life", "ICICI Prudential", "SBI Life"]

const featureCards: Array<{
  title: string
  description: string
  icon: LucideIcon
}> = [
  {
    title: "Policy CRUD",
    description: "Add, update, and organize policy details in one secure place.",
    icon: FileCheck2,
  },
  {
    title: "Single table view",
    description: "See all your policies with due dates, premiums, and status at a glance.",
    icon: Table2,
  },
  {
    title: "Dashboard analytics",
    description: "Track lump sum amount, estimated returns, and premium obligations visually.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Smart reminders",
    description: "Never miss premium due dates or maturity milestones with proactive alerts.",
    icon: BellRing,
  },
  {
    title: "Export reports",
    description: "Export your policy data to PDF and Excel for advisors or personal review.",
    icon: FileSpreadsheet,
  },
  {
    title: "Installable app",
    description: "Use it like a native app on Android, iOS, Windows, and macOS.",
    icon: Download,
  },
]

const growthData = [
  { month: "Jan", invested: 125000, value: 127100 },
  { month: "Feb", invested: 131000, value: 134600 },
  { month: "Mar", invested: 138500, value: 144300 },
  { month: "Apr", invested: 146000, value: 154900 },
  { month: "May", invested: 152000, value: 163200 },
  { month: "Jun", invested: 160000, value: 175500 },
]

const chartConfig = {
  invested: {
    label: "Invested",
    color: "var(--chart-2)",
  },
  value: {
    label: "Current value",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const policyPreviewRows = [
  { provider: "LIC Jeevan Anand", type: "Term", due: "14 May", status: "Due soon" },
  { provider: "Max Life Smart Wealth", type: "ULIP", due: "02 Jun", status: "On track" },
  { provider: "SBI Life eShield", type: "Term", due: "18 Jun", status: "On track" },
]

const faqs = [
  {
    question: "Can I install this app on phone and laptop?",
    answer:
      "Yes. Policizer is designed as an installable PWA so you can use it on Android, iOS, Windows, and macOS.",
  },
  {
    question: "Will I get reminders for premium due and maturity?",
    answer:
      "Yes. Reminder workflows are planned for premium due dates, maturity timelines, and important policy milestones.",
  },
  {
    question: "Can I export policy details for my CA or advisor?",
    answer:
      "Yes. Export support for PDF and Excel is part of the core workflow so sharing records remains simple.",
  },
]

export default function Page() {
  return (
    <PublicRoute>
      <main className="min-h-svh bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-10">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-primary/20 text-primary ring-1 ring-primary/30">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium">Policizer</p>
                <p className="text-xs text-muted-foreground">Insurance Policy Manager</p>
              </div>
            </div>
            <Badge variant="secondary" className="rounded-full">
              Dark mode only
            </Badge>
          </header>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <Badge variant="outline" className="rounded-full border-primary/30 text-primary">
                Mobile-first experience
              </Badge>
              <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
                Manage every policy in one calm, smart dashboard.
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Track LIC, Max Life, and other policies in a single place with reminders,
                table views, analytics, and easy exports.
              </p>
              <div id="install" className="flex flex-col gap-2 sm:flex-row">
                <Button size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/login">
                    Continue with Google
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                  <a href="#features">Explore features</a>
                </Button>
              </div>
            </div>

            <Card className="border border-primary/20 bg-linear-to-b from-card to-card/80">
              <CardHeader>
                <CardTitle>At-a-glance performance</CardTitle>
                <CardDescription>Quick snapshot across all active policies</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <StatTile label="Lump sum" value="Rs 17.5L" />
                <StatTile label="Projected returns" value="Rs 22.1L" />
                <StatTile label="Pending premiums" value="Rs 48K" />
                <StatTile label="Next due date" value="14 May" />
              </CardContent>
            </Card>
          </section>

        <section className="space-y-3">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Built for Indian policy holders
          </p>
          <div className="flex flex-wrap gap-2">
            {insurers.map((insurer) => (
              <Badge key={insurer} variant="outline" className="rounded-full px-3 py-1">
                {insurer}
              </Badge>
            ))}
          </div>
        </section>

        <Separator />

        <section id="features" className="space-y-4">
          <div className="space-y-2">
            <Badge variant="secondary" className="rounded-full">
              Core capabilities
            </Badge>
            <h2 className="font-heading text-2xl">Everything you need to stay policy-ready</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title} size="sm" className="border border-border/70 bg-card/90">
                  <CardHeader className="gap-2">
                    <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border border-border/70 bg-card/90">
            <CardHeader>
              <CardTitle>Returns trend</CardTitle>
              <CardDescription>Illustrative dashboard view for total invested vs current value</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <AreaChart data={growthData} margin={{ left: 8, right: 8 }}>
                  <defs>
                    <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Area
                    type="monotone"
                    dataKey="invested"
                    stroke="var(--color-invested)"
                    fill="none"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-value)"
                    fill="url(#valueGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/90">
            <CardHeader>
              <CardTitle>Unified policy table preview</CardTitle>
              <CardDescription>One place to track due dates and status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policyPreviewRows.map((row) => (
                    <TableRow key={row.provider}>
                      <TableCell className="max-w-[170px] truncate">{row.provider}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>{row.due}</TableCell>
                      <TableCell>
                        <Badge
                          variant={row.status === "Due soon" ? "destructive" : "secondary"}
                          className="rounded-full"
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>How it works</CardTitle>
              <CardDescription>From setup to reminders in 3 simple steps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Step index={1} title="Add policies" body="Enter policy details once and keep everything centralized." />
              <Step index={2} title="Track dashboard" body="Watch premium obligations and projected returns together." />
              <Step index={3} title="Act on reminders" body="Install the app and stay ahead of due dates and maturity." />
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/90">
            <CardHeader>
              <CardTitle>Frequently asked questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {faqs.map((faq) => (
                  <AccordionItem key={faq.question} value={faq.question}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>

          <Card className="border border-primary/30 bg-linear-to-r from-primary/15 via-primary/10 to-transparent">
            <CardHeader>
              <CardTitle className="text-xl">Ready to simplify policy management?</CardTitle>
              <CardDescription>
                Sign in and keep your premiums, maturity timelines, and returns visible in one place.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/login">
                  <Download className="size-4" />
                  Continue with Google
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <WalletCards className="size-4" />
                View product roadmap
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </PublicRoute>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function Step({
  index,
  title,
  body,
}: {
  index: number
  title: string
  body: string
}) {
  return (
    <div className="flex gap-3">
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
        {index}
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}
