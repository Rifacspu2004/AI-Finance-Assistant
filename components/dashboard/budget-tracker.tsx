"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Sparkles, TrendingUp, ShieldCheck, AlertTriangle,
  Lightbulb, RefreshCw, ChevronRight, Loader2,
  PiggyBank, ShoppingCart, Heart, TriangleAlert, ArrowRight,
} from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, onSnapshot } from "firebase/firestore"
import { UserBankProfile } from "@/lib/user-profile"
import { cn } from "@/lib/utils"

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n)
}

const PLAN_HEADERS = [
  "SUMMARY",
  "NEEDS",
  "WANTS",
  "SAVINGS",
  "INVESTMENTS",
  "EMERGENCY FUND",
  "KEY TIPS",
  "WARNINGS",
]

function cleanMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim()
}

function normalizedHeader(line: string) {
  return cleanMarkdown(line)
    .replace(/^#{1,6}\s*/, "")
    .replace(/[*_]/g, "")
    .trim()
    .toUpperCase()
}

function isPlanHeader(line: string, header: string) {
  const normalized = normalizedHeader(line)
  return normalized === header || new RegExp(`^${header}(?:\\s|—|–|-|:)`, "i").test(normalized)
}

/** Extract sections from plain text or Markdown-formatted AI responses. */
function extractSection(text: string, header: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n")
  const start = lines.findIndex((line) => isPlanHeader(line, header))
  if (start < 0) return ""

  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (PLAN_HEADERS.some((nextHeader) => isPlanHeader(lines[index], nextHeader))) {
      end = index
      break
    }
  }

  return cleanMarkdown(lines.slice(start + 1, end).join("\n"))
}

// ── No-income banner ──────────────────────────────────────────────────────────
function NoIncomeBanner() {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-destructive/30 bg-destructive/5 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlert className="h-7 w-7 text-destructive" />
      </div>
      <div>
        <p className="font-serif text-lg font-bold text-foreground">Monthly income not set</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Aeris AI needs your monthly income to build a personalised financial plan. Please update your profile.
        </p>
      </div>
      <button
        onClick={() => router.push("/profile")}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
      >
        Update Profile <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Budget bar ────────────────────────────────────────────────────────────────
function BudgetBar({ label, amount, pct, color, Icon, hint }: {
  label: string; amount: number; pct: number; color: string; Icon: any; hint: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" style={{ color }} />
          <span className="text-sm font-semibold text-card-foreground">{label}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">{hint}</span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-card-foreground">
          {fmt(amount)}<span className="text-xs font-normal text-muted-foreground">/mo</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: "var(--chart-1)" }} />
      </div>
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function PlanSection({ icon: Icon, iconColor, title, children }: {
  icon: any; iconColor: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${iconColor}20` }}>
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
        <h3 className="font-serif text-sm font-bold text-card-foreground">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── Investment row parser ─────────────────────────────────────────────────────
function InvestmentRows({ text }: { text: string }) {
  const lines = text.split("\n").filter(l => l.trim().startsWith("•"))
  if (!lines.length) {
    return <p className="text-xs text-muted-foreground whitespace-pre-line">{text}</p>
  }
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        // Parse: • Name: $X/month | Return: X% p.a. | 1yr: $X | 5yr: $X | Risk: Low
        const parts = line.replace("•", "").split("|").map(s => s.trim())
        const name = parts[0]?.replace(/:.*/, "").trim()
        const monthly = parts[0]?.match(/\$[\d,]+/)?.[0] ?? ""
        const ret = parts[1]?.replace("Return:", "").trim() ?? ""
        const yr1 = parts[2]?.replace("1yr:", "").trim() ?? ""
        const yr5 = parts[3]?.replace("5yr:", "").trim() ?? ""
        const risk = parts[4]?.replace("Risk:", "").trim() ?? ""
        const riskBg = risk === "Low" ? "text-chart-3 bg-chart-3/10" : risk === "High" ? "text-destructive bg-destructive/10" : "text-chart-4 bg-chart-4/10"
        return (
          <div key={i} className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                  style={{ backgroundColor: colors[i % colors.length] }}>
                  {(name || "??").slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{monthly}/month</p>
                </div>
              </div>
              {risk && (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", riskBg)}>{risk}</span>
              )}
            </div>
            {(ret || yr1 || yr5) && (
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary p-2 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">Return p.a.</p>
                  <p className="text-xs font-bold text-chart-3">{ret}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">1-Year</p>
                  <p className="text-xs font-bold text-foreground">{yr1}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">5-Year</p>
                  <p className="text-xs font-bold text-primary">{yr5}</p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Numbered list renderer ───────────────────────────────────────────────────
function NumberedList({ text }: { text: string }) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => cleanMarkdown(line).replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            {String(i + 1).padStart(2, "0")}
          </span>
          <p className="text-sm leading-relaxed text-card-foreground">{line}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function BudgetTracker() {
  const [profile, setProfile] = useState<UserBankProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [advice, setAdvice] = useState("")
  const [apiError, setApiError] = useState<string | null>(null)

  // Live Firestore listener — reacts when profile is saved from /profile page
  useEffect(() => {
    let unsubSnap: (() => void) | null = null
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubSnap?.()
      if (!user) { setLoading(false); setProfile(null); return }
      unsubSnap = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          if (snap.exists()) setProfile(snap.data() as UserBankProfile)
          setLoading(false)
        },
        () => setLoading(false)
      )
    })
    return () => { unsubAuth(); unsubSnap?.() }
  }, [])

  // Prefer monthlyIncome directly from profile; fallback to annualIncome / 12
  const annualIncome  = parseFloat(profile?.annualIncome  || "0")
  const profileMonthly = parseFloat(profile?.monthlyIncome || "0")
  const monthlyIncome = profileMonthly > 0
    ? Math.round(profileMonthly)
    : annualIncome > 0
      ? Math.round(annualIncome / 12)
      : 5000
  const needs   = Math.round(monthlyIncome * 0.5)
  const wants   = Math.round(monthlyIncome * 0.3)
  const savings = Math.round(monthlyIncome * 0.2)
  const hasIncome = monthlyIncome > 0

  async function callGroq() {
    if (!profile || !hasIncome) return
    setGenerating(true)
    setApiError(null)
    setAdvice("")
    try {
      const res = await fetch("/api/ai-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetMode: "full_plan",
          fullName: profile.fullName,
          annualIncome: annualIncome > 0 ? annualIncome : monthlyIncome * 12,
          monthlyIncome,
          employmentStatus: profile.employmentStatus,
          sourceOfFunds: profile.sourceOfFunds,
          accountType: profile.accountType,
          country: profile.country,
          needs,
          wants,
          savings,
        }),
      })
      const data = await res.json()
      if (!res.ok || typeof data.advice !== "string" || !data.advice.trim()) {
        setApiError(typeof data.advice === "string" && data.advice.trim()
          ? data.advice
          : "AI returned no usable response. Please try again.")
      } else {
        setAdvice(data.advice)
      }
    } catch (err: any) {
      setApiError(err.message ?? "Network error.")
    } finally {
      setGenerating(false)
    }
  }

  // Parse sections from AI response
  const summary    = extractSection(advice, "SUMMARY")
  const needsTxt   = extractSection(advice, "NEEDS")
  const wantsTxt   = extractSection(advice, "WANTS")
  const savingsTxt = extractSection(advice, "SAVINGS")
  const investTxt  = extractSection(advice, "INVESTMENTS")
  const emergTxt   = extractSection(advice, "EMERGENCY FUND")
  const tipsTxt    = extractSection(advice, "KEY TIPS")
  const warnTxt    = extractSection(advice, "WARNINGS")
  const displayAnnualIncome = annualIncome > 0 ? annualIncome : monthlyIncome * 12

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!hasIncome) return <NoIncomeBanner />

  return (
    <div className="space-y-5">

      {/* ── Income + 50/30/20 bars ── */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-card-foreground">AI Budget Planner</h2>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 text-sm">
              <span className="text-muted-foreground">Based on your monthly income of</span>
              <strong className="text-base font-bold text-foreground">{fmt(monthlyIncome)}/mo</strong>
              <span className="text-xs text-muted-foreground">(annual income: {fmt(displayAnnualIncome)})</span>
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            50 / 30 / 20 Rule
          </span>
        </div>

        {/* Formula row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-secondary px-4 py-3 font-serif text-sm">
          <span className="font-semibold text-chart-1">Needs {fmt(needs)}</span>
          <span className="text-muted-foreground">+</span>
          <span className="font-semibold text-chart-4">Wants {fmt(wants)}</span>
          <span className="text-muted-foreground">+</span>
          <span className="font-semibold text-chart-3">Savings {fmt(savings)}</span>
          <span className="text-muted-foreground">=</span>
          <span className="font-bold text-foreground">{fmt(monthlyIncome)}/mo</span>
        </div>

        {/* Bars */}
        <div className="space-y-4">
          <BudgetBar label="Needs"   amount={needs}   pct={50} color="var(--chart-1)" Icon={ShoppingCart} hint="Rent, bills, food, transport" />
          <BudgetBar label="Wants"   amount={wants}   pct={30} color="var(--chart-4)" Icon={Heart}        hint="Dining, entertainment, subscriptions" />
          <BudgetBar label="Savings" amount={savings} pct={20} color="var(--chart-3)" Icon={PiggyBank}    hint="Investments, emergency fund, goals" />
        </div>

        {/* Generate button */}
        <button
          onClick={callGroq}
          disabled={generating}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition"
        >
          {generating
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating your plan…</>
            : <><Sparkles className="h-4 w-4" /> {advice ? "Regenerate AI Plan" : "Generate My Financial Plan"}</>}
        </button>

        {apiError && (
          <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{apiError}</p>
        )}
      </section>

      {/* ── Generating skeleton ── */}
      {generating && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      )}

      {/* ── AI Plan sections ── */}
      {advice && !generating && (
        <>
          {/* Summary */}
          {summary && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary mb-1">Aeris AI — Financial Summary</p>
                <p className="text-sm text-card-foreground leading-relaxed">{summary}</p>
              </div>
            </div>
          )}

          <section
            aria-label="Monthly budget flow"
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Monthly money flow
                </p>
                <h3 className="mt-1 font-serif text-base font-bold text-card-foreground">
                  Give every dollar a clear role
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">
                How your {fmt(monthlyIncome)} monthly income is allocated
              </span>
            </div>

            <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,0.8fr)_auto_minmax(0,2fr)]">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-medium text-muted-foreground">Monthly income</p>
                <p className="mt-1 font-mono text-xl font-bold text-foreground">{fmt(monthlyIncome)}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-full rounded-full bg-primary" />
                </div>
              </div>

              <ArrowRight
                className="mx-auto h-5 w-5 rotate-90 text-muted-foreground sm:rotate-0"
                aria-hidden="true"
              />

              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { label: "Needs", amount: needs, pct: 50, icon: ShoppingCart, color: "var(--chart-1)" },
                  { label: "Wants", amount: wants, pct: 30, icon: Heart, color: "var(--chart-4)" },
                  { label: "Savings", amount: savings, pct: 20, icon: PiggyBank, color: "var(--chart-3)" },
                ].map(({ label, amount, pct, icon: Icon, color }) => (
                  <div key={label} className="rounded-2xl border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-card-foreground">
                        <Icon className="h-3.5 w-3.5" style={{ color }} />
                        {label}
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground">{pct}%</span>
                    </div>
                    <p className="mt-2 font-mono text-base font-bold text-foreground">{fmt(amount)}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Budget breakdown */}
          <div className="grid gap-4 sm:grid-cols-3">
            {needsTxt && (
              <PlanSection icon={ShoppingCart} iconColor="var(--chart-1)" title={`Needs — ${fmt(needs)}/mo`}>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{needsTxt}</p>
              </PlanSection>
            )}
            {wantsTxt && (
              <PlanSection icon={Heart} iconColor="var(--chart-4)" title={`Wants — ${fmt(wants)}/mo`}>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{wantsTxt}</p>
              </PlanSection>
            )}
            {savingsTxt && (
              <PlanSection icon={PiggyBank} iconColor="var(--chart-3)" title={`Savings — ${fmt(savings)}/mo`}>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{savingsTxt}</p>
              </PlanSection>
            )}
          </div>

          {/* Investments */}
          {investTxt && (
            <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-serif text-sm font-bold text-card-foreground">Investment Recommendations</h3>
              </div>
              <InvestmentRows text={investTxt} />
            </section>
          )}

          {/* Emergency fund + Key tips side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            <PlanSection icon={ShieldCheck} iconColor="var(--chart-3)" title="Emergency Fund">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {emergTxt || "A common starting goal is 3–6 months of essential expenses. Work out the target from your actual monthly essentials, then build it gradually in an accessible, low-risk account. Your right target depends on your circumstances and income stability."}
              </p>
            </PlanSection>
            <PlanSection icon={Lightbulb} iconColor="var(--chart-4)" title="Key Tips">
              {tipsTxt
                ? <NumberedList text={tipsTxt} />
                : <p role="status" className="text-sm leading-relaxed text-muted-foreground">
                    The AI response did not include this section. Regenerate the plan to request personalized tips.
                  </p>}
            </PlanSection>
          </div>

          {/* Warnings */}
          {warnTxt && warnTxt.toLowerCase() !== "none" && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-bold text-foreground">Risk Warnings</h3>
              </div>
              <p className="text-xs text-destructive leading-relaxed whitespace-pre-line">{warnTxt}</p>
            </div>
          )}

          {/* Regenerate bottom */}
          <button
            onClick={callGroq}
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate plan
          </button>
        </>
      )}
    </div>
  )
}
